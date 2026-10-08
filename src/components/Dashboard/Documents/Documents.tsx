"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { Pill, ui } from "../ui/ui";
import styles from "./Documents.module.css";
import { fmtDate } from "@/lib/dashboard/format";
import type { Doc } from "@/lib/dashboard/types";

export default function Documents({
  documents,
  signer,
}: {
  documents: Doc[];
  signer: string;
}) {
  const [docs, setDocs] = useState(documents);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [justSigned, setJustSigned] = useState<string | null>(null);

  const open = docs.find((doc) => doc.id === openId);
  const canSign = name.trim().length > 2 && agree;

  const show = (id: string) => {
    setOpenId(id);
    setName("");
    setAgree(false);
    setJustSigned(null);
  };

  const sign = () => {
    if (!open || !canSign) return;
    const signedAt = new Date().toISOString();
    setDocs((list) =>
      list.map((doc) =>
        doc.id === open.id
          ? { ...doc, status: "SIGNED", signedAt, signedBy: name.trim() }
          : doc,
      ),
    );
    setJustSigned(open.id);
  };

  const waiting = docs.filter((doc) => doc.status === "AWAITING");
  const signed = docs.filter((doc) => doc.status === "SIGNED");

  const row = (doc: Doc) => (
    <li key={doc.id} className={styles.row}>
      <span
        className={`${styles.icon} ${doc.status === "AWAITING" ? styles.iconWaiting : ""}`}
      >
        <Icon name='file' />
      </span>
      <div className={styles.text}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{doc.title}</h3>
          {doc.status === "AWAITING" ? (
            <Pill tone='yellow' dot>
              Waiting for you
            </Pill>
          ) : (
            <Pill tone='lime' dot>
              Signed {doc.signedAt ? fmtDate(doc.signedAt) : ""}
            </Pill>
          )}
        </div>
        <p>{doc.summary}</p>
      </div>
      <button
        type='button'
        className={
          ui.btn +
          " " +
          (doc.status === "AWAITING" ? ui.btn_black : ui.btn_light) +
          " " +
          ui.btnSmall
        }
        onClick={() => show(doc.id)}
      >
        {doc.status === "AWAITING" ? "Read and sign" : "View"}
      </button>
    </li>
  );

  return (
    <>
      {waiting.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.head}>
            <h2 className={styles.heading}>Waiting for your signature</h2>
            <p>Read it through, type your name, and it&apos;s signed.</p>
          </div>
          <ul className={styles.list}>{waiting.map(row)}</ul>
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.heading}>Signed</h2>
          <p>Your signed copies, kept here for good.</p>
        </div>
        {signed.length ? (
          <ul className={styles.list}>{signed.map(row)}</ul>
        ) : (
          <p className={styles.none}>Nothing signed yet.</p>
        )}
      </section>

      <Modal isOpen={Boolean(open)} onClose={() => setOpenId(null)}>
        {open && (
          <div className={ui.modalBody}>
            <div className={styles.modalHead}>
              <span className={ui.monoMuted}>
                {open.status === "SIGNED"
                  ? "Signed document"
                  : "Please read and sign"}
              </span>
              <h2 className={ui.modalTitle}>{open.title}</h2>
              <p className={styles.modalMeta}>
                Sent {fmtDate(open.sentAt)} · Fonts & Footers, Phoenix, Arizona
              </p>
            </div>

            <div className={styles.doc}>
              {open.body.map((block, index) => (
                <section key={block.heading} className={styles.clause}>
                  <h3 className={styles.clauseTitle}>
                    <span className={styles.clauseNum}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {block.heading}
                  </h3>
                  <p>{block.text}</p>
                </section>
              ))}
            </div>

            {open.status === "SIGNED" ? (
              <div className={styles.signature}>
                {justSigned === open.id && (
                  <span className={ui.saved}>
                    <Icon name='check' />
                    Signed. Thank you.
                  </span>
                )}
                <span className={ui.monoMuted}>Signed by</span>
                <span className={styles.signedName}>{open.signedBy}</span>
                <p>{open.signedAt ? fmtDate(open.signedAt) : ""}</p>
              </div>
            ) : (
              <form
                className={styles.signForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  sign();
                }}
              >
                <label className={ui.field}>
                  <span className={ui.label}>Type your full name to sign</span>
                  <input
                    className={ui.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={signer}
                    autoComplete='name'
                  />
                </label>
                <label className={styles.agree}>
                  <input
                    type='checkbox'
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <p>
                    I&apos;ve read this and agree to it on behalf of my
                    business.
                  </p>
                </label>
                <div className={ui.modalActions}>
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_light}`}
                    onClick={() => setOpenId(null)}
                  >
                    Not now
                  </button>
                  <button
                    type='submit'
                    className={`${ui.btn} ${ui.btn_black}`}
                    disabled={!canSign}
                  >
                    Sign document
                    <Icon name='pen' className={ui.btnIcon} />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
