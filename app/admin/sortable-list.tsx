"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Children, useEffect, useState, useTransition } from "react";
import type { ActionResult } from "./actions";

/**
 * Drag-to-reorder wrapper around server-rendered rows.
 *
 * The rows stay server components — they contain server-action forms and are
 * passed straight through as children. Only the ordering is client-side, so
 * drag support didn't mean rewriting every row.
 *
 * Dragging is confined to the handle. The rows are full of inputs, file
 * pickers and a collapse toggle; a draggable card would mean every attempt to
 * select text in a field started a drag instead.
 */

function GripIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="7.5" cy="5" r="1.4" />
      <circle cx="12.5" cy="5" r="1.4" />
      <circle cx="7.5" cy="10" r="1.4" />
      <circle cx="12.5" cy="10" r="1.4" />
      <circle cx="7.5" cy="15" r="1.4" />
      <circle cx="12.5" cy="15" r="1.4" />
    </svg>
  );
}

function SortableRow({
  id,
  position,
  children,
}: {
  id: string;
  position: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "flex items-start gap-2.5",
        // An expanded row takes the full width of the grid. Without this the
        // card beside it keeps its collapsed height and leaves several hundred
        // pixels of dead space next to whatever you opened.
        "[&:has(details[open])]:col-span-full",
        isDragging ? "z-20 opacity-90" : "",
      ].join(" ")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Position ${position}. Hold and drag to reorder, or use the arrow keys.`}
        className="group/handle mt-2.5 grid h-7 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-xs text-white/45 transition-colors hover:border-gold/50 hover:text-gold focus-visible:border-gold/50 focus-visible:text-gold active:cursor-grabbing"
      >
        {/* The number is the useful thing at rest; the grip appears on hover
            to say it's draggable, without cluttering the list with grips. */}
        <span className="group-hover/handle:hidden">{position}</span>
        <GripIcon className="hidden h-4 w-4 group-hover/handle:block" />
      </button>

      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export default function SortableList({
  ids,
  children,
  action,
  grid = false,
}: {
  /** Row ids in their current saved order. Must match children order. */
  ids: string[];
  children: React.ReactNode;
  action: (ids: string[]) => Promise<ActionResult>;
  grid?: boolean;
}) {
  const [order, setOrder] = useState(ids);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // A save elsewhere on the page re-renders the server component with fresh
  // ids; without this the list would keep showing the order from mount.
  useEffect(() => {
    setOrder(ids);
  }, [ids]);

  const sensors = useSensors(
    // A small distance threshold so a click on the handle still reads as a
    // click rather than starting a zero-length drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rows = Children.toArray(children);
  const rowById = new Map(ids.map((id, i) => [id, rows[i]]));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    const next = arrayMove(order, from, to);
    const previous = order;

    // Move it on screen immediately, then persist. Waiting for the round trip
    // would make every drag feel like it snapped back.
    setOrder(next);
    setError(null);

    startTransition(async () => {
      const result = await action(next);
      if (!result.ok) {
        setOrder(previous);
        setError(result.error);
      }
    });
  }

  return (
    <>
      <p className="mb-3 flex items-center gap-2 text-xs text-white/40">
        <GripIcon className="h-3.5 w-3.5" />
        The number is the position on the site. Drag a handle to reorder.
        {pending && <span className="text-gold">Saving…</span>}
        {error && (
          <span role="alert" className="text-[#ffb4b4]">
            {error}
          </span>
        )}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={order}
          strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
        >
          <ul
            className={
              grid ? "grid grid-cols-1 items-start gap-2.5 xl:grid-cols-2" : "space-y-2"
            }
          >
            {order.map((id, index) => (
              <SortableRow key={id} id={id} position={index + 1}>
                {rowById.get(id)}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
