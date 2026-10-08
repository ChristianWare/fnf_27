"use client";

// The dashboard frame: the sidebar on the left, the page on the right. On
// smaller screens the sidebar slides in from a menu button.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import Logo from "@/components/shared/Logo/Logo";
import Icon from "../icons";
import { signOut } from "@/app/login/actions";
import { ToastProvider } from "../Toast/Toast";
import type { NavGroup, NavItem } from "./nav";
import styles from "./Shell.module.css";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

type Props = {
  nav: NavGroup[];
  business: string;
  plan: string;
  tone: "platform" | "website" | "leads";
  user: { name: string; email: string; initials: string; sample?: boolean };
  /** Clients without a website plan see a short invite in the sidebar. */
  promo?: boolean;
  children: ReactNode;
};

export default function Shell({
  nav,
  business,
  plan,
  tone,
  user,
  promo,
  children,
}: Props) {
  const pathname = usePathname();
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const [foldOpen, setFoldOpen] = useState(false);

  // While the menu is open on a phone, the page behind it holds still and
  // Escape closes it.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [open, lenis]);

  const close = () => setOpen(false);

  const link = (item: NavItem) => {
    const active = !item.external && pathname === item.href;
    const content = (
      <>
        <Icon name={item.icon} className={styles.icon} />
        <span className={styles.linkLabel}>{item.label}</span>
        {item.badge ? (
          <span className={styles.badge} aria-label={`${item.badge} waiting`}>
            {item.badge}
          </span>
        ) : null}
        {item.locked && <Icon name='lock' className={styles.trailing} />}
        {item.external && (
          <Icon name='arrowUpRight' className={styles.trailing} />
        )}
      </>
    );

    return (
      <li key={item.href}>
        {item.external ? (
          <a
            href={item.href}
            target='_blank'
            rel='noopener noreferrer'
            className={styles.link}
            onClick={close}
          >
            {content}
            <span className={styles.srOnly}> (opens in a new tab)</span>
          </a>
        ) : (
          <Link
            href={item.href}
            className={`${styles.link} ${active ? styles.active : ""} ${item.locked ? styles.locked : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={close}
          >
            {content}
          </Link>
        )}
      </li>
    );
  };

  return (
    <ToastProvider>
      <div className={styles.shell}>
        <a href='#dashboard-main' className={styles.skip}>
          Skip to content
        </a>

        {/* Phones and tablets: a bar with the menu button. */}
        <div className={styles.mobileBar}>
          <button
            type='button'
            className={styles.menuBtn}
            onClick={() => setOpen(true)}
            aria-label='Open menu'
            aria-expanded={open}
            aria-controls='dashboard-sidebar'
          >
            <Icon name='menu' />
          </button>
          <Logo />
          <span
            className={`${styles.avatar} ${styles.avatarSmall}`}
            aria-hidden='true'
          >
            {user.initials}
          </span>
        </div>

        <div
          className={`${styles.scrim} ${open ? styles.scrimOpen : ""}`}
          onClick={close}
          aria-hidden='true'
        />

        <aside
          id='dashboard-sidebar'
          className={`${styles.side} ${open ? styles.sideOpen : ""}`}
          aria-label='Dashboard'
        >
          <div className={styles.sideTop}>
            <div className={styles.logoRow}>
              <Logo />
              <button
                type='button'
                className={styles.closeBtn}
                onClick={close}
                aria-label='Close menu'
              >
                <Icon name='close' />
              </button>
            </div>

            <div className={styles.workspace}>
              <span
                className={`${styles.mark} ${styles[tone]}`}
                aria-hidden='true'
              >
                {business
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")}
              </span>
              <span className={styles.wsText}>
                <span className={styles.wsName}>{business}</span>
                <span className={styles.wsPlan}>{plan}</span>
              </span>
            </div>
          </div>

          <nav className={styles.nav} data-lenis-prevent>
            {nav.map((group, index) => {
              const foldActive = group.fold?.items.some(
                (item) => item.href === pathname,
              );
              const showFold = foldOpen || foldActive;
              return (
                <div key={group.title ?? index} className={styles.group}>
                  {group.title && (
                    <span className={styles.groupTitle}>{group.title}</span>
                  )}
                  <ul className={styles.list}>{group.items.map(link)}</ul>
                  {group.fold && (
                    <div className={styles.fold}>
                      <button
                        type='button'
                        className={styles.foldBtn}
                        onClick={() => setFoldOpen((value) => !value)}
                        aria-expanded={Boolean(showFold)}
                      >
                        <Icon name='history' className={styles.icon} />
                        <span className={styles.linkLabel}>
                          {group.fold.label}
                        </span>
                        <Icon
                          name='chevron'
                          className={`${styles.trailing} ${styles.chevron} ${showFold ? styles.chevronOpen : ""}`}
                        />
                      </button>
                      {showFold && (
                        <ul className={`${styles.list} ${styles.foldList}`}>
                          {group.fold.items.map(link)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className={styles.sideBottom}>
            {promo && (
              <div className={styles.promo}>
                <span className={styles.promoMono}>Fonts & Footers</span>
                <p className={styles.promoText}>
                  Want a website that books rides while you sleep?
                </p>
                <a
                  href={CALENDAR}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={styles.promoLink}
                >
                  Book a call
                  <Icon name='arrowUpRight' className={styles.promoIcon} />
                </a>
              </div>
            )}

            <div className={styles.me}>
              <span className={styles.avatar} aria-hidden='true'>
                {user.initials}
              </span>
              <span className={styles.meText}>
                <span className={styles.meName}>{user.name}</span>
                {user.sample ? (
                  <span
                    className={styles.sample}
                    title='A sample account: changes you make here last until you reload.'
                  >
                    Sample data
                  </span>
                ) : (
                  <span className={styles.meEmail}>{user.email}</span>
                )}
              </span>
              <form action={signOut}>
                <button
                  type='submit'
                  className={styles.signOut}
                  aria-label='Sign out'
                  title='Sign out'
                >
                  <Icon name='logout' />
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main id='dashboard-main' className={styles.main}>
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
