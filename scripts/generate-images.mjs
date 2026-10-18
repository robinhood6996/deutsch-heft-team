#!/usr/bin/env node
// Draws one picture per word with Google's Gemini image model and saves a small
// 320px WebP in content/images/<word-id>.webp. Already-drawn words are skipped,
// so you can stop and restart any time.
//
// Usage:
//   GEMINI_API_KEY=... node scripts/generate-images.mjs [--limit 50] [--only k2]
// Optional: GEMINI_IMAGE_MODEL (default gemini-2.5-flash-image)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(join(root, ".env.local"));
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
if (!KEY) {
  console.error("Set GEMINI_API_KEY (Google AI Studio → Get API key) in .env.local");
  process.exit(1);
}
const promptsFile = join(root, "content", "image-prompts.json");
if (!existsSync(promptsFile)) {
  console.error("Run `npm run images:prompts` first.");
  process.exit(1);
}
const prompts = JSON.parse(readFileSync(promptsFile, "utf8"));
const outDir = join(root, "content", "images");
mkdirSync(outDir, { recursive: true });

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const limit = Number(arg("--limit") ?? Infinity);
const only = arg("--only");

const todo = Object.entries(prompts).filter(([id]) => (!only || id.startsWith(only)) && !existsSync(join(outDir, `${id}.webp`)));
console.log(`${todo.length} pictures to draw with ${MODEL}`);

let done = 0;
for (const [id, prompt] of todo.slice(0, limit)) {
  try {
    const png = await draw(prompt);
    await sharp(png).resize(320, 320, { fit: "cover" }).webp({ quality: 78 }).toFile(join(outDir, `${id}.webp`));
    done++;
    console.log(`✓ ${id} (${done})`);
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`);
    if (/quota|429|RESOURCE_EXHAUSTED/i.test(e.message)) {
      console.error("Rate limit reached. Wait a while and run the script again; finished pictures are kept.");
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1500)); // stay gentle with the free tier
}
console.log(`Done: ${done} new pictures in content/images. Next: npm run images:upload`);

async function draw(text) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${j.error?.status ?? ""} ${j.error?.message ?? ""}`);
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data || p.inline_data?.data);
  if (!part) throw new Error("No image in the answer (the prompt may have been blocked)");
  return Buffer.from((part.inlineData ?? part.inline_data).data, "base64");
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
