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
  draggable,
  children,
}: {
  id: string;
  position: number;
  draggable: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !draggable });

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
      {draggable ? (
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
      ) : (
        // Filtered: still show the position, but not as something you can grab.
        <span
          aria-hidden="true"
          className="mt-2.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[0.06] font-mono text-xs text-white/25"
        >
          {position}
        </span>
      )}

      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export default function SortableList({
  ids,
  children,
  action,
  grid = false,
  search,
  flag,
  noun = "rows",
}: {
  /** Row ids in their current saved order. Must match children order. */
  ids: string[];
  children: React.ReactNode;
  action: (ids: string[]) => Promise<ActionResult>;
  grid?: boolean;
  /** id → text to match a search box against. Omit for no search. */
  search?: Record<string, string>;
  /** An optional one-click filter, e.g. titles with no description yet. */
  flag?: { label: string; ids: string[] };
  noun?: string;
}) {
  const [order, setOrder] = useState(ids);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [flagOnly, setFlagOnly] = useState(false);
  const [compact, setCompact] = useState(false);

  // Remembered per list, since the right density for 24 titles is not the
  // right density for 15 demos.
  const densityKey = `admin-density-${noun}`;
  useEffect(() => {
    setCompact(localStorage.getItem(densityKey) === "compact");
  }, [densityKey]);

  const setDensity = (next: boolean) => {
    setCompact(next);
    localStorage.setItem(densityKey, next ? "compact" : "comfortable");
  };

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

  const needle = query.trim().toLowerCase();
  const flagged = new Set(flag?.ids ?? []);
  const visible = order.filter((id) => {
    if (flagOnly && !flagged.has(id)) return false;
    if (!needle) return true;
    return (search?.[id] ?? "").toLowerCase().includes(needle);
  });

  /**
   * Reordering is only meaningful over the whole list.
   *
   * Dragging within a filtered subset would renumber positions from that
   * subset and quietly reshuffle everything hidden — so filtering turns
   * dragging off rather than doing something surprising.
   */
  const filtering = flagOnly || needle.length > 0;

  return (
    <>
      {(search || flag) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {search && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${noun}…`}
              aria-label={`Search ${noun}`}
              className="w-full max-w-xs rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white placeholder:text-white/35 sm:w-auto"
            />
          )}
          {flag && flag.ids.length > 0 && (
            <button
              type="button"
              onClick={() => setFlagOnly((v) => !v)}
              aria-pressed={flagOnly}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                flagOnly
                  ? "border-gold bg-gold/20 text-gold"
                  : "border-white/15 bg-white/[0.04] text-white/60 hover:border-gold/40 hover:text-gold",
              ].join(" ")}
            >
              {flag.label} ({flag.ids.length})
            </button>
          )}
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFlagOnly(false);
              }}
              className="text-xs text-white/45 underline-offset-4 hover:text-gold hover:underline"
            >
              Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-white/40">
              {visible.length} of {order.length}
            </span>
            <div className="flex rounded-lg border border-white/12 p-0.5" role="group" aria-label="Row density">
              {([[false, "Comfortable"], [true, "Compact"]] as const).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDensity(value)}
                  aria-pressed={compact === value}
                  className={[
                    "rounded-md px-2.5 py-1 text-[0.68rem] font-semibold transition-colors",
                    compact === value
                      ? "bg-gold/15 text-gold"
                      : "text-white/40 hover:text-white/70",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="mb-3 flex items-center gap-2 text-xs text-white/40">
        <GripIcon className="h-3.5 w-3.5" />
        {filtering
          ? "Clear the filter to reorder — dragging a filtered list would move the rows you can't see."
          : "The number is the position on the site. Drag a handle to reorder."}
        {pending && <span className="text-gold">Saving…</span>}
        {error && (
          <span role="alert" className="text-[#ffb4b4]">
            {error}
          </span>
        )}
      </p>

      {visible.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
          Nothing matches.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={visible}
          strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
        >
          <ul
            // Custom properties rather than classes: the rows are server
            // components passed in as children, and inherited CSS variables
            // reach them without turning any of them into client code.
            style={
              {
                "--row-py": compact ? "0.375rem" : "0.7rem",
                "--row-media": compact ? "2rem" : "3.25rem",
                "--row-gap": compact ? "0.5rem" : "0.625rem",
              } as React.CSSProperties
            }
            className={
              grid
                ? "grid grid-cols-1 items-start gap-[var(--row-gap)] xl:grid-cols-2"
                : "space-y-[var(--row-gap)]"
            }
          >
            {visible.map((id) => (
              <SortableRow
                key={id}
                id={id}
                // The real position in the full list, not the position within
                // the filtered view — otherwise a search would renumber
                // everything and the numbers would stop meaning anything.
                position={order.indexOf(id) + 1}
                draggable={!filtering}
              >
                {rowById.get(id)}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
