"use client";

// A short "done, here's what's next" card between build steps: after the
// agreement is signed (off to Billing), and after billing is set up (off
// to Project status). Continue goes there; closing it stays put.

import { useRouter } from "next/navigation";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { ui } from "../ui/ui";
import styles from "./NextStep.module.css";

export type NextStepInfo = {
  /** What just got done, e.g. "Agreement signed". */
  done: string;
  title: string;
  text: string;
  label: string;
  href: string;
};

export default function NextStep({
  step,
  open,
  onClose,
}: {
  step: NextStepInfo;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <Modal isOpen={open} onClose={onClose} label={step.title}>
      <div className={ui.modalBody}>
        <span className={styles.done}>
          <span className={styles.check}>
            <Icon name='check' />
          </span>
          {step.done}
        </span>
        <h2 className={ui.modalTitle}>{step.title}</h2>
        <p className={styles.text}>{step.text}</p>
        <div className={ui.modalActions}>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_light}`}
            onClick={onClose}
          >
            Not now
          </button>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_black}`}
            onClick={() => {
              onClose();
              router.push(step.href);
            }}
          >
            {step.label}
            <Icon name='arrow' className={ui.btnIcon} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
