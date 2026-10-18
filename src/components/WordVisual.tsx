import type { Word } from "@/lib/types";

/** Picture for a word: AI image when uploaded, otherwise emoji, otherwise the first letter. */
export function WordVisual({ word, size = 96 }: { word: Word; size?: number }) {
  if (word.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={word.image_url} alt="" width={size} height={size} className="rounded-xl object-cover" style={{ width: size, height: size }} />;
  }
  const letter = word.de.replace(/^(der|die|das)\s+/, "").charAt(0).toUpperCase();
  return (
    <div
      aria-hidden
      className="grid place-items-center rounded-xl bg-surface-2 font-display font-extrabold text-muted"
      style={{ width: size, height: size, fontSize: word.emoji ? size * 0.55 : size * 0.45 }}
    >
      {word.emoji || letter}
    </div>
  );
}
