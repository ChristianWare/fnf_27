// The booking systems the audit knows by their web address, so it can say
// "riders book through Limo Anywhere" when a site links to one or loads one
// in a widget. It only ever names the system: what it charges isn't
// something the audit can see from outside. Add to the list as you meet
// new ones. Safe anywhere.

export const BOOKING_SYSTEMS: { name: string; hosts: string[] }[] = [
  { name: "Limo Anywhere", hosts: ["mylimobiz.com", "limoanywhere.com"] },
  { name: "Moovs", hosts: ["moovs.app", "moovsapp.com"] },
  { name: "Ground Alliance", hosts: ["groundalliance.com"] },
  { name: "BookingKoala", hosts: ["bookingkoala.com"] },
  { name: "FareHarbor", hosts: ["fareharbor.com"] },
  { name: "Checkfront", hosts: ["checkfront.com"] },
  { name: "Rezdy", hosts: ["rezdy.com"] },
  { name: "Peek", hosts: ["peek.com"] },
  { name: "Square", hosts: ["squareup.com", "square.site"] },
];

/** Form builders: the form lives on someone else's site. */
export const FORM_HOSTS = [
  "jotform.com",
  "typeform.com",
  "formstack.com",
  "wufoo.com",
  "cognitoforms.com",
  "forms.gle",
  "docs.google.com",
];

const hostOf = (value: string) => {
  try {
    return new URL(value, "https://x.invalid").hostname.toLowerCase();
  } catch {
    return "";
  }
};

const under = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

/** The booking system an address belongs to, if we know it. */
export function bookingSystemOf(value: string) {
  const host = hostOf(value);
  if (!host) return undefined;
  return BOOKING_SYSTEMS.find((s) => s.hosts.some((h) => under(host, h)))?.name;
}

/** An address on one of the form builders. */
export const isFormHost = (value: string) => {
  const host = hostOf(value);
  return Boolean(host) && FORM_HOSTS.some((h) => under(host, h));
};
