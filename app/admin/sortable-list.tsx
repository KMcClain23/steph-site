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
 * The rows themselves stay server components — they contain server-action
 * forms and are passed straight through as children. Only the ordering is
 * client-side, so adding drag support didn't mean rewriting every row as a
 * client component.
 *
 * Dragging is deliberately confined to a handle. The rows are full of inputs,
 * file pickers and a collapse toggle; making the whole card draggable would
 * mean every attempt to select text in a field started a drag instead.
 */

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative pl-8 ${isDragging ? "z-10 opacity-80" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reorder — hold and drag, or use the arrow keys"
        className="absolute left-0 top-0 flex h-full w-8 cursor-grab touch-none items-start justify-center rounded-l-xl pt-4 text-white/25 transition-colors hover:text-gold focus-visible:text-gold active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      {children}
    </li>
  );
}

export default function SortableList({
  ids,
  children,
  action,
  grid = false,
}: {
  /** Row ids, in their current saved order. Must match children order. */
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
      <p className="mb-3 flex items-center gap-2 text-xs text-white/45">
        <GripIcon />
        Drag the handle to reorder. Saves on drop.
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
          <ul className={grid ? "grid gap-3 lg:grid-cols-2" : "space-y-2"}>
            {order.map((id) => (
              <SortableRow key={id} id={id}>
                {rowById.get(id)}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
