"use client";

// The checkout: their details and the card on the left, the order on the
// right with the button that pays. Stripe's Payment Element draws the card
// fields inside our page, styled to match, so card details go straight to
// Stripe. Apple Pay and Google Pay show up where the browser has them.

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import Icon from "../icons";
import { ui } from "../ui/ui";
import { beginCheckout, completeCheckout } from "@/app/dashboard/checkout/actions";
import styles from "./Checkout.module.css";

export type OrderSummary = {
  eyebrow: string;
  title: string;
  text: string;
  /** `was`: a crossed-out price beside the value (a waived fee). */
  lines: { label: string; value: string; was?: string }[];
  totalLabel: string;
  total: string;
  button: string;
  /** What happens next, under the button. */
  fine: string;
};

type Who = { name: string; business: string; email: string };
type Purpose = "setup" | "card" | "leads";

// Stripe's fields in our colors and type.
const appearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#0d0d0e",
    colorBackground: "#f1f2f4",
    colorText: "#0d0d0e",
    colorTextSecondary: "#6d7885",
    colorTextPlaceholder: "#82888f",
    colorDanger: "#a2301c",
    fontFamily: "Creato, system-ui, -apple-system, Segoe UI, sans-serif",
    fontSizeBase: "16px",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid transparent",
      padding: "14px 16px",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid #0d0d0e",
      backgroundColor: "#ffffff",
      boxShadow: "none",
    },
    ".Label": {
      fontFamily: "IBM Plex Mono, ui-monospace, monospace",
      fontSize: "13px",
      textTransform: "uppercase",
      color: "#0d0d0e",
      marginBottom: "8px",
    },
    ".Tab": { border: "1px solid transparent", boxShadow: "none" },
    ".Tab--selected": { border: "1px solid #0d0d0e", boxShadow: "none" },
  },
};

