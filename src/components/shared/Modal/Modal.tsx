/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLayoutEffect, useRef, MouseEvent } from "react";
import styles from "./Modal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: Props) {
  const scrollRef = useRef(0);
  const htmlPrev = useRef<string>("");
  const removeTouchBlockRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const root = document.scrollingElement || document.documentElement;

    scrollRef.current = root.scrollTop;
    htmlPrev.current = html.getAttribute("style") ?? "";

    // Reset modal scroll to top on every open so tall content
    // doesn't reopen at the previously-scrolled position
    const modalEl = document.getElementById("app-modal-dialog");
    if (modalEl) modalEl.scrollTop = 0;

    html.style.overflow = "hidden";
    (html.style as any).scrollbarGutter = "stable";

    const blockTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const dialog = document.getElementById("app-modal-dialog");
      if (dialog && target && dialog.contains(target)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", blockTouch, { passive: false });
    removeTouchBlockRef.current = () => {
      document.removeEventListener("touchmove", blockTouch as any);
    };

    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("keydown", onEsc);
      removeTouchBlockRef.current?.();
      html.setAttribute("style", htmlPrev.current);
      root.scrollTo({ top: scrollRef.current });
    };
  }, [isOpen, onClose]);

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      className={`${styles.backdrop} ${isOpen ? styles.open : styles.closed}`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        id='app-modal-dialog'
        className={`${styles.dialog} ${isOpen ? styles.open : styles.closed}`}
        onClick={stop}
        role='dialog'
        aria-modal='true'
      >
        <button
          onClick={onClose}
          className={styles.closeBtn}
          aria-label='Close modal'
        >
          ×
        </button>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
