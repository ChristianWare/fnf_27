"use client";

// Copies the link where a client updates their card. SAMPLE: a made-up
// link; the real one is a Stripe billing portal session for the client.

import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { ui } from "@/components/Dashboard/ui/ui";

export default function CardLink({
  clientId,
  firstName,
}: {
  clientId: string;
  firstName: string;
}) {
  const toast = useToast();
  return (
    <button
      type='button'
      className={`${ui.btn} ${ui.btn_outline} ${ui.btnSmall}`}
      onClick={async () => {
        const link = `https://billing.stripe.com/p/session/sample_${clientId}`;
        try {
          await navigator.clipboard.writeText(link);
          toast("Card-update link copied", {
            detail: `Send it to ${firstName}. It opens Stripe's secure page.`,
          });
        } catch {
          toast("Couldn't copy the link", { tone: "error" });
        }
      }}
    >
      Card link
      <Icon name='copy' className={ui.btnIcon} />
    </button>
  );
}
