"use client";

// Toasts: a short confirmation in the bottom-right corner whenever
// something is saved, sent or signed. Any client component in the
// dashboard can call `const toast = useToast()` and then
// `toast("Answers saved")`, or `toast("Plan cancelled", { tone: "info",
// detail: "It ends on Nov 12." })`.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Icon, { type IconName } from "../icons";
import styles from "./Toast.module.css";

export type ToastTone = "success" | "info" | "error";

type ToastOptions = { tone?: ToastTone; detail?: string };

type ToastItem = ToastOptions & {
  id: number;
  message: string;
  leaving?: boolean;
};

type Show = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<Show>(() => {});

const icons: Record<ToastTone, IconName> = {
  success: "check",
  info: "info",
  error: "close",
};

// How long a toast stays, in ms. Errors stay longer.
const STAY = 4200;
const STAY_ERROR = 7000;
const LEAVE = 220;

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    setItems((list) =>
      list.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
    );
    window.setTimeout(
      () => setItems((list) => list.filter((item) => item.id !== id)),
      LEAVE,
    );
  }, []);

  const show = useCallback<Show>(
    (message, options = {}) => {
      const id = nextId++;
      setItems((list) => [...list.slice(-3), { id, message, ...options }]);
      const stay = options.tone === "error" ? STAY_ERROR : STAY;
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          remove(id);
        }, stay),
      );
    },
    [remove],
  );

  // Hovering a toast holds it; leaving starts the clock again.
  const hold = (id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  };
  const release = (id: number) => {
    if (timers.current.has(id)) return;
    timers.current.set(
      id,
      window.setTimeout(() => {
        timers.current.delete(id);
        remove(id);
      }, 1600),
    );
  };

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.stack} aria-live='polite' role='status'>
        {items.map((item) => {
          const tone = item.tone ?? "success";
          return (
            <div
              key={item.id}
              className={`${styles.toast} ${styles[tone]} ${item.leaving ? styles.leaving : ""}`}
              onMouseEnter={() => hold(item.id)}
              onMouseLeave={() => release(item.id)}
            >
              <span className={styles.icon}>
                <Icon name={icons[tone]} />
              </span>
              <span className={styles.text}>
                <span className={styles.message}>{item.message}</span>
                {item.detail && <p className={styles.detail}>{item.detail}</p>}
              </span>
              <button
                type='button'
                className={styles.close}
                onClick={() => {
                  hold(item.id);
                  remove(item.id);
                }}
                aria-label='Dismiss'
              >
                <Icon name='close' />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
