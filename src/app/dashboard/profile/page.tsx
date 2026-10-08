import type { Metadata } from "next";
import Profile from "@/components/Dashboard/Profile/Profile";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard, leadsAccess } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user, client } = await getDashboard();
  return (
    <>
      <PageHead
        crumb='Account'
        title='Profile'
        text='Your details, your password and the emails you get from us.'
      />
      <Profile
        initial={{
          name: client.contact.name,
          email: client.contact.email,
          phone: client.contact.phone,
          role: client.contact.role,
          business: client.business,
          city: client.city,
          domain: client.website?.domain,
        }}
        leads={leadsAccess(client) !== "NONE"}
        sample={user.sample}
      />
    </>
  );
}
