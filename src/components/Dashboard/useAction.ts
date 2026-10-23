"use client";

// Runs a server action and says how it went: a toast on success (if the
// caller gives one) or the error the server sent back. The loading bar
// along the top of the screen runs while it works.

import { useTransition } from "react";
import { useToast, type ToastTone } from "./Toast/Toast";
import type { ActionResult } from "@/lib/actions";
import { navProgress } from "@/components/shared/NavProgress/navProgressStore";

let calls = 0;

type Said = { message: string; detail?: string; tone?: ToastTone };

export function useAction() {
  const toast = useToast();
  const [pending, start] = useTransition();

  function run<T>(
    call: () => Promise<ActionResult<T>>,
    after?: (data: T | undefined) => Said | void,
    onError?: (error: string) => void,
  ) {
    const key = `action-${++calls}`;
    navProgress.start(key);
    start(async () => {
      try {
        const result = await call();
        if (!result.ok) {
          toast(result.error, { tone: "error" });
          onError?.(result.error);
          return;
        }
        const said = after?.(result.data);
        if (said) toast(said.message, { tone: said.tone, detail: said.detail });
      } catch {
        toast("That didn't save. Check your connection and try again.", {
          tone: "error",
        });
        onError?.("failed");
      } finally {
        navProgress.done(key);
      }
    });
  }

  return { run, pending };
}
