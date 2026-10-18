"use client";
import { useMemo, useState } from "react";
import type { Exercise } from "@/lib/types";
import { shuffle } from "@/lib/german";
import { SpeakButton, cheer } from "./ui";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Grammar exercises: fill in the blank, build the sentence from tiles, choose the right option. */
export function Exercises({ items }: { items: Exercise[] }) {
  const sections = useMemo(() => {
    const m = new Map<string, Exercise[]>();
    items.forEach((e) => (m.has(e.sec) ? m.get(e.sec)!.push(e) : m.set(e.sec, [e])));
    return [...m.entries()];
  }, [items]);
  return (
    <div className="flex flex-col gap-4">
      {sections.map(([sec, list]) => (
        <section key={sec}>
          <h3 className="mb-2 text-lg font-extrabold">{sec}</h3>
          <div className="flex flex-col gap-2">
            {list.map((e, i) => (
              <Item key={i} e={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Item({ e }: { e: Exercise }) {
  const [val, setVal] = useState("");
  const [tiles, setTiles] = useState<string[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const bank = useMemo(() => (e.t === "build" ? shuffle(e.a.replace(/[.!?]$/, "").split(" ")) : []), [e]);
  const answer = e.t === "build" ? tiles.join(" ") : val;
  const check = (a = answer) => setChecked(norm(a) === norm(e.a));
  const full = e.full ?? e.a;

  return (
    <div className={`card py-3 ${checked === true ? "border-green" : checked === false ? "border-red" : ""}`}>
      {e.q && (
        <p className="font-display text-lg font-semibold" lang="de">
          {e.q}
        </p>
      )}
      <p className="text-sm text-muted">
        {e.en} · <span className="bn">{e.bn}</span>
      </p>
      {e.note && <p className="text-sm text-muted">💡 {e.note}</p>}

      {e.opts ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {e.opts.map((o) => (
            <button
              key={o}
              disabled={checked !== null}
              onClick={() => {
                setVal(o);
                check(o);
              }}
              className={`rounded-lg border-2 px-3 py-1.5 font-bold ${checked !== null && norm(o) === norm(e.a) ? "border-green bg-green-soft" : val === o ? "border-red bg-red-soft" : "border-line"}`}
            >
              {o}
            </button>
          ))}
        </div>
      ) : e.t === "build" ? (
        <div className="mt-2">
          <div className="min-h-11 rounded-lg border-2 border-dashed border-line p-1.5">
            {tiles.map((t, i) => (
              <button key={i} className="m-0.5 rounded-md bg-blue-soft px-2 py-1 font-bold text-blue" onClick={() => checked === null && setTiles(tiles.filter((_, j) => j !== i))}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {bank.map((t, i) => {
              const used = tiles.filter((x) => x === t).length >= bank.slice(0, i + 1).filter((x) => x === t).length;
              return (
                <button key={i} disabled={used || checked !== null} onClick={() => setTiles([...tiles, t])} className="rounded-md border border-line bg-surface-2 px-2 py-1 font-bold disabled:opacity-30">
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <input
          className="input mt-2"
          value={val}
          disabled={checked !== null}
          onChange={(ev) => setVal(ev.target.value)}
          onKeyDown={(ev) => ev.key === "Enter" && val && check()}
          placeholder="Antwort…"
          lang="de"
          autoCapitalize="off"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {checked === null && !e.opts && (
          <button className="btn px-3 py-1.5 text-sm" disabled={!answer} onClick={() => check()}>
            Prüfen
          </button>
        )}
        {checked !== null && (
          <>
            <span className={`hand text-2xl ${checked ? "text-green" : "text-red"}`}>{checked ? cheer() : "Fast!"}</span>
            <span className="font-semibold" lang="de">
              {full}
            </span>
            <SpeakButton text={full} />
            <button
              className="btn-ghost ml-auto px-3 py-1 text-sm"
              onClick={() => {
                setChecked(null);
                setVal("");
                setTiles([]);
              }}
            >
              Nochmal
            </button>
          </>
        )}
      </div>
    </div>
  );
}
