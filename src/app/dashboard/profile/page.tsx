import type { Metadata } from "next";
import Profile from "@/components/Dashboard/Profile/Profile";
import { Notice, PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard, leadsAccess } from "@/lib/dashboard";
import { findUserById } from "@/lib/auth/accounts";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const { user, client, viewingAs } = await getDashboard();
  const { email } = await searchParams;
  // Viewing as a client: their details, not the admin's.
  const row = viewingAs ? undefined : await findUserById(user.id);
  return (
    <>
      <PageHead
        crumb='Account'
        title='Profile'
        text='Your details, your password and the emails you get from us.'
      />
      {email === "confirmed" && (
        <Notice tone='good'>
          Your new email is confirmed. Sign in with it from now on.
        </Notice>
      )}
      {email === "taken" && (
        <Notice tone='bad'>
          Someone else signs in with that email now, so we couldn&apos;t switch
          to it.
        </Notice>
      )}
      <Profile
        initial={{
          name: row?.name ?? client.contact.name,
          email: row?.email ?? client.contact.email,
          phone: row?.phone ?? client.contact.phone,
          role: row?.title ?? client.contact.role,
          business: client.business,
          city: client.city,
          domain: client.website?.domain,
        }}
        leads={leadsAccess(client) !== "NONE"}
        emails={row?.notify ?? {}}
        pendingEmail={row?.pendingEmail ?? undefined}
      />
    </>
  );
}
