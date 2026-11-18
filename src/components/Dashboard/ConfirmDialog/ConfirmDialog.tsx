"use client";

// "Are you sure?" in the site's own dialog, instead of the browser's.
// Same look as the Team page's confirm: an icon, a question, a line on what
// happens, and the two choices. Danger (deleting) turns the icon and the
// button red. It stays open while the action runs, then the caller closes it.
//
//   <ConfirmDialog
//     open={asking}
//     tone='danger'
//     icon='trash'
//     title='Delete 3 prospects?'
//     text='Their timelines go too.'
//     items={["Desert Star Limousine", "…"]}
//     confirmLabel='Delete 3 prospects'
//     pending={pending}
//     onConfirm={remove}
//     onClose={() => setAsking(false)}
//   />

import type { ReactNode } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon, { type IconName } from "@/components/Dashboard/icons";
import { ui } from "@/components/Dashboard/ui/ui";
import styles from "./ConfirmDialog.module.css";

/** How many names to list before "and 12 more". */
const SHOW = 5;

export default function ConfirmDialog({
  open,
  title,
  text,
  items,
  icon = "info",
  tone = "default",
  confirmLabel,
  cancelLabel = "Cancel",
  pendingLabel = "Working…",
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text?: ReactNode;
  /** What it applies to, e.g. the prospects being deleted. */
  items?: string[];
  icon?: IconName;
  tone?: "default" | "danger";
  confirmLabel: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const danger = tone === "danger";
  const list = items ?? [];
  const more = list.length - SHOW;

  return (
    <Modal
      isOpen={open}
      onClose={() => !pending && onClose()}
      size='fit'
      label={title}
    >
      <div className={`${ui.modalBody} ${styles.body}`}>
        <span className={`${styles.icon} ${danger ? styles.iconDanger : ""}`}>
          <Icon name={icon} />
        </span>
        <h2 className={ui.modalTitle}>{title}</h2>
        {text && <p className={styles.text}>{text}</p>}
        {list.length > 0 && (
          <ul className={styles.items}>
            {list.slice(0, SHOW).map((name, i) => (
              <li key={`${name}-${i}`}>{name}</li>
            ))}
            {more > 0 && <li className={styles.more}>and {more} more</li>}
          </ul>
        )}
        <div className={ui.modalActions}>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_light}`}
            onClick={onClose}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            type='button'
            className={`${ui.btn} ${danger ? styles.confirmDanger : ui.btn_black}`}
            onClick={onConfirm}
            disabled={pending}
            autoFocus
          >
            {danger && !pending && <Icon name='trash' className={ui.btnIcon} />}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
