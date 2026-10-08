// SAMPLE accounts, for trying the dashboard before the client accounts move
// over from the current site. When the database comes across, sign-in looks
// people up there (with hashed passwords) and this file goes away.

export type User = {
  id: string;
  name: string;
  email: string;
  /** The business this person signs in for. */
  clientId: string;
  /** Sample accounts show a "Sample data" tag in the dashboard. */
  sample?: boolean;
};

/** The password for every sample account. */
export const SAMPLE_PASSWORD = "fonts2026";

export const sampleAccounts: (User & { label: string })[] = [
  {
    id: "user-dana",
    name: "Dana Reyes",
    email: "platform@demo.test",
    clientId: "desert-star",
    label: "Full Platform, live",
    sample: true,
  },
  {
    id: "user-marcus",
    name: "Marcus Hill",
    email: "website@demo.test",
    clientId: "copper-state",
    label: "Website Only, in the build",
    sample: true,
  },
  {
    id: "user-priya",
    name: "Priya Shah",
    email: "leads@demo.test",
    clientId: "mesa-executive",
    label: "Leads Tool, free trial",
    sample: true,
  },
];

const strip = ({ id, name, email, clientId, sample }: User): User => ({
  id,
  name,
  email,
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
