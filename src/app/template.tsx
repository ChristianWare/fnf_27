"use client";

// Starts a page transition on every navigation.
//
// A template wraps every page like a layout, but unlike a layout it
// remounts on each page change. So the tiny marker below leaves with the
// old page and arrives with the new one, which tells React to run a view
// transition. The browser then animates a snapshot of the whole screen:
// the old page lifts and fades back while the new page wipes up over it.
// The animation itself is in globals.css.

import { ViewTransition, type ReactNode } from "react";
import styles from "./template.module.css";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <ViewTransition enter='route-change' exit='route-change' default='none'>
        <span className={styles.marker} aria-hidden='true' />
      </ViewTransition>
      {children}
    </>
  );
}
