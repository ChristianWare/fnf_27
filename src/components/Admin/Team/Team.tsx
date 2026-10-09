"use client";

// Everyone who can sign in, and what they see. Make someone an admin (or a
// client again), invite a new admin, or remove one. The server checks every
// change; you can't change your own role, and the owner is always an admin.

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Mark from "../Mark";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import { changeRole, inviteAdmin, removeAdmin } from "@/app/admin/actions";
import type { ClientKind } from "@/lib/admin/derive";
import type { TeamMember } from "@/lib/admin";
import { removeProblem, roleChangeProblem } from "@/lib/admin/roles";
import type { Role } from "@/lib/auth/users";
import { fmtAgo, initials, possessive } from "@/lib/dashboard/format";
import styles from "./Team.module.css";

export type TeamRow = TeamMember & {
  kind?: ClientKind;
  /** Invited, and hasn't set a password yet. */
  invited?: boolean;
};

type Confirm =
  | { type: "role"; member: TeamRow; role: Role }
  | { type: "remove"; member: TeamRow };

type Filter = "all" | Role;

const first = (name: string) => name.split(" ")[0];

/** "Desert Star Chauffeured's", or "their" for someone without a business. */
const theirs = (m: { business?: string }) =>
  m.business ? possessive(m.business) : "their";

const adminCan = [
  "Every client, and View as client",
  "Billing, invoices and the next run",
  "Change requests and messages",
  "Team and roles",
];

const clientCan = [
  "Their own dashboard, nothing else",
  "Their build, blueprint and files",
  "Their growth, billing and support",
  "Never another client's business",
];

