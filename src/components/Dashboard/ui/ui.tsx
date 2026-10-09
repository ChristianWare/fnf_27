// The dashboard's building blocks: the page header, the white panels, the
// pills, progress bars and empty states. The button, field and table
// classes live in ui.module.css for client components to use directly.

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ui.module.css";
import Icon, { type IconName } from "../icons";

export { styles as ui };

export function PageHead({
  crumb,
  title,
  text,
  children,
}: {
  crumb: string;
  title: string;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={styles.head}>
      <div className={styles.headText}>
        <span className={styles.eyebrow}>{crumb}</span>
        <h1 className={`h3 ${styles.title}`}>{title}</h1>
        {text && <p className={styles.headCopy}>{text}</p>}
      </div>
      {children && <div className={styles.headActions}>{children}</div>}
    </header>
  );
}

export function Panel({
  title,
  text,
  action,
  id,
  className = "",
  children,
}: {
  title?: string;
  text?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className={`${styles.panel} ${className}`}>
      {(title || action) && (
        <div className={styles.panelHead}>
          <div className={styles.panelTitles}>
            {title && <h2 className={styles.panelTitle}>{title}</h2>}
            {text && <p>{text}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export type Tone =
  "black" | "mint" | "purple" | "lime" | "yellow" | "gray" | "red" | "white";

export function Pill({
  tone = "gray",
  dot,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`${styles.pill} ${styles[tone]} ${dot ? styles.pillDot : ""}`}
    >
      {children}
    </span>
  );
}

export function Progress({
  value,
  max = 100,
  label,
  tone = "black",
}: {
  value: number;
  max?: number;
  label: string;
  tone?: "black" | "lime" | "mint" | "purple";
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={styles.track}
      role='progressbar'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className={`${styles.fill} ${styles[`fill_${tone}`]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function Empty({
  icon,
  title,
  text,
  children,
}: {
  icon: IconName;
  title: string;
  text: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} />
      </span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyText}>{text}</p>
      {children && <div className={styles.emptyActions}>{children}</div>}
    </div>
  );
}

type Variant = "black" | "light" | "white" | "lime" | "outline";

/** The class names for a dashboard button. */
export const btn = (variant: Variant = "black", small = false) =>
  `${styles.btn} ${styles[`btn_${variant}`]} ${small ? styles.btnSmall : ""}`;

/** A link that looks like a button. External links open in a new tab. */
export function ButtonLink({
  href,
  variant = "black",
  small,
  icon,
  children,
}: {
  href: string;
  variant?: Variant;
  small?: boolean;
  icon?: IconName;
  children: ReactNode;
}) {
  const external = /^(https?:|mailto:)/.test(href);
  const content = (
    <>
      {children}
      {icon && <Icon name={icon} className={styles.btnIcon} />}
    </>
  );
  if (external) {
    return (
      <a
        href={href}
        className={btn(variant, small)}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel='noopener noreferrer'
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={btn(variant, small)}>
      {content}
    </Link>
  );
}

/** The page for a website page when there's no website plan. */
export function NoWebsite({ crumb, title }: { crumb: string; title: string }) {
  return (
    <>
      <PageHead crumb={crumb} title={title} />
      <Panel>
        <Empty
          icon='globe'
          title='No website plan yet'
          text='This is where your website build and its growth live. Book a call and we’ll show you what your site could look like.'
        >
          <ButtonLink
            href='https://calendly.com/chris-ware-dev/discovery-call'
            icon='arrowUpRight'
          >
            Book a call
          </ButtonLink>
          <ButtonLink href='/dashboard' variant='light'>
            Back to dashboard
          </ButtonLink>
        </Empty>
      </Panel>
    </>
  );
}

/** A one-line message at the top of a page: saved, confirmed, or a problem. */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "good" | "bad" | "info";
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.notice} ${tone === "good" ? styles.noticeGood : tone === "bad" ? styles.noticeBad : ""}`}
      role={tone === "bad" ? "alert" : "status"}
    >
      <Icon
        name={tone === "good" ? "check" : "info"}
        className={styles.noticeIcon}
      />
      <p>{children}</p>
    </div>
  );
}
