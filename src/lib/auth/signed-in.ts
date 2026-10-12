// The name of the cookie that says someone is signed in (see
// SIGNED_IN_COOKIE in session.ts). On its own here so the nav, which runs
// in the browser, can read the name without pulling in the session code.
// Safe anywhere.

export const SIGNED_IN_COOKIE = "fnf_in";
