import type { Metadata } from "next";
import AuthFrame from "@/components/LoginPage/Login/Login";
import { ResendForm } from "@/components/LoginPage/Login/AccountForms";
import Photo from "../../../../public/images/cadi_drive.png";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const { email } = await searchParams;
  const address = typeof email === "string" ? email : "";

  return (
    <AuthFrame
      eyebrow='Almost there'
      title='Check your email'
      intro={
        <>
          We sent a link to <strong>{address || "your email"}</strong>. Click it
          to confirm your email, then sign in. It works for 48 hours.
        </>
      }
      photo={Photo}
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
      {address && <ResendForm email={address} />}
    </AuthFrame>
  );
}