export default function Team({
  initial,
  meId,
  now,
}: {
  initial: TeamRow[];
  meId: string;
  now: string;
}) {
  const toast = useToast();
  const [members, setMembers] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const admins = members.filter((m) => m.role === "ADMIN");
  const activeAdmins = admins.filter((m) => !m.invited).length;
  const clients = members.filter((m) => m.role === "CLIENT");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => filter === "all" || m.role === filter)
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.business ?? "").toLowerCase().includes(q),
      );
  }, [members, filter, query]);

  const why = (m: TeamRow, role: Role) =>
    m.invited
      ? "They haven't accepted their invite yet."
      : roleChangeProblem(meId, m, role, activeAdmins);

  const applyRole = (member: TeamRow, role: Role) =>
    startTransition(async () => {
      const result = await changeRole(member.id, role);
      if (!result.ok) {
        toast(result.error, { tone: "error" });
        return;
      }
      setMembers((list) =>
        list.map((m) => (m.id === member.id ? { ...m, role } : m)),
      );
      setConfirm(null);
      toast(
        role === "ADMIN"
          ? `${member.name} is now an admin`
          : `${member.name} is a client again`,
        {
          detail:
            role === "ADMIN"
              ? `${first(member.name)} lands in the admin from their next page load.`
              : `${first(member.name)} only sees ${theirs(member)} dashboard now.`,
        },
      );
    });

  const remove = (member: TeamRow) =>
    startTransition(async () => {
      const result = await removeAdmin(member.id);
      if (!result.ok) {
        toast(result.error, { tone: "error" });
        return;
      }
      setMembers((list) => list.filter((m) => m.id !== member.id));
      setConfirm(null);
      toast(
        member.invited
          ? `Invite to ${first(member.name)} cancelled`
          : `${member.name} removed`,
        {
          tone: "info",
          detail: member.invited
            ? "The link in their email no longer works."
            : "They can't sign in anymore. Their replies stay.",
        },
      );
    });

  const invite = () =>
    startTransition(async () => {
      setError("");
      const result = await inviteAdmin(name, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMembers((list) => [
        ...list.filter((m) => m.role === "ADMIN"),
        {
          id: result.data?.id ?? `invite-${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: "ADMIN",
          invited: true,
        },
        ...list.filter((m) => m.role !== "ADMIN"),
      ]);
      setInviting(false);
      toast(`Invite sent to ${first(name.trim())}`, {
        detail: `${email.trim()} gets a link to set a password.`,
      });
      setName("");
      setEmail("");
    });

  const openInvite = () => {
    setError("");
    setInviting(true);
  };

  return (
    <>
      {/* ── The two roles ── */}
      <div className={styles.roles}>
        <section className={`${styles.role} ${styles.roleAdmin}`}>
          <div className={styles.roleTop}>
            <span className={styles.roleIcon}>
              <Icon name='shield' />
            </span>
            <span className={styles.roleCount}>
              {admins.length} {admins.length === 1 ? "person" : "people"}
            </span>
          </div>
          <div className={styles.roleText}>
            <h2 className={styles.roleName}>Admin</h2>
            <p>Runs the studio. Sees and changes everything.</p>
          </div>
          <ul className={styles.can}>
            {adminCan.map((line) => (
              <li key={line}>
                <Icon name='check' />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.role}>
          <div className={styles.roleTop}>
            <span className={styles.roleIcon}>
              <Icon name='user' />
            </span>
            <span className={styles.roleCount}>
              {clients.length} {clients.length === 1 ? "person" : "people"}
            </span>
          </div>
          <div className={styles.roleText}>
            <h2 className={styles.roleName}>Client</h2>
            <p>Signs up on their own. Sees only their business.</p>
          </div>
          <ul className={styles.can}>
            {clientCan.map((line) => (
              <li key={line}>
                <Icon name='check' />
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── Admins ── */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Admins</h2>
            <p>The people who run Fonts &amp; Footers with you.</p>
          </div>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
            onClick={openInvite}
          >
            Invite an admin
            <Icon name='plus' className={ui.btnIcon} />
          </button>
        </div>

        <ul className={styles.admins}>
          {admins.map((m) => {
            const blocked = m.invited
              ? undefined
              : removeProblem(meId, m, activeAdmins);
            return (
              <li key={m.id} className={styles.admin}>
                <span className={`${styles.avatar} ${styles.avatarAdmin}`}>
                  {initials(m.name)}
                </span>
                <span className={styles.adminText}>
                  <span className={styles.name}>{m.name}</span>
                  <span className={styles.email}>{m.email}</span>
                </span>
                <span className={styles.adminPills}>
                  {m.owner && (
                    <Pill tone='lime' dot>
                      Owner
                    </Pill>
                  )}
                  {m.id === meId && <Pill tone='black'>You</Pill>}
                  {m.invited && (
                    <Pill tone='yellow' dot>
                      Invite sent
                    </Pill>
                  )}
                  {m.business && <Pill tone='gray'>{m.business}</Pill>}
                </span>
                {m.clientId && !why(m, "CLIENT") ? (
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    onClick={() =>
                      setConfirm({ type: "role", member: m, role: "CLIENT" })
                    }
                  >
                    Make client
                  </button>
                ) : (
                  !blocked && (
                    <button
                      type='button'
                      className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                      onClick={() => setConfirm({ type: "remove", member: m })}
                    >
                      {m.invited ? "Cancel invite" : "Remove"}
                    </button>
                  )
                )}
              </li>
            );
          })}
          <li>
            <button
              type='button'
              className={styles.addAdmin}
              onClick={openInvite}
            >
              <span className={styles.addIcon}>
                <Icon name='plus' />
              </span>
              <span className={styles.adminText}>
                <span className={styles.name}>Bring someone on</span>
                <span className={styles.email}>
                  Invite them, or make a client an admin below.
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      {/* ── Everyone ── */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Everyone who signs in</h2>
            <p>Switch a role and it counts from their next page load.</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Icon name='search' className={styles.searchIcon} />
            <span className={ui.srOnly}>Search people</span>
            <input
              className={ui.input}
              type='search'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Name, email or business'
            />
          </label>
          <div className={styles.chips} role='group' aria-label='Show'>
            {(
              [
                ["all", "Everyone", members.length],
                ["ADMIN", "Admins", admins.length],
                ["CLIENT", "Clients", clients.length],
              ] as const
            ).map(([key, text, count]) => (
              <button
                key={key}
                type='button'
                className={ui.chip}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {text}
                <span className={styles.count}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.listHead} aria-hidden='true'>
          <span>Person</span>
          <span>Business</span>
          <span>Last activity</span>
          <span>Role</span>
        </div>

        {shown.length ? (
          <ul className={styles.people}>
            {shown.map((m) => (
              <li key={m.id} className={styles.person}>
                <span className={styles.who}>
                  <span
                    className={`${styles.avatar} ${m.role === "ADMIN" ? styles.avatarAdmin : ""}`}
                  >
                    {initials(m.name)}
                  </span>
                  <span className={styles.adminText}>
                    <span className={styles.name}>
                      {m.name}
                      {m.id === meId && <span className={styles.you}>You</span>}
                    </span>
                    <span className={styles.email}>{m.email}</span>
                  </span>
                </span>

                <span className={styles.business}>
                  {m.clientId && m.business ? (
                    <Link
                      href={`/admin/clients/${m.clientId}`}
                      className={styles.bizLink}
                    >
                      {m.kind && (
                        <Mark business={m.business} kind={m.kind} size='sm' />
                      )}
                      <span>{m.business}</span>
                    </Link>
                  ) : (
                    <span className={styles.studio}>Fonts &amp; Footers</span>
                  )}
                </span>

                <span className={styles.when}>
                  {m.id === meId
                    ? "Now"
                    : m.invited
                      ? "Invited"
                      : m.lastActiveAt
                        ? fmtAgo(m.lastActiveAt, now)
                        : "–"}
                </span>

                <span
                  className={styles.switch}
                  role='radiogroup'
                  aria-label={`${m.name}'s role`}
                >
                  {(["CLIENT", "ADMIN"] as const).map((role) => {
                    const on = m.role === role;
                    const problem = on ? undefined : why(m, role);
                    return (
                      <button
                        key={role}
                        type='button'
                        role='radio'
                        aria-checked={on}
                        disabled={!on && Boolean(problem)}
                        title={problem}
                        className={`${styles.option} ${on ? (role === "ADMIN" ? styles.optionAdmin : styles.optionOn) : ""}`}
                        onClick={() => {
                          if (!on)
                            setConfirm({ type: "role", member: m, role });
                        }}
                      >
                        {role === "ADMIN" ? "Admin" : "Client"}
                      </button>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.none}>Nobody matches.</p>
        )}

        <p className={styles.footnote}>
          <Icon name='lock' />
          You can&apos;t change your own role, and the owner is always an admin,
          so the studio never ends up without one.
        </p>
      </section>

      {/* ── Confirm a change ── */}
      <Modal isOpen={Boolean(confirm)} onClose={() => setConfirm(null)}>
        {confirm && (
          <div className={ui.modalBody}>
            <span className={styles.modalIcon}>
              <Icon
                name={
                  confirm.type === "remove"
                    ? "trash"
                    : confirm.role === "ADMIN"
                      ? "shield"
                      : "user"
                }
              />
            </span>
            {confirm.type === "role" && confirm.role === "ADMIN" && (
              <>
                <h2 className={ui.modalTitle}>
                  Make {confirm.member.name} an admin?
                </h2>
                <div className={styles.modalBox}>
                  <span className={ui.mono}>
                    {first(confirm.member.name)} will be able to see
                  </span>
                  <ul className={styles.can}>
                    {adminCan.map((line) => (
                      <li key={line}>
                        <Icon name='check' />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className={styles.modalText}>
                  From their next page load they land in the admin. To see{" "}
                  {theirs(confirm.member)} dashboard, they use View as client.
                </p>
              </>
            )}
            {confirm.type === "role" && confirm.role === "CLIENT" && (
              <>
                <h2 className={ui.modalTitle}>
                  Make {confirm.member.name} a client again?
                </h2>
                <p className={styles.modalText}>
                  They lose the admin from their next page load, and only see{" "}
                  {theirs(confirm.member)} dashboard.
                </p>
              </>
            )}
            {confirm.type === "remove" && (
              <>
                <h2 className={ui.modalTitle}>
                  {confirm.member.invited
                    ? `Cancel ${first(confirm.member.name)}'s invite?`
                    : `Remove ${confirm.member.name}?`}
                </h2>
                <p className={styles.modalText}>
                  {confirm.member.invited
                    ? "The link in their email stops working. You can invite them again anytime."
                    : "They can't sign in anymore. Everything they did, like replies and notes, stays."}
                </p>
              </>
            )}
            <div className={ui.modalActions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => setConfirm(null)}
              >
                Keep it
              </button>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={pending}
                onClick={() =>
                  confirm.type === "remove"
                    ? remove(confirm.member)
                    : applyRole(confirm.member, confirm.role)
                }
              >
                {pending
                  ? "Saving…"
                  : confirm.type === "remove"
                    ? confirm.member.invited
                      ? "Cancel invite"
                      : "Remove"
                    : confirm.role === "ADMIN"
                      ? "Make admin"
                      : "Make client"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Invite an admin ── */}
      <Modal isOpen={inviting} onClose={() => setInviting(false)}>
        {inviting && (
          <form
            className={ui.modalBody}
            onSubmit={(e) => {
              e.preventDefault();
              invite();
            }}
          >
            <span className={styles.modalIcon}>
              <Icon name='mail' />
            </span>
            <h2 className={ui.modalTitle}>Invite an admin</h2>
            <p className={styles.modalText}>
              They get an email with a link to set their password. Once
              they&apos;re in, they see everything you see.
            </p>
            <div className={styles.fields}>
              <label className={ui.field}>
                <span className={ui.label}>Name</span>
                <input
                  className={ui.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete='off'
                  placeholder='e.g. Jordan Lee'
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Email</span>
                <input
                  className={ui.input}
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete='off'
                  placeholder='jordan@fontsandfooters.com'
                />
              </label>
            </div>
            {error && (
              <p className={styles.error} role='alert'>
                {error}
              </p>
            )}
            <div className={ui.modalActions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => setInviting(false)}
              >
                Cancel
              </button>
              <button
                type='submit'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={pending || !name.trim() || !email.trim()}
              >
                {pending ? "Sending…" : "Send invite"}
                <Icon name='send' className={ui.btnIcon} />
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
