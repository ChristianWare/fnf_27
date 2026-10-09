"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";
import Icon from "../icons";
import { Progress, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import { useAction } from "../useAction";
import { upload } from "../upload";
import styles from "./Assets.module.css";
import {
  addAssets,
  assetUploadTicket,
  relabelAsset,
  removeAsset,
} from "@/app/dashboard/actions";
import { assetNeeds } from "@/lib/dashboard/helpers";
import { fmtShort, thumb } from "@/lib/dashboard/format";
import type { Asset, AssetLabel } from "@/lib/dashboard/types";

const LABELS: AssetLabel[] = [
  "Logo",
  "Fleet photo",
  "Team photo",
  "Brand guide",
  "Other",
];

const tips = [
  "Shoot in open shade or just after sunrise, never in harsh midday sun.",
  "Landscape, with the whole vehicle in the frame and a clean background.",
  "One inside each vehicle: the seats, the lights, the details riders pay for.",
  "Real people beat stock: you or a chauffeur by the car, smiling.",
];

const MAX_BYTES = 25_000_000;

// A first guess at what a file is, from its name and type.
const guessLabel = (file: File): AssetLabel => {
  if (/logo/i.test(file.name)) return "Logo";
  if (file.type === "application/pdf") return "Brand guide";
  if (file.type.startsWith("image/")) return "Fleet photo";
  return "Other";
};

export default function Assets({ initial }: { initial: Asset[] }) {
  const toast = useToast();
  const { run } = useAction();
  const [assets, setAssets] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const needs = assetNeeds(assets);
  const required = needs.filter((n) => n.need > 0);
  const have = required.reduce((sum, n) => sum + Math.min(n.have, n.need), 0);
  const need = required.reduce((sum, n) => sum + n.need, 0);

  const add = async (files: FileList | null) => {
    if (!files?.length || uploading) return;
    const chosen = Array.from(files).slice(0, 20);
    const tooBig = chosen.filter((file) => file.size > MAX_BYTES);
    const list = chosen.filter((file) => file.size <= MAX_BYTES);
    if (tooBig.length) {
      toast(`${tooBig[0].name} is over 25 MB`, {
        tone: "error",
        detail: "Send big files by email, or export a smaller copy.",
      });
    }
    if (!list.length) return;

    setUploading(list.length);
    try {
      const ticket = await assetUploadTicket();
      if (!ticket.ok) {
        toast(ticket.error, { tone: "error" });
        return;
      }
      const uploaded = [];
      for (const file of list) {
        try {
          uploaded.push({
            ...(await upload(ticket.data!, file)),
            label: guessLabel(file),
          });
        } catch (error) {
          toast((error as Error).message, { tone: "error" });
        }
      }
      if (!uploaded.length) return;
      const saved = await addAssets(uploaded);
      if (!saved.ok) {
        toast(saved.error, { tone: "error" });
        return;
      }
      const added = saved.data ?? [];
      setAssets((current) => [...current, ...added]);
      toast(
        added.length === 1
          ? `Added ${added[0].name}`
          : `Added ${added.length} files`,
        { detail: "Check the label on each one so we know what it is." },
      );
    } catch {
      toast("The upload didn't finish. Check your connection and try again.", {
        tone: "error",
      });
    } finally {
      setUploading(0);
    }
  };

  const remove = (asset: Asset) =>
    run(
      () => removeAsset(asset.id),
      () => {
        setAssets((list) => list.filter((item) => item.id !== asset.id));
        return { message: `Removed ${asset.name}`, tone: "info" };
      },
    );

  const relabel = (id: string, label: AssetLabel) => {
    setAssets((list) =>
      list.map((item) => (item.id === id ? { ...item, label } : item)),
    );
    run(() => relabelAsset(id, label));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <section className={styles.panel}>
          <label
            className={`${styles.drop} ${dragging ? styles.dragging : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              ref={input}
              type='file'
              multiple
              accept='image/*,.pdf,.svg,.ai,.eps'
              className={ui.srOnly}
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
            <span className={styles.dropIcon}>
              <Icon name='upload' />
            </span>
            <span className={styles.dropTitle}>
              {uploading ? (
                `Uploading ${uploading} file${uploading === 1 ? "" : "s"}…`
              ) : (
                <>
                  Drop files here, or <u>choose files</u>
                </>
              )}
            </span>
            <p>
              Photos, logos and brand guides. JPG, PNG, SVG or PDF, up to 25 MB
              each.
            </p>
          </label>

          <div className={styles.listHead}>
            <h2 className={styles.heading}>Your files</h2>
            <span className={ui.monoMuted}>{assets.length} files</span>
          </div>

          {assets.length ? (
            <ul className={styles.files}>
              {assets.map((asset) => (
                <li key={asset.id} className={styles.file}>
                  <div className={styles.thumb}>
                    {asset.src ? (
                      <Image
                        src={thumb(asset.src)}
                        alt={asset.name}
                        fill
                        sizes='(max-width: 768px) 50vw, 240px'
                        className={styles.thumbImg}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.ext}>
                        {asset.name.split(".").pop()?.toUpperCase()}
                      </span>
                    )}
                    <button
                      type='button'
                      className={styles.remove}
                      onClick={() => remove(asset)}
                      aria-label={`Remove ${asset.name}`}
                    >
                      <Icon name='trash' />
                    </button>
                  </div>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName} title={asset.name}>
                      {asset.name}
                    </p>
                    <span className={ui.monoMuted}>
                      {asset.size} · {fmtShort(asset.addedAt)}
                    </span>
                    <select
                      className={`${ui.select} ${styles.select}`}
                      value={asset.label}
                      onChange={(e) =>
                        relabel(asset.id, e.target.value as AssetLabel)
                      }
                      aria-label={`What ${asset.name} is`}
                    >
                      {LABELS.map((label) => (
                        <option key={label}>{label}</option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>No files yet.</p>
          )}
        </section>
      </div>

      <div className={styles.side}>
        <section className={styles.panel}>
          <div className={styles.needHead}>
            <h2 className={styles.heading}>What we need</h2>
            <span className={ui.monoMuted}>
              {have} of {need}
            </span>
          </div>
          <Progress
            value={have}
            max={need}
            label='Assets we need'
            tone='lime'
          />
          <ul className={styles.needs}>
            {needs.map((item) => {
              const done = item.need > 0 && item.have >= item.need;
              return (
                <li key={item.id} className={styles.need}>
                  <span
                    className={`${styles.check} ${done ? styles.checkDone : ""}`}
                  >
                    {done && <Icon name='check' />}
                  </span>
                  <div className={styles.needText}>
                    <div className={styles.needTop}>
                      <span className={styles.needLabel}>{item.label}</span>
                      <span className={ui.monoMuted}>
                        {item.need > 0
                          ? `${Math.min(item.have, item.need)}/${item.need}`
                          : item.have
                            ? "Added"
                            : "Optional"}
                      </span>
                    </div>
                    <p>{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${styles.panel} ${styles.tips}`}>
          <h2 className={styles.heading}>Photos that book rides</h2>
          <ol className={styles.tipList}>
            {tips.map((tip, index) => (
              <li key={tip} className={styles.tip}>
                <span className={styles.tipNum}>{index + 1}</span>
                <p>{tip}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
