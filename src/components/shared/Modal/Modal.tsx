/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLenis } from "lenis/react";
import { useId, useLayoutEffect, useRef, MouseEvent } from "react";
import styles from "./Modal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * "dark": the whole screen goes dark and the content sits on it with no
   * card around it, for photos. The close button moves to the corner.
   */
  variant?: "light" | "dark";
  /** "fit": as wide as what's in it (a calendar, say), not 900px. */
  size?: "default" | "fit";
  /** What a screen reader calls the dialog. */
  label?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  variant = "light",
  size = "default",
  label,
}: Props) {
  const scrollRef = useRef(0);
  const htmlPrev = useRef<string>("");
  const removeTouchBlockRef = useRef<() => void>(() => {});
  const lenis = useLenis();
  // Each dialog its own id, so two on one page don't trip over each other.
  const dialogId = `app-modal-dialog-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useLayoutEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const root = document.scrollingElement || document.documentElement;

    scrollRef.current = root.scrollTop;
    htmlPrev.current = html.getAttribute("style") ?? "";

    // Reset modal scroll to top on every open so tall content
    // doesn't reopen at the previously-scrolled position
    const modalEl = document.getElementById(dialogId);
    if (modalEl) modalEl.scrollTop = 0;

    html.style.overflow = "hidden";
    (html.style as any).scrollbarGutter = "stable";

    // Hold the page still while the modal is open.
    lenis?.stop();

    const blockTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const dialog = document.getElementById(dialogId);
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
      lenis?.start();
    };
  }, [isOpen, onClose, lenis, dialogId]);

  const stop = (e: MouseEvent) => e.stopPropagation();
  const dark = variant === "dark" ? styles.dark : "";
  const fit = size === "fit" ? styles.fit : "";

  return (
    <div
      className={`${styles.backdrop} ${dark} ${isOpen ? styles.open : styles.closed}`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        id={dialogId}
        className={`${styles.dialog} ${dark} ${fit} ${isOpen ? styles.open : styles.closed}`}
        onClick={stop}
        role='dialog'
        aria-modal='true'
        aria-label={label}
        data-lenis-prevent
      >
        <button
          type='button'
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
