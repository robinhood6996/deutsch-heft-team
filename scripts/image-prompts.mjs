#!/usr/bin/env node
// Writes content/image-prompts.json: one picture prompt per word.
// Pictures help most for concrete nouns, so by default only nouns are included.
// Usage: node scripts/image-prompts.mjs [--all]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { words } = JSON.parse(readFileSync(join(root, "content", "content.json"), "utf8"));
const all = process.argv.includes("--all");

// One shared style so the whole deck looks like one picture book.
const STYLE =
  "Flat vector illustration for a language-learning flashcard. One clear subject, centered, thick soft outlines, " +
  "warm friendly colours, plain cream background, no text, no letters, no numbers, no watermark. Square.";

const ARTICLE_HINT = {
  der: "Small blue accent somewhere in the picture.",
  die: "Small red accent somewhere in the picture.",
  das: "Small green accent somewhere in the picture.",
};

const prompts = {};
for (const w of words) {
  if (w.kind !== "word") continue;
  const m = w.de.match(/^(der|die|das)\s/);
  if (!m && !all) continue;
  const meaning = w.en.replace(/\s*\(.*?\)/g, "").split(/[;/]/)[0].trim();
  const subject = w.en.startsWith("to ") ? `a person who is about ${meaning.replace(/^to /, "to ")}, showing the action clearly` : meaning;
  prompts[w.id] = `${STYLE} Subject: ${subject}. ${m ? ARTICLE_HINT[m[1]] : ""}`.trim();
}
writeFileSync(join(root, "content", "image-prompts.json"), JSON.stringify(prompts, null, 1));
console.log(`${Object.keys(prompts).length} prompts → content/image-prompts.json`);
