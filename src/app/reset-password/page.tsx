import type { Metadata } from "next";
import Link from "next/link";
import AuthFrame, { DASHBOARD_NOTE } from "@/components/LoginPage/Login/Login";
import { PasswordForm } from "@/components/LoginPage/Login/AccountForms";
import styles from "@/components/LoginPage/Login/Login.module.css";
import { peekToken } from "@/lib/auth/accounts";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const valid = await peekToken(value, ["RESET", "INVITE"]);

  return (
    <AuthFrame
      eyebrow='Password'
      title={valid ? "Choose a new password" : "This link has expired"}
      intro={
        valid
          ? "Pick something you haven't used here before. You'll be signed in straight after, and signed out everywhere else."
          : "Links to set a password work once, for a limited time. Ask for a new one and it'll be in your inbox in a minute."
      }
      note={DASHBOARD_NOTE}
    >
      {valid ? (
        <PasswordForm token={value} kind='reset' />
      ) : (
        <div className={styles.form}>
          <Link href='/forgot-password' className={styles.submit}>
            Send me a new link
          </Link>
          <p className={styles.small}>
            Or <Link href='/login'>go to sign in</Link>.
          </p>
        </div>
      )}
    </AuthFrame>
  );
}