export default function Checkout({
  purpose,
  publishableKey,
  order,
  who,
  hosted,
}: {
  purpose: Purpose;
  /** Empty: payments can't be taken here (not set up, or viewing as). */
  publishableKey: string;
  order: OrderSummary;
  who: Who;
  /** Stripe's own page, if this one won't load. */
  hosted: string;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );
  const [secret, setSecret] = useState<{
    kind: "payment" | "setup";
    clientSecret: string;
  } | null>(null);
  const [problem, setProblem] = useState("");
  const [origin, setOrigin] = useState("");

  // The payment form, made fresh for this visit.
  useEffect(() => {
    if (!publishableKey) return;
    let live = true;
    beginCheckout(purpose).then((result) => {
      if (!live) return;
      // Where the page's fonts are, for Stripe's fields.
      setOrigin(window.location.origin);
      if (result.ok && result.data) setSecret(result.data);
      else if (!result.ok) setProblem(result.error);
    });
    return () => {
      live = false;
    };
  }, [publishableKey, purpose]);

  const fonts = origin
    ? [
        {
          family: "Creato",
          src: `url(${origin}/fonts/CreatoDisplay-Medium.otf)`,
          weight: "500",
        },
      ]
    : [];

  const summary = (button: ReactNode) => (
    <aside className={styles.order}>
      <div className={styles.orderHead}>
        <span className={ui.monoMuted}>{order.eyebrow}</span>
        <h2 className={styles.orderTitle}>{order.title}</h2>
        <p className={styles.small}>{order.text}</p>
      </div>
      <dl className={styles.lines}>
        {order.lines.map((line) => (
          <div key={line.label} className={styles.line}>
            <dt>{line.label}</dt>
            <dd>
              {line.was && <s className={styles.was}>{line.was}</s>}
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className={styles.total}>
        <span>{order.totalLabel}</span>
        <span className={styles.totalValue}>{order.total}</span>
      </div>
      {button}
      <p className={styles.fine}>{order.fine}</p>
      <p className={styles.secure}>
        <Icon name='lock' />
        Secured by Stripe. Card details never reach our servers.
      </p>
    </aside>
  );

  const details = (
    <div className={styles.block}>
      <div className={styles.blockHead}>
        <h2 className={styles.blockTitle}>Your details</h2>
        <Link href='/dashboard/profile' className={styles.edit}>
          Edit in Profile
        </Link>
      </div>
      <dl className={styles.who}>
        <div className={styles.whoItem}>
          <dt className={ui.monoMuted}>Name</dt>
          <dd>{who.name}</dd>
        </div>
        <div className={styles.whoItem}>
          <dt className={ui.monoMuted}>Business</dt>
          <dd>{who.business}</dd>
        </div>
        <div className={`${styles.whoItem} ${styles.whoWide}`}>
          <dt className={ui.monoMuted}>Receipts go to</dt>
          <dd>{who.email}</dd>
        </div>
      </dl>
    </div>
  );

  // Can't take payments here: the order, and a way through.
  if (!publishableKey || problem) {
    return (
      <div className={styles.layout}>
        <div className={styles.main}>
          {details}
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>Payment</h2>
            <p className={styles.small}>
              {problem ||
                "The card form isn't available here right now. You can finish on Stripe's secure page instead."}
            </p>
          </div>
        </div>
        {summary(
          publishableKey || problem ? (
            <a href={hosted} className={`${ui.btn} ${ui.btn_black} ${styles.pay}`}>
              Continue on Stripe&apos;s page
              <Icon name='arrowUpRight' className={ui.btnIcon} />
            </a>
          ) : (
            <Link
              href='/dashboard/billing'
              className={`${ui.btn} ${ui.btn_light} ${styles.pay}`}
            >
              Back to Billing
            </Link>
          ),
        )}
      </div>
    );
  }

  if (!secret || !stripePromise) {
    return (
      <div className={styles.layout}>
        <div className={styles.main}>
          {details}
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>Payment</h2>
            <div className={styles.loading} aria-busy='true'>
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
        {summary(
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_black} ${styles.pay}`}
            disabled
          >
            {order.button}
          </button>,
        )}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: secret.clientSecret,
        appearance,
        fonts,
        loader: "auto",
      }}
    >
      <PayForm
        kind={secret.kind}
        purpose={purpose}
        order={order}
        details={details}
        summary={summary}
        who={who}
      />
    </Elements>
  );
}

function PayForm({
  kind,
  purpose,
  order,
  details,
  summary,
  who,
}: {
  kind: "payment" | "setup";
  purpose: Purpose;
  order: OrderSummary;
  details: ReactNode;
  summary: (button: ReactNode) => ReactNode;
  who: Who;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError("");
    const return_url = `${window.location.origin}/dashboard/checkout/return?for=${purpose}`;
    const confirmParams = {
      return_url,
      payment_method_data: {
        billing_details: { name: who.name, email: who.email },
      },
    };
    const result =
      kind === "payment"
        ? await stripe.confirmPayment({
            elements,
            confirmParams,
            redirect: "if_required",
          })
        : await stripe.confirmSetup({
            elements,
            confirmParams,
            redirect: "if_required",
          });

    if (result.error) {
      setError(
        result.error.message ?? "That didn't go through. Check the card and try again.",
      );
      setBusy(false);
      return;
    }
    const intentId =
      "paymentIntent" in result
        ? result.paymentIntent?.id
        : "setupIntent" in result
          ? result.setupIntent?.id
          : undefined;
    if (!intentId) {
      setBusy(false);
      return;
    }
    const finished = await completeCheckout(intentId);
    if (!finished.ok) {
      setError(finished.error);
      setBusy(false);
      return;
    }
    const done = finished.data?.done;
    router.push(
      done
        ? `/dashboard/billing?done=${done}${done === "leads" ? "#leads" : ""}`
        : "/dashboard/billing?done=pending",
    );
    router.refresh();
  };

  return (
    <form className={styles.layout} onSubmit={submit}>
      <div className={styles.main}>
        {details}
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>Payment</h2>
          <PaymentElement
            onReady={() => setReady(true)}
            options={{
              layout: "tabs",
              // Their name and email are already on the account.
              fields: { billingDetails: { name: "never", email: "never" } },
            }}
          />
          {error && (
            <p className={styles.error} role='alert'>
              {error}
            </p>
          )}
        </div>
      </div>
      {summary(
        <button
          type='submit'
          className={`${ui.btn} ${ui.btn_black} ${styles.pay}`}
          disabled={!stripe || !ready || busy}
        >
          {busy ? "Working on it…" : order.button}
          {!busy && <Icon name='lock' className={ui.btnIcon} />}
        </button>,
      )}
    </form>
  );
}
