"use client";

// Design cards you can put in order, on the client's Files tab. Grab a
// card by its dotted handle and drag it to a new spot; with the keyboard,
// focus the handle, press Space, move with the arrow keys and press Space
// again. The order here is the order the client sees.

import type { CSSProperties, ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** What to spread on the handle button that picks a card up. */
export type HandleProps = Record<string, unknown> & {
  ref: (el: HTMLElement | null) => void;
};

export function SortableDesigns({
  id,
  ids,
  nameOf,
  onMove,
  className,
  children,
}: {
  /** Tells two lists on one page apart. */
  id: string;
  ids: string[];
  nameOf: (id: string) => string;
  /** A card moved from one place in the list to another. */
  onMove: (from: number, to: number) => void;
  className?: string;
  children: ReactNode;
}) {
  const sensors = useSensors(
    // A small nudge before it lifts, so a click on the handle does nothing.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const place = (overId: string | number) =>
    `${ids.indexOf(String(overId)) + 1} of ${ids.length}`;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onMove(from, to);
  };

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "To move this design, press Space, use the arrow keys to move it, then press Space again to drop it, or Escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${nameOf(String(active.id))}. It's at ${place(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${nameOf(String(active.id))} moved to ${place(over.id)}.`
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${nameOf(String(active.id))} dropped at ${place(over.id)}.`
              : `${nameOf(String(active.id))} put back.`,
          onDragCancel: ({ active }) =>
            `${nameOf(String(active.id))} put back where it was.`,
        },
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul className={className}>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

export function SortableDesign({
  id,
  className,
  liftedClassName,
  disabled,
  children,
}: {
  id: string;
  className?: string;
  /** Added while this card is being carried. */
  liftedClassName?: string;
  disabled?: boolean;
  children: (handle: HandleProps) => ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${className ?? ""} ${isDragging ? (liftedClassName ?? "") : ""}`}
    >
      {children({
        ref: setActivatorNodeRef,
        ...attributes,
        ...listeners,
      })}
    </li>
  );
}
