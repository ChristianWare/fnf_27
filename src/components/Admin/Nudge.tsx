"use client";

// A small button that sends a client a friendly reminder. SAMPLE: shows
// the toast; the real one emails the client.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { ui } from "@/components/Dashboard/ui/ui";

export default function Nudge({
  name,
  email,
  what,
  label = "Nudge",
}: {
  name: string;
  email: string;
  what: string;
  label?: string;
}) {
  const toast = useToast();
  const [sent, setSent] = useState(false);

  return (
    <button
      type='button'
      className={`${ui.btn} ${sent ? ui.btn_light : ui.btn_outline} ${ui.btnSmall}`}
      disabled={sent}
      onClick={() => {
        setSent(true);
        toast(`Reminder sent to ${name.split(" ")[0]}`, {
          detail: `${email}: ${what}`,
        });
      }}
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
