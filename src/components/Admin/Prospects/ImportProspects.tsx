"use client";

// Bringing in operators to call: a CSV, a Markdown table, a paste from a
// spreadsheet, or Chrome's bookmarks export (pick the folder). Anyone
// already on a list, or already a client, is skipped.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { btn, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { addProspect, importList } from "@/app/admin/prospects/actions";
import {
  isBookmarks,
  parseBookmarks,
  parseProspects,
  type BookmarkFolder,
  type ProspectInput,
} from "@/lib/prospects/parse";
import styles from "./ImportProspects.module.css";

// Read here in the browser: a bookmarks export can be several megabytes,
// and only the rows go to the server.
type Preview =
  | { kind: "rows"; rows: ProspectInput[] }
  | { kind: "bookmarks"; folders: BookmarkFolder[] }
  | { kind: "none" };

function read(text: string, name: string): Preview {
  if (isBookmarks(text)) {
    const folders = parseBookmarks(text).filter((f) => f.items.length);
    return folders.length ? { kind: "bookmarks", folders } : { kind: "none" };
  }
  const rows = parseProspects(text, name);
  return rows.length ? { kind: "rows", rows: rows.slice(0, 2000) } : { kind: "none" };
}

const listName = (file: string) =>
  file
    .replace(/\.[a-z]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60);

