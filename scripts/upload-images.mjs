#!/usr/bin/env node
// Uploads content/images/*.webp to the public Supabase Storage bucket "word-images"
// and stores each picture's URL in words.image_url.
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "word-images";

const { data: buckets } = await db.storage.listBuckets();
if (!buckets?.some((b) => b.name === BUCKET)) {
  const { error } = await db.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "200KB", allowedMimeTypes: ["image/webp", "image/png"] });
  if (error) throw error;
  console.log(`Created public bucket ${BUCKET}`);
}

const dir = join(root, "content", "images");
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".webp")) : [];
let n = 0;
for (const f of files) {
  const id = f.replace(/\.webp$/, "");
  const { error } = await db.storage.from(BUCKET).upload(f, readFileSync(join(dir, f)), { contentType: "image/webp", upsert: true });
  if (error) {
    console.error(`✗ ${f}: ${error.message}`);
    continue;
  }
  const publicUrl = db.storage.from(BUCKET).getPublicUrl(f).data.publicUrl;
  const { error: e2 } = await db.from("words").update({ image_url: publicUrl }).eq("id", id);
  if (e2) console.error(`✗ ${id}: ${e2.message}`);
  else n++;
}
console.log(`${n} pictures uploaded and linked.`);
