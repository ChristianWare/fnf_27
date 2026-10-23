// What the loading bar listens to. Anything that makes the user wait can
// start it: a page change ("nav"), or a save in the dashboard or the admin
// (each with its own key, so two at once keep it going until both finish).

type Listener = (on: boolean) => void;

const listeners = new Set<Listener>();
const working = new Set<string>();

const emit = () => {
  const on = working.size > 0;
  listeners.forEach((listener) => listener(on));
};

export const navProgress = {
  start(key = "nav") {
    const was = working.size;
    working.add(key);
    if (!was) emit();
  },
  done(key = "nav") {
    if (!working.delete(key)) return;
    if (!working.size) emit();
  },
  /** Stops it whatever started it, e.g. after it's been going too long. */
  reset() {
    if (!working.size) return;
    working.clear();
    emit();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
