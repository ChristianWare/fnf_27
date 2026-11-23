"use client";

// Admin → Prospects → Everyone, as a board: a column for each stage, laid
// out like the Leads Pipeline. Drag a card to another column to move them
// (on a phone, press and hold first), or use the menu on the card. Each
// move is saved and goes on their timeline.
//
// "Not now" holds everyone who isn't interested, is parked or asked not to
// be called. It stays folded until you open it, and while you're dragging
// it opens into those three, so you drop a card on the one you mean.

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Icon from "@/components/Dashboard/icons";
import { ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { dayKey, fmtShort, fmtTime, initials } from "@/lib/dashboard/format";
import { PROSPECT_STAGES, STAGE_LABELS, type ProspectStage } from "@/lib/prospects/kinds";
import { setStage } from "@/app/admin/prospects/actions";
import type { ProspectView } from "@/lib/prospects/view";
import styles from "./ProspectBoard.module.css";

type Tone = "yellow" | "gray" | "mint" | "purple" | "lime" | "light";

type Lane = {
  id: string;
  label: string;
  tone: Tone;
  stages: ProspectStage[];
  /** Shown only when someone is in it. */
  optional?: boolean;
};

const NOT_NOW: ProspectStage[] = ["LOST", "PARKED", "DO_NOT_CALL"];

const LANES: Lane[] = [
  { id: "NEW", label: "New", tone: "yellow", stages: ["NEW"] },
  { id: "CALLING", label: "No answer", tone: "gray", stages: ["CALLING"] },
  { id: "INTERESTED", label: "Interested", tone: "mint", stages: ["INTERESTED"] },
  { id: "INVITED", label: "Invited", tone: "purple", stages: ["INVITED"], optional: true },
  { id: "TRIAL", label: "On a trial", tone: "mint", stages: ["TRIAL"], optional: true },
  { id: "PROPOSAL", label: "Proposal sent", tone: "purple", stages: ["PROPOSAL"] },
  { id: "WON", label: "Client", tone: "lime", stages: ["WON"] },
  { id: "NOT_NOW", label: "Not now", tone: "light", stages: NOT_NOW },
];

/** What a column or a "Not now" pad is called, for the toast and screen readers. */
const placeLabel = (stage: ProspectStage) => (stage === "WON" ? "Client" : STAGE_LABELS[stage]);

/** A move that's saving, or saved but not yet back from the server. */
type Move = { stage: ProspectStage; base: ProspectView[]; saving: boolean };

export default function ProspectBoard({
  rows,
  now,
  notNowOpen,
  setNotNowOpen,
  remember,
  openPage,
}: {
  rows: ProspectView[];
  now: string;
  notNowOpen: boolean;
  setNotNowOpen: (open: boolean) => void;
  /** Keep the page's place before leaving it. */
  remember: () => void;
  openPage: (id: string) => void;
}) {
  const { run } = useAction();
  const [moves, setMoves] = useState<Map<string, Move>>(new Map());
  const [dragging, setDragging] = useState<string | null>(null);

  // A card shows where you put it while the move saves. Once the server
  // sends the list back, its own stage takes over.
  const stageOf = (r: ProspectView) => {
    const m = moves.get(r.id);
    return m && (m.saving || m.base === rows) ? m.stage : r.stage;
  };

  const lanes = (() => {
    const byLane = new Map<string, ProspectView[]>(LANES.map((l) => [l.id, []]));
    for (const r of rows) {
      const stage = stageOf(r);
      const lane = LANES.find((l) => l.stages.includes(stage));
      if (lane) byLane.get(lane.id)!.push(r);
    }
    // Soonest call first; nobody scheduled goes last, by name.
    for (const list of byLane.values()) {
      list.sort((a, b) => {
        if (a.nextAt && b.nextAt) return a.nextAt.localeCompare(b.nextAt);
        if (a.nextAt) return -1;
        if (b.nextAt) return 1;
        return a.business.localeCompare(b.business);
      });
    }
    return LANES.filter((l) => !l.optional || byLane.get(l.id)!.length).map((l) => ({
      ...l,
      cards: byLane.get(l.id)!,
    }));
  })();

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const move = (id: string, stage: ProspectStage) => {
    const r = byId.get(id);
    if (!r || stageOf(r) === stage) return;
    const update = (fn: (m: Map<string, Move>) => void) =>
      setMoves((cur) => {
        const next = new Map(cur);
        fn(next);
        return next;
      });
    update((m) => m.set(id, { stage, base: rows, saving: true }));
    run(
      () => setStage(id, stage),
      () => {
        update((m) => {
          const cur = m.get(id);
          if (cur?.stage === stage) m.set(id, { ...cur, saving: false });
        });
        return { message: `Moved ${r.business} to ${placeLabel(stage)}`, tone: "info" };
      },
      // Didn't save: back where it was (the toast says why).
      () =>
        update((m) => {
          if (m.get(id)?.stage === stage) m.delete(id);
        }),
    );
  };

  // A mouse drags after a small nudge, so clicks still open the card. A
  // finger holds for a moment first, so swiping still scrolls.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const nameOf = (id: string | number) => byId.get(String(id))?.business ?? "Prospect";
  const stageAt = (data: unknown) => (data as { stage?: ProspectStage } | undefined)?.stage;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const stage = stageAt(over?.data.current);
      return stage ? `${nameOf(active.id)} is over ${placeLabel(stage)}.` : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const stage = stageAt(over?.data.current);
      return stage ? `${nameOf(active.id)} moved to ${placeLabel(stage)}.` : `${nameOf(active.id)} was put back.`;
    },
    onDragCancel: ({ active }) => `${nameOf(active.id)} was put back.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => setDragging(String(active.id));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const stage = stageAt(over?.data.current);
    if (stage) move(String(active.id), stage);
  };

  const held = dragging ? byId.get(dragging) : null;

  return (
    <DndContext
      id='prospect-board'
      sensors={sensors}
      collisionDetection={pointerWithin}
      // Columns slide by gently near an edge, so you can stop on the one you want.
      autoScroll={{ acceleration: 4, threshold: { x: 0.12, y: 0.15 } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "Use the Move menu on a card to move it with the keyboard.",
        },
      }}
    >
      <div className={`${styles.board} ${dragging ? styles.boardDragging : ""}`}>
        {lanes.map((lane) =>
          lane.id === "NOT_NOW" ? (
            <NotNowLane
              key={lane.id}
              lane={lane}
              cards={lane.cards}
              open={notNowOpen}
              setOpen={setNotNowOpen}
              dragging={Boolean(dragging)}
              renderCard={(r) => (
                <Card key={r.id} r={r} stage={stageOf(r)} now={now} onMove={move} remember={remember} openPage={openPage} />
              )}
            />
          ) : (
            <DropLane key={lane.id} lane={lane} count={lane.cards.length}>
              {lane.cards.length ? (
                <ul className={styles.cards}>
                  {lane.cards.map((r) => (
                    <Card key={r.id} r={r} stage={stageOf(r)} now={now} onMove={move} remember={remember} openPage={openPage} />
                  ))}
                </ul>
              ) : (
                <p className={styles.laneEmpty}>Nothing here.</p>
              )}
            </DropLane>
          ),
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {held ? <CardFace r={held} stage={stageOf(held)} now={now} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function LaneHead({ lane, count, children }: { lane: Lane; count: number; children?: ReactNode }) {
  return (
    <div className={`${styles.laneHead} ${styles[`lane_${lane.tone}`]}`}>
      <span className={styles.laneTitle}>{lane.label}</span>
      <span className={styles.laneEnd}>
        {children}
        <span className={styles.laneCount}>{count}</span>
      </span>
    </div>
  );
}

function DropLane({ lane, count, children }: { lane: Lane; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane:${lane.id}`, data: { stage: lane.stages[0] } });
  return (
    <section ref={setNodeRef} className={`${styles.lane} ${isOver ? styles.laneOver : ""}`} aria-label={lane.label}>
      <LaneHead lane={lane} count={count} />
      {children}
    </section>
  );
}