export default function ImportProspects({
  lists,
  onDone,
}: {
  lists: string[];
  onDone: () => void;
}) {
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [list, setList] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [folders, setFolders] = useState<string[]>([]);

  const reset = () => {
    setPreview(null);
    setFolders([]);
  };

  const check = (src = text, file = name) => {
    const p = read(src, file);
    setPreview(p);
    if (p.kind === "bookmarks") {
      const guess = p.folders.find((f) => /prospect|operator|limo|lead|call/i.test(f.path));
      setFolders(guess ? [guess.path] : []);
      if (!list) setList("Chrome bookmarks");
    }
  };

  const chosen = (): ProspectInput[] =>
    preview?.kind === "rows"
      ? preview.rows
      : preview?.kind === "bookmarks"
        ? preview.folders
            .filter((f) => folders.includes(f.path))
            .flatMap((f) =>
              f.items.map((p) => ({ ...p, tags: [...p.tags, f.path.split(" / ").at(-1)!] })),
            )
        : [];

  return (
    <div className={styles.wrap}>
      <section className={styles.block}>
        <h2 className={styles.title}>Import a list</h2>
        <p className={styles.help}>
          A CSV or a paste from Google Sheets or Excel, with a header row:
          Business, Phone, Website, City, State, and any of Contact, Email,
          Rating, Reviews, Tags, Notes. A Markdown table works too, and so
          does Chrome&apos;s bookmarks export (Bookmark manager → ⋮ → Export
          bookmarks).
        </p>
        <div className={styles.row}>
          <label className={btn("light")}>
            <Icon name='upload' className={styles.icon} />
            Choose a file
            <input
              type='file'
              accept='.csv,.tsv,.txt,.md,.html,.htm,text/csv,text/markdown,text/html'
              className={ui.srOnly}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const src = await f.text();
                setText(src);
                setName(f.name);
                if (!list) setList(listName(f.name));
                reset();
                check(src, f.name);
              }}
            />
          </label>
          {name && <span className={styles.file}>{name}</span>}
        </div>
        <label className={ui.field}>
          <span className={ui.label}>Or paste it here</span>
          <textarea
            className={`${ui.textarea} ${styles.paste}`}
            rows={8}
            value={text.length > 20000 ? `${text.slice(0, 20000)}\n…` : text}
            readOnly={text.length > 20000}
            placeholder={"Business,Phone,Website,City,State\nAZ Limo,480-725-2427,azlimo.com,Phoenix,AZ"}
            onChange={(e) => {
              setText(e.target.value);
              setName("");
              reset();
            }}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>List name</span>
          <input
            className={ui.input}
            value={list}
            list='prospect-lists'
            placeholder='e.g. AZ Landscape'
            onChange={(e) => setList(e.target.value)}
          />
          <datalist id='prospect-lists'>
            {lists.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
        {(!preview || preview.kind === "none") && (
          <div className={styles.row}>
            <button type='button' className={btn("black")} disabled={!text.trim()} onClick={() => check()}>
              Check it
            </button>
          </div>
        )}

        {preview?.kind === "rows" && (
          <div className={styles.preview}>
            <p className={styles.found}>
              {preview.rows.length} operator{preview.rows.length === 1 ? "" : "s"} found. Here are the first few:
            </p>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Phone</th>
                    <th>Website</th>
                    <th>City</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 6).map((r, i) => (
                    <tr key={i}>
                      <td>{r.business}</td>
                      <td>{r.phone || "—"}</td>
                      <td>{r.website || "—"}</td>
                      <td>{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {preview?.kind === "bookmarks" && (
          <div className={styles.preview}>
            <p className={styles.found}>Which folders are your prospects?</p>
            <div className={styles.folders}>
              {preview.folders.map((f) => (
                <label key={f.path} className={styles.folder}>
                  <input
                    type='checkbox'
                    checked={folders.includes(f.path)}
                    onChange={(e) =>
                      setFolders((had) =>
                        e.target.checked ? [...had, f.path] : had.filter((x) => x !== f.path),
                      )
                    }
                  />
                  <span>{f.path}</span>
                  <span className={styles.folderCount}>{f.items.length}</span>
                </label>
              ))}
            </div>
            <p className={styles.help}>
              Bookmarks only have a name and a link, so add phone numbers as you
              go (or run their audit, which finds their Google listing).
            </p>
          </div>
        )}

        {preview?.kind === "none" && (
          <p className={styles.problem} role='alert'>
            No operators found. Each row needs a business name, under a
            header row like Business, Phone, Website, City.
          </p>
        )}

        {preview && preview.kind !== "none" && (
          <div className={styles.row}>
            <button
              type='button'
              className={btn("black")}
              disabled={pending || (preview.kind === "bookmarks" && !folders.length)}
              onClick={() =>
                run(
                  () => importList({ rows: chosen(), list }),
                  (r) => {
                    setText("");
                    setName("");
                    reset();
                    onDone();
                    return {
                      message: `${r?.added ?? 0} added`,
                      detail: [
                        r?.merged ? `${r.merged} filled in` : "",
                        r?.skipped ? `${r.skipped} already here or a client` : "",
                      ]
                        .filter(Boolean)
                        .join(", "),
                    };
                  },
                )
              }
            >
              Import {chosen().length || ""}
            </button>
            <button type='button' className={btn("light")} onClick={reset}>
              Back
            </button>
          </div>
        )}
      </section>

      <AddOne />
    </div>
  );
}

function AddOne() {
  const { run, pending } = useAction();
  const [key, setKey] = useState(0);
  return (
    <section className={styles.block}>
      <h2 className={styles.title}>Add one</h2>
      <form
        key={key}
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const g = (k: string) => String(f.get(k) ?? "");
          run(
            () =>
              addProspect({
                business: g("business"),
                contactName: g("contact"),
                phone: g("phone"),
                email: g("email"),
                website: g("website"),
                city: g("city"),
                state: g("state"),
              }),
            () => {
              setKey((k) => k + 1);
              return { message: "Added" };
            },
          );
        }}
      >
        <div className={styles.grid}>
          {(
            [
              ["business", "Business"],
              ["contact", "Contact"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["website", "Website"],
              ["city", "City"],
              ["state", "State"],
            ] as const
          ).map(([n, label]) => (
            <label key={n} className={ui.field}>
              <span className={ui.label}>{label}</span>
              <input
                className={ui.input}
                name={n}
                defaultValue={n === "state" ? "AZ" : undefined}
                required={n === "business"}
              />
            </label>
          ))}
        </div>
        <div className={styles.row}>
          <button type='submit' className={btn("black")} disabled={pending}>
            Add
          </button>
        </div>
      </form>
    </section>
  );
}
