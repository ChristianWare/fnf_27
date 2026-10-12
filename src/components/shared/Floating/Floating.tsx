"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import styles from "./Floating.module.css";

interface FloatingItem {
  element: HTMLDivElement;
  depth: number;
  x: number;
  y: number;
}

interface FloatingContextType {
  registerElement: (id: string, element: HTMLDivElement, depth: number) => void;
  unregisterElement: (id: string) => void;
}

const FloatingContext = createContext<FloatingContextType | null>(null);

interface FloatingProps {
  children: ReactNode;
  className?: string;
  /** Overall intensity. Negative values move elements away from the cursor. */
  sensitivity?: number;
  /** 0-1. Lower = smoother and slower, higher = snappier. */
  easingFactor?: number;
}

export default function Floating({
  children,
  className = "",
  sensitivity = 1,
  easingFactor = 0.05,
}: FloatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, FloatingItem>());
  // Cursor offset from the centre of the container, in px. (0, 0) = at rest.
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);

  const registerElement = useCallback(
    (id: string, element: HTMLDivElement, depth: number) => {
      elements.current.set(id, { element, depth, x: 0, y: 0 });
    },
    [],
  );

  const unregisterElement = useCallback((id: string) => {
    elements.current.delete(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tick = () => {
      let moving = false;

      elements.current.forEach((item) => {
        const strength = (item.depth * sensitivity) / 20;
        const dx = pointer.current.x * strength - item.x;
        const dy = pointer.current.y * strength - item.y;

        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
          // Close enough: snap to the target and let the loop go idle
          item.x += dx;
          item.y += dy;
        } else {
          item.x += dx * easingFactor;
          item.y += dy * easingFactor;
          moving = true;
        }

        item.element.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
      });

      frame.current = moving ? requestAnimationFrame(tick) : null;
    };

    const start = () => {
      if (frame.current === null) frame.current = requestAnimationFrame(tick);
    };

    const handleMove = (event: PointerEvent) => {
      // Mouse only, so touch scrolling on phones doesn't shake the layers
      if (event.pointerType !== "mouse") return;
      const rect = container.getBoundingClientRect();
      pointer.current = {
        x: event.clientX - (rect.left + rect.width / 2),
        y: event.clientY - (rect.top + rect.height / 2),
      };
      start();
    };

    const handleLeave = () => {
      // Ease everything back to its resting position
      pointer.current = { x: 0, y: 0 };
      start();
    };

    container.addEventListener("pointermove", handleMove);
    container.addEventListener("pointerleave", handleLeave);

    return () => {
      container.removeEventListener("pointermove", handleMove);
      container.removeEventListener("pointerleave", handleLeave);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [sensitivity, easingFactor]);

  const contextValue = useMemo(
    () => ({ registerElement, unregisterElement }),
    [registerElement, unregisterElement],
  );

  return (
    <FloatingContext.Provider value={contextValue}>
      <div ref={containerRef} className={`${styles.container} ${className}`}>
        {children}
      </div>
    </FloatingContext.Provider>
  );
}

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  /** How far this layer moves. Higher = farther. Negative = opposite direction. */
  depth?: number;
}

export function FloatingElement({
  children,
  className = "",
  depth = 1,
}: FloatingElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const context = useContext(FloatingContext);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !context) return;

    context.registerElement(id, element, depth);
    return () => context.unregisterElement(id);
  }, [context, id, depth]);

  return (
    <div ref={elementRef} className={`${styles.element} ${className}`}>
      {children}
    </div>
  );
}
