import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthFrame from "@/components/LoginPage/Login/Login";
import RegisterForm, {
  type PlanCard,
} from "@/components/LoginPage/Login/RegisterForm";
import { getSessionUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/users";
import { money } from "@/lib/dashboard/format";
import { LEADS, PLANS } from "@/lib/dashboard/plans";
import Photo from "../../../public/images/cadi_drive.png";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Sign up for Fonts & Footers: a website built to rank, booking software with no per-booking fees, and the Leads Tool.",
  robots: { index: false, follow: false },
};

const plans: PlanCard[] = [
  {
    id: "FULL_PLATFORM",
    name: PLANS.FULL_PLATFORM.name,
    price: `${money(PLANS.FULL_PLATFORM.monthly)}/mo`,
    note: `${money(PLANS.FULL_PLATFORM.setup)} setup`,
    blurb: "Your website, booking and dispatch, and the Leads Tool.",
  },
  {
    id: "WEBSITE_ONLY",
    name: PLANS.WEBSITE_ONLY.name,
    price: `${money(PLANS.WEBSITE_ONLY.monthly)}/mo`,
    note: `${money(PLANS.WEBSITE_ONLY.setup)} setup`,
    blurb: "A custom website built to rank, with your booking link.",
  },
  {
    id: "LEADS",
    name: LEADS.name,
    price: `${LEADS.trialDays} days free`,
    note: `Then ${money(LEADS.monthly)}/mo`,
    blurb: "Companies near you that book rides, every morning.",
  },
];

const PICK: Record<string, PlanCard["id"]> = {
  full: "FULL_PLATFORM",
  platform: "FULL_PLATFORM",
  website: "WEBSITE_ONLY",
  leads: "LEADS",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  const { plan } = await searchParams;

  return (
    <AuthFrame
      eyebrow='Create your account'
      title='Get started'
      intro='Tell us about your business. It takes two minutes.'
      photo={Photo}
      wide
      note={{
        mono: "What happens next",
        title: "From sign-up to your own dashboard, the same day.",
        numbered: true,
        items: [
          "Confirm your email with the link we send",
          "Website plans: we confirm your plan within one business day",
          "Leads Tool: your free trial starts straight away",
        ],
      }}
    >
      <RegisterForm
        plans={plans}
        initialPlan={typeof plan === "string" ? PICK[plan] : undefined}
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </AuthFrame>
  );
}
