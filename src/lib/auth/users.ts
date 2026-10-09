// Who can sign in. The accounts live in the database (the users table);
// this file holds their shape and where each one lands, so it's safe to
// use anywhere.

/** CLIENT signs in to their own dashboard; ADMIN runs the studio. */
export type Role = "CLIENT" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** The business a client signs in for. */
  clientId?: string;
  /** The person who set up the studio. Always an admin. */
  owner: boolean;
  phone?: string;
  /** Their role at the business, e.g. "Owner". */
  title?: string;
  /** Which emails they get. Missing means on. */
  notify: Record<string, boolean>;
};

/** Where someone lands after signing in. */
export const homeFor = (user: Pick<User, "role">) =>
  user.role === "ADMIN" ? "/admin" : "/dashboard";

/** Whether they get this kind of email. Everything's on until they say no. */
export const wants = (user: Pick<User, "notify">, kind: string) =>
  user.notify[kind] !== false;
