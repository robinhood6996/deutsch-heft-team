# Deutsch-Heft Team

Daily German practice for a small study group (1 leader + up to ~10 members). Built with Next.js 15 and Supabase.
ছোট একটা স্টাডি গ্রুপের জন্য দৈনিক জার্মান অনুশীলনের অ্যাপ: মিশন, রিভিশন, পরীক্ষা আর টিম লিডারবোর্ড।

## What it does · কী কী আছে

| | |
|---|---|
| **Daily mission** · দৈনিক মিশন | 4 steps that unlock in order: review → new words → read aloud → mini-quiz (pass mark set by the leader). |
| **Spaced repetition** · রিভিশন | SM-2 style cards (Nochmal / Schwer / Gut / Leicht). A word is *mastered* after a 21-day gap. |
| **Read & speak** · পড়া ও বলা | Text-to-speech with highlighting, tap any word for meaning + Bangla pronunciation, microphone pronunciation score. |
| **Memory aids** · মনে রাখার কৌশল | Article colours (der blue, die red, das green), Bangla keyword mnemonics, one memory story per chapter, AI pictures. |
| **Points & leaderboard** · পয়েন্ট | Daily XP caps, streaks with one free miss a week, team streak, badges, “most improved”. |
| **Team** · টিম | Who finished today, nudges with push notifications (+10 XP each if answered within an hour), activity feed. |
| **Leader dashboard** · লিডার | Today/week table, 4-week heatmap, weak words, plan the daily lesson for many days, CSV export, roles. |
| **Exams** · পরীক্ষা | Leader picks chapters/lessons, question types, time, window, repeat (daily / every 3 days / weekly). Random questions per person, answer keys stay on the server, one-way answering, full screen, tab-switch warnings with auto-submit, optional camera preview. |
| **Reminders** · রিমাইন্ডার | 8 PM Dhaka push to everyone who has not finished. Installable as an app (PWA). |

> Browsers cannot truly block other tabs. The exam *detects* tab switches, focus loss and leaving full screen, and counts them as warnings.
> ব্রাউজার অন্য ট্যাব পুরোপুরি বন্ধ করতে পারে না; অ্যাপ সেটা ধরে ফেলে এবং সতর্কতা গোনে।

## Setup · সেটআপ (about 20 minutes)

### 1. Supabase
1. Create a free project at [supabase.com](https://supabase.com). Choose a region close to Bangladesh (e.g. Singapore).
2. **SQL Editor** → paste and run `supabase/migrations/0001_schema.sql`.
3. **SQL Editor** → paste and run `supabase/seed.sql` (all chapters, lessons, words, stories, mnemonics).
4. **Authentication → Providers → Email**: keep it on. For a private group you can switch off “Confirm email” so people can sign in right away.
5. **Authentication → URL Configuration**: set *Site URL* to your Vercel address (step 3) and add `https://YOUR-APP.vercel.app/auth/callback` to the redirect URLs.
6. **Project Settings → API**: copy the URL, the `anon` key and the `service_role` key.

### 2. Run locally · নিজের কম্পিউটারে চালানো
```bash
cp .env.example .env.local      # fill in the values
npm install
npm run vapid                   # prints the two push keys for .env.local
npm run dev                     # http://localhost:3000
```

### 3. Deploy on Vercel · অনলাইনে তোলা
1. Import this GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Add every variable from `.env.example` under *Environment Variables* (`CRON_SECRET` can be any long random text).
3. Deploy. `vercel.json` already schedules the 8 PM reminder (`0 14 * * *` UTC).

### 4. Start the team · টিম শুরু
1. The leader signs up → **Create team** → shares the 6-letter invite code.
2. The six members sign up → **Join team** with the code.
3. Leader → 🧭 **Leiter** → plan the daily lesson and schedule exams.

## AI pictures for words · শব্দের ছবি
Words show an emoji until a picture is uploaded. To draw pictures with Google Gemini (needs a key from [Google AI Studio](https://aistudio.google.com/apikey)):
```bash
npm run images:prompts              # 274 noun prompts → content/image-prompts.json
npm run images:generate -- --limit 50   # draws 320px WebP files into content/images (restartable)
npm run images:upload               # uploads to Supabase Storage and links them to the words
```
Set `GEMINI_IMAGE_MODEL` if Google renames the image model. Each picture is about 15 KB, so all of them fit easily in the free plan.

## Adding new chapters · নতুন অধ্যায় যোগ করা
*Option A:* edit `content/*.json`, run `npm run seed`, and run the new `supabase/seed.sql` in the SQL Editor.
*Option B:* sign in with an email listed in `ADMIN_EMAILS` → Profil → **Admin** → paste a JSON bundle (`chapters`, `lessons`, `sentences`, `words`, `stories`, `mnemonics`, `images`, all optional).

`content/mnemonics.json` keys can be a word id or the exact German entry (`"das Geld"`), which then applies in every chapter.

## Points · পয়েন্টের নিয়ম
| Action | XP | Daily cap |
|---|---|---|
| Review card remembered | 2 | 60 |
| New word learned | 3 | 45 |
| Quiz ≥ 90% | 20 | once |
| Mission complete | 50 | once |
| 7-day streak | 100 | every 7 days |
| Whole team done | 20 each | once |
| Nudge answered within 1 h | 10 each | — |
| Exam | score % | — |

## Project layout
```
src/app/(app)/        pages behind sign-in: Today, mission, learn, review, team, leaderboard, exams, leader, profile, admin
src/components/       Reader, Review/Learn/Quiz sessions, exercises, story card …
src/lib/              Supabase clients, speech, German helpers, push
supabase/migrations/  schema, row level security, all game logic as SQL functions
supabase/tests/       local scenario test (plain Postgres with an auth stub)
scripts/              seed builder and AI picture scripts
content/              lessons, words, stories, mnemonics
```

Security notes: every write goes through `SECURITY DEFINER` functions or leader-only RLS policies; the service-role key is only used on the server (admin import, cron, push). Exam answer keys live in a table with no policies, so no client can read them.

Run the database test locally (needs Postgres 16):
```bash
createdb dhtest && psql -d dhtest -f supabase/tests/auth_stub.sql -f supabase/migrations/0001_schema.sql -f supabase/seed.sql -f supabase/tests/scenario.sql
```
