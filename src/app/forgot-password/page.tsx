import type { Metadata } from "next";
import AuthFrame, { DASHBOARD_NOTE } from "@/components/LoginPage/Login/Login";
import { ForgotForm } from "@/components/LoginPage/Login/AccountForms";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      eyebrow='Password'
      title='Reset your password'
      intro="Enter the email you sign in with and we'll send you a link to choose a new password."
      note={DASHBOARD_NOTE}
    >
      <ForgotForm />
    </AuthFrame>
  );
}
