"use client";

import { useLenis } from "lenis/react";
import styles from "./Nav.module.css";
import Link from "next/link";
import Logo from "../Logo/Logo";
import Button from "../Button/Button";
import { useEffect, useState, useSyncExternalStore, MouseEvent } from "react";
import { usePathname } from "next/navigation";
import LayoutWrapper from "../LayoutWrapper";
import { SIGNED_IN_COOKIE } from "@/lib/auth/signed-in";

/**
 * "Log in", or "My account" for someone who's signed in. The pages are
 * drawn once for everyone, so this comes from the fnf_in cookie in the
 * browser (the real session is checked behind the login itself); the
 * server, with no cookie to read, draws "Log in".
 */
const whereSignedIn = () => {
  const where = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SIGNED_IN_COOKIE}=`))
    ?.split("=")[1];
  return where === "admin" || where === "dashboard" ? `/${where}` : "/login";
};
const noChanges = () => () => {};

function useAccountLink() {
  const href = useSyncExternalStore(noChanges, whereSignedIn, () => "/login");
  return { href, text: href === "/login" ? "Log in" : "My account" };
}

interface NavProps {
  hamburgerColor?: string;
}

export default function Nav({ hamburgerColor = "" }: NavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lenis = useLenis();

  // Hold the page still while the mobile menu is open.
  useEffect(() => {
    if (!lenis) return;
    if (isOpen) lenis.stop();
    else lenis.start();
  }, [isOpen, lenis]);

  useEffect(() => {
    const body = document.body;
    body.style.overflow =
      window.innerWidth <= 1068 && isOpen ? "hidden" : "auto";
    const handleResize = () => setIsOpen(false);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      body.style.overflow = "auto";
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen((s) => !s);
  const closeMenu = () => setIsOpen(false);

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    closeMenu();
    if (href.startsWith("/#")) {
      e.preventDefault();
      const id = href.replace("/#", "");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleHamburgerClick = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    toggleMenu();
  };

  const items = [
    { text: "Home", href: "/" },
    { text: "Services", href: "/services" },
    { text: "Pricing", href: "/pricing" },
    { text: "Projects", href: "/projects" },
    { text: "Journal", href: "/journal" },
    { text: "About", href: "/about" },
    { text: "Contact", href: "/contact" },
  ];

  const pathname = usePathname();
  const account = useAccountLink();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={styles.header}
      // Holds the nav still during page transitions (see globals.css). Set
      // here, not in the CSS module, which would rename it.
      style={{ viewTransitionName: "site-nav" }}
    >
      <LayoutWrapper paddingNSNone='paddingNSNone'>
        <nav className={styles.navbar}>
          <div className={styles.navLeft}>
            <div className={styles.logoContainer}>
              <Logo />
            </div>

            {isOpen && <div className={styles.overlay} onClick={closeMenu} />}
          </div>

          <div
            className={
              isOpen ? `${styles.navItems} ${styles.active}` : styles.navItems
            }
            data-lenis-prevent
          >
            {items.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={styles.navItem}
                >
                  {item.text}
                </Link>
              );
            })}
            <Link
              href={account.href}
              onClick={closeMenu}
              className={`${styles.navItem} ${styles.accountItem}`}
            >
              {account.text}
            </Link>
            {/* <div className={styles.btnContainerii}>
              <Button
                href='https://calendly.com/chris-ware-dev/discovery-call'
                target='_blank'
                text='Book your discovery call'
                btnType='grayNav'
                onClick={closeMenu}
                arrow
              />
            </div> */}
          </div>

          <div className={styles.navRight}>
            <Link href={account.href} className={styles.accountLink}>
              {account.text}
            </Link>
            <div className={styles.btnContainer}>
              <Button href='/contact' text='Contact now' btnType='grayNav' />
            </div>
            <div
              className={`${styles.hamburgerContainer} ${isOpen ? styles.hamburgerContainerOpen : ""}`}
            >
              <div
                className={`${styles.menuText} ${isOpen ? styles.menuTextOpen : ""}`}
              >
                MENU
              </div>
              <span
                className={`${styles.hamburger} ${isOpen ? styles.active : ""}`}
                onClick={handleHamburgerClick}
                aria-expanded={isOpen}
                role='button'
              >
                <span
                  className={`${styles.whiteBar} ${isOpen ? styles.barOpen : ""} ${styles[hamburgerColor]}`}
                ></span>
                <span
                  className={`${styles.whiteBar} ${isOpen ? styles.barOpen : ""} ${styles[hamburgerColor]}`}
                ></span>
                <span
                  className={`${styles.whiteBar} ${isOpen ? styles.barOpen : ""} ${styles[hamburgerColor]}`}
                ></span>
              </span>
            </div>
          </div>
        </nav>
      </LayoutWrapper>
    </header>
  );
}
