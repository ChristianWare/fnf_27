// SAMPLE accounts, for trying the dashboard and the admin before the
// accounts move over from the current site. When the database comes across,
// sign-in looks people up there (with hashed passwords) and this file goes
// away.

/** CLIENT signs in to their own dashboard; ADMIN runs the studio. */
export type Role = "CLIENT" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** The business a client signs in for. Admins have none. */
  clientId?: string;
  /** Sample accounts show a "Sample data" tag. */
  sample?: boolean;
};

/** The password for every sample account. */
export const SAMPLE_PASSWORD = "fonts2026";

export const sampleAccounts: (User & { label: string })[] = [
  {
    id: "user-chris",
    name: "Chris Ware",
    email: "admin@demo.test",
    role: "ADMIN",
    label: "Admin, the whole studio",
    sample: true,
  },
  {
    id: "user-dana",
    name: "Dana Reyes",
    email: "platform@demo.test",
    role: "CLIENT",
    clientId: "desert-star",
    label: "Full Platform, live",
    sample: true,
  },
  {
    id: "user-marcus",
    name: "Marcus Hill",
    email: "website@demo.test",
    role: "CLIENT",
    clientId: "copper-state",
    label: "Website Only, in the build",
    sample: true,
  },
  {
    id: "user-priya",
    name: "Priya Shah",
    email: "leads@demo.test",
    role: "CLIENT",
    clientId: "mesa-executive",
    label: "Leads Tool, free trial",
    sample: true,
  },
];

const strip = ({ id, name, email, role, clientId, sample }: User): User => ({
  id,
  name,
  email,
  role,
  clientId,
  sample,
});

export function findUserByEmail(email: string) {
  const user = sampleAccounts.find(
    (account) => account.email === email.trim().toLowerCase(),
  );
  return user ? strip(user) : undefined;
}

export function getUserById(id: string) {
  const user = sampleAccounts.find((account) => account.id === id);
  return user ? strip(user) : undefined;
}

/** Where someone lands after signing in. */
export const homeFor = (user: Pick<User, "role">) =>
  user.role === "ADMIN" ? "/admin" : "/dashboard";
