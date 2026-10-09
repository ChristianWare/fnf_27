// The strip across the top of a client's dashboard while an admin is
// viewing it as them.

import Icon from "../icons";
import styles from "./ViewAs.module.css";
import { stopViewingAs } from "@/app/admin/actions";
import { possessive } from "@/lib/dashboard/format";

export default function ViewAs({
  business,
  clientId,
}: {
  business: string;
  clientId: string;
}) {
  return (
    <div className={styles.banner} role='status'>
      <span className={styles.icon}>
        <Icon name='eye' />
      </span>
      <p className={styles.text}>
        You&apos;re seeing <strong>{possessive(business)}</strong> dashboard
        exactly as they do.
      </p>
      <form action={stopViewingAs.bind(null, clientId)}>
        <button type='submit' className={styles.back}>
          Back to admin
          <Icon name='arrow' className={styles.arrow} />
        </button>
      </form>
    </div>
  );
}
