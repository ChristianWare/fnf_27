// US phone numbers, shown and stored as (602) 555-5555. Safe anywhere.

/** Anything typed or pasted, as (602) 555-5555 so far. Digits only. */
export function formatPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  // A leading 1 (the country code) isn't part of the ten digits.
  if (digits.length > 10 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
