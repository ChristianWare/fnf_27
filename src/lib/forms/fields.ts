// The hidden fields on the public forms, named here so the form and the
// server agree. Safe anywhere.

/** The trap field: a person never sees it, so a value in it means a bot. */
export const TRAP_FIELD = "contact_url";
/** When the form was drawn, signed by the server. */
export const STAMP_FIELD = "stamp";
