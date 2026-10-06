import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./FeatureMarquee.module.css";
import Platform from "@/components/shared/icons/Platform/Platform";
import Plane from "@/components/shared/icons/Plane/Plane";
import Driver from "@/components/shared/icons/Driver/Driver";
import Customer from "@/components/shared/icons/Customer/Customer";
import Payment from "@/components/shared/icons/Payment/Payment";
import Company from "@/components/shared/icons/Company/Company";
import Notifications from "@/components/shared/icons/Notifications/Notifications";
import Invoice from "@/components/shared/icons/Invoice/Invoice";
import Analytics from "@/components/shared/icons/Analytics/Analytics";
import Location from "@/components/shared/icons/Location/Location";

// What runs inside Nier Transportation's platform today.
const items = [
  { id: 1, text: "Direct booking", Icon: Platform },
  { id: 2, text: "Flight tracking", Icon: Plane },
  { id: 3, text: "Driver portal", Icon: Driver },
  { id: 4, text: "Customer portal", Icon: Customer },
  { id: 5, text: "Payments", Icon: Payment },
  { id: 6, text: "Corporate accounts", Icon: Company },
  { id: 7, text: "Trip reminders", Icon: Notifications },
  { id: 8, text: "Invoices", Icon: Invoice },
  { id: 9, text: "Reports", Icon: Analytics },
  { id: 10, text: "City pages", Icon: Location },
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className={styles.row} aria-hidden={hidden || undefined}>
      {items.map(({ id, text, Icon }) => (
        <li className={styles.item} key={id}>
          <Icon className={styles.icon} aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

export default function FeatureMarquee() {
  return (
    <section
      className={styles.container}
      aria-label="What runs inside Nier Transportation today"
    >
      <LayoutWrapper paddingNSNone="paddingNSNone" pRightSmall="pRightSmall">
        <div className={styles.content}>
          <p className={styles.label}>
            Running inside Nier Transportation today.
          </p>
          <div className={styles.viewport}>
            {/* Two copies side by side, so the loop has no seam. */}
            <div className={styles.track}>
              <Row />
              <Row hidden />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
