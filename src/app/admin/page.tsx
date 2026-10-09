import Today from "@/components/Admin/Today/Today";
import { getAdmin } from "@/lib/admin";

export default async function AdminPage() {
  const { user, clients, now } = await getAdmin();
  return <Today clients={clients} name={user.name} now={now} />;
}
