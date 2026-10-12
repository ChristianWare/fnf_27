// The site's own stats are on Plausible (components/shared/Analytics). This
// counts the forms that matter as goals: an audit run, an audit's full
// report asked for, a message sent, a newsletter sign-up. Add each name as
// a custom event goal in Plausible to see it there. Does nothing where the
// script isn't loaded (development, previews). Browser only.

declare global {
  interface Window {
    plausible?: (event: string) => void;
  }
}

export type Goal = "Audit run" | "Audit report" | "Contact" | "Newsletter";

export function track(goal: Goal) {
  try {
    window.plausible?.(goal);
  } catch {
    // Stats never get in the way of the form.
  }
}
