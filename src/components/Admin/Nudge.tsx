"use client";

// A small button that emails a client a friendly reminder of what's
// waiting on them.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import { nudgeClient } from "@/app/admin/actions";

export default function Nudge({
  clientId,
  name,
  email,
  what,
  label = "Nudge",
}: {
  clientId: string;
  name: string;
  email: string;
  what: string;
  label?: string;
}) {
  const { run, pending } = useAction();
  const [sent, setSent] = useState(false);

  return (
    <button
      type='button'
      className={`${ui.btn} ${sent ? ui.btn_light : ui.btn_outline} ${ui.btnSmall}`}
      disabled={sent || pending}
      onClick={() =>
        run(
          () => nudgeClient(clientId),
          () => {
            setSent(true);
            return {
              message: `Reminder sent to ${name.split(" ")[0]}`,
              detail: `${email}: ${what}`,
            };
          },
        )
      }
    >
      {sent ? (
        <>
          Sent
          <Icon name='check' className={ui.btnIcon} />
        </>
      ) : (
        label
      )}
    </button>
  );
}
