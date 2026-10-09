// What every server action sends back: ok (with anything the page needs,
// like a new id), or a sentence saying what went wrong. Safe anywhere.

export type ActionResult<T = undefined> =
  { ok: true; data?: T } | { ok: false; error: string };

export const done = <T>(data?: T): ActionResult<T> => ({ ok: true, data });

export const fail = (error: string): ActionResult<never> => ({
  ok: false,
  error,
});

/** Shown when an admin tries to change something while viewing as a client. */
export const VIEW_ONLY =
  "You're viewing as this client, so nothing here can be changed. Make changes from the admin.";