function NotNowLane({
  lane,
  cards,
  open,
  setOpen,
  dragging,
  renderCard,
}: {
  lane: Lane;
  cards: ProspectView[];
  open: boolean;
  setOpen: (open: boolean) => void;
  dragging: boolean;
  renderCard: (r: ProspectView) => ReactNode;
}) {
  return (
    <section className={`${styles.lane} ${open || dragging ? "" : styles.laneShut}`} aria-label={lane.label}>
      <LaneHead lane={lane} count={cards.length}>
        {cards.length > 0 && !dragging && (
          <button
            type='button'
            className={styles.laneToggle}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide" : "Show"}
          </button>
        )}
      </LaneHead>
      {dragging ? (
        <div className={styles.pads}>
          {NOT_NOW.map((stage) => (
            <Pad key={stage} stage={stage} />
          ))}
        </div>
      ) : !cards.length ? (
        <p className={styles.laneEmpty}>Nobody here.</p>
      ) : open ? (
        <ul className={styles.cards}>{cards.map(renderCard)}</ul>
      ) : (
        <p className={styles.laneEmpty}>
          {cards.length === 1 ? "1 prospect" : `${cards.length} prospects`} not interested, parked or not to call.
        </p>
      )}
    </section>
  );
}

/** While dragging, "Not now" splits into these, so a drop says which. */
function Pad({ stage }: { stage: ProspectStage }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage}`, data: { stage } });
  return (
    <div ref={setNodeRef} className={`${styles.pad} ${isOver ? styles.padOver : ""}`}>
      {STAGE_LABELS[stage]}
    </div>
  );
}

function Card({
  r,
  stage,
  now,
  onMove,
  remember,
  openPage,
}: {
  r: ProspectView;
  stage: ProspectStage;
  now: string;
  onMove: (id: string, stage: ProspectStage) => void;
  remember: () => void;
  openPage: (id: string) => void;
}) {
  // Mouse and touch only: the keyboard uses the Move menu instead.
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: r.id });
  return (
    <li ref={setNodeRef} {...listeners} className={`${styles.cardSlot} ${isDragging ? styles.cardHeld : ""}`}>
      <CardFace r={r} stage={stage} now={now} onMove={onMove} remember={remember} openPage={openPage} />
    </li>
  );
}

/** The menu and the call button work as they are; they don't start a drag. */
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** A card's face: on the board, and the copy that follows your pointer. */
function CardFace({
  r,
  stage,
  now,
  onMove,
  remember,
  openPage,
  lifted,
}: {
  r: ProspectView;
  stage: ProspectStage;
  now: string;
  onMove?: (id: string, stage: ProspectStage) => void;
  remember?: () => void;
  openPage?: (id: string) => void;
  lifted?: boolean;
}) {
  const late = Boolean(r.nextAt && r.nextAt < now);
  const where = [r.city, r.state].filter(Boolean).join(", ");
  const next =
    stage === "WON"
      ? "Client"
      : NOT_NOW.includes(stage)
        ? STAGE_LABELS[stage]
        : r.nextAt
          ? late
            ? `Overdue · ${fmtShort(r.nextAt)}`
            : dayKey(r.nextAt) === dayKey(now)
              ? `Today · ${fmtTime(r.nextAt)}`
              : `${fmtShort(r.nextAt)} · ${fmtTime(r.nextAt)}`
          : stage === "NEW"
            ? "Not called yet"
            : "No call set";
  const canCall = Boolean(r.phone) && stage !== "DO_NOT_CALL";

  return (
    <div className={`${styles.card} ${lifted ? styles.cardLifted : ""}`}>
      <Link href={`/admin/prospects/${r.id}`} className={styles.cardMain} onClick={remember} draggable={false}>
        <span className={styles.tile} aria-hidden='true'>
          {initials(r.business) || "?"}
        </span>
        <span className={styles.itemText}>
          <span className={styles.itemName}>{r.business}</span>
          {where && <span className={styles.itemKind}>{where}</span>}
        </span>
      </Link>
      {r.preview && (
        <span className={`${styles.previewTag} ${styles[`preview_${r.preview.state}`]}`}>
          <Icon name='sparkle' className={styles.previewIcon} />
          {r.preview.state === "opened"
            ? `Preview opened${r.preview.views > 1 ? ` · ${r.preview.views} views` : ""}`
            : r.preview.state === "sent"
              ? "Preview sent"
              : "Preview made, not sent"}
        </span>
      )}
      <div className={styles.cardFoot}>
        <div className={styles.cardWhen}>
          <span className={`${styles.cardNext} ${late && !NOT_NOW.includes(stage) && stage !== "WON" ? styles.cardOverdue : ""}`}>
            {r.nextAt && !late && stage !== "WON" && !NOT_NOW.includes(stage) && (
              <span className={ui.srOnly}>Next call </span>
            )}
            {next}
          </span>
          {canCall && (
            <a
              className={styles.call}
              href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
              aria-label={`Call ${r.business}`}
              onClick={() => openPage?.(r.id)}
              onMouseDown={stop}
              onTouchStart={stop}
              draggable={false}
              tabIndex={lifted ? -1 : undefined}
            >
              <Icon name='phone' />
            </a>
          )}
        </div>
        <label className={styles.moveLabel}>
          <span className={ui.srOnly}>Move {r.business}</span>
          <select
            className={styles.move}
            value={stage}
            onChange={(e) => onMove?.(r.id, e.target.value as ProspectStage)}
            onMouseDown={stop}
            onTouchStart={stop}
            tabIndex={lifted ? -1 : undefined}
          >
            {PROSPECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {placeLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
