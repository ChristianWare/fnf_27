// The tabs on a client's page. Plain links, so each tab has its own URL
// (?tab=billing) you can share or come back to.

import Link from "next/link";
import styles from "./Client.module.css";
import Icon, { type IconName } from "@/components/Dashboard/icons";

export type TabKey =
  "overview" | "blueprint" | "files" | "growth" | "conversations" | "billing";

export type Tab = {
  key: TabKey;
  label: string;
  icon: IconName;
  badge?: number;
};

export default function Tabs({
  clientId,
  tabs,
  active,
}: {
  clientId: string;
  tabs: Tab[];
  active: TabKey;
}) {
  return (
    <nav className={styles.tabs} aria-label='Client sections'>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/admin/clients/${clientId}${tab.key === "overview" ? "" : `?tab=${tab.key}`}`}
          scroll={false}
          className={`${styles.tab} ${tab.key === active ? styles.tabActive : ""}`}
          aria-current={tab.key === active ? "page" : undefined}
        >
          <Icon name={tab.icon} className={styles.tabIcon} />
          {tab.label}
          {tab.badge ? (
            <span className={styles.tabBadge}>{tab.badge}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
