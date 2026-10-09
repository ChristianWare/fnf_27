"use client";

// Emails a client the link where they add or replace their card. It opens
// their dashboard (after signing in), then Stripe's secure page.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import { sendCardLink } from "@/app/admin/billing-actions";

export default function CardLink({
  clientId,
  firstName,
}: {
  clientId: string;
  firstName: string;
}) {
  const { run, pending } = useAction();
  const [sent, setSent] = useState(false);
  return (
    <button
      type='button'
      className={`${ui.btn} ${sent ? ui.btn_light : ui.btn_outline} ${ui.btnSmall}`}
      disabled={pending || sent}
      onClick={() =>
        run(
          () => sendCardLink(clientId),
          () => {
            setSent(true);
            return {
              message: `Card link sent to ${firstName}`,
              detail: "It opens Stripe's secure page to update their card.",
            };
          },
        )
      }
    >
      {sent ? "Sent" : "Send card link"}
      <Icon name={sent ? "check" : "send"} className={ui.btnIcon} />
    </button>
  );
}
