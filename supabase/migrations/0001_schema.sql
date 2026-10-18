-- =====================================================================
-- Deutsch-Heft Team · database schema
-- Tables, row level security and the functions the app calls (RPC).
-- All writes that award XP or change learning state go through
-- SECURITY DEFINER functions so rules (caps, order, deadlines) hold.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Time: the team lives in Bangladesh, so "today" means Dhaka time.
-- ---------------------------------------------------------------------
create or replace function public.app_tz() returns text
language sql immutable as $$ select 'Asia/Dhaka'::text $$;

create or replace function public.app_today() returns date
language sql stable as $$ select (now() at time zone public.app_tz())::date $$;

-- ---------------------------------------------------------------------
-- People and teams
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_emoji text not null default '🙂',
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 60),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  focus_chapter_id text,
  weekly_goal_words int not null default 300,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'leader')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create unique index team_members_one_team on public.team_members(user_id);

-- ---------------------------------------------------------------------
-- Content (written by the admin import with the service role key)
-- ---------------------------------------------------------------------
create table public.chapters (
  id text primary key,
  kind text not null check (kind in ('course', 'vocab')),
  title text not null,
  subtitle text not null default '',
  bn_title text not null default '',
  sort int not null default 0,
  story jsonb
);

create table public.lessons (
  id text primary key,
  chapter_id text not null references public.chapters(id) on delete cascade,
  num int not null,
  title text not null,
  en_title text not null default '',
  bn_title text not null default '',
  kind text not null check (kind in ('phrases', 'text', 'numbers')),
  sort int not null default 0,
  notes_html text not null default '',
  exercises jsonb
);

create table public.sentences (
  id bigserial primary key,
  lesson_id text not null references public.lessons(id) on delete cascade,
  idx int not null,
  de text not null,
  en text not null default '',
  bn text not null default '',
  say text not null default '',
  emoji text not null default '',
  tip text not null default '',
  grp text not null default '',
  is_list boolean not null default false,
  unique (lesson_id, idx)
);

create table public.words (
  id text primary key,
  chapter_id text not null references public.chapters(id) on delete cascade,
  kind text not null default 'word' check (kind in ('word', 'phrase')),
  de text not null,
  en text not null,
  bn text not null default '',
  say text not null default '',
  topic text not null default '',
  emoji text not null default '',
  tip text not null default '',
  mnemonic text not null default '',
  image_url text not null default '',
  sort int not null default 0
);

create table public.word_lessons (
  word_id text not null references public.words(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  primary key (word_id, lesson_id)
);
create index word_lessons_lesson on public.word_lessons(lesson_id);

-- ---------------------------------------------------------------------
-- Learning state
-- ---------------------------------------------------------------------
create table public.user_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null references public.words(id) on delete cascade,
  due date not null default public.app_today(),
  interval_days int not null default 0,
  ease real not null default 2.5,
  reps int not null default 0,
  lapses int not null default 0,
  correct int not null default 0,
  wrong int not null default 0,
  learned_at timestamptz not null default now(),
  last_reviewed timestamptz,
  primary key (user_id, word_id)
);
create index user_words_due on public.user_words(user_id, due);

create table public.activity_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  kind text not null,
  xp int not null default 0,
  correct boolean,
  word_id text,
  meta jsonb not null default '{}'::jsonb,
  day date not null default public.app_today(),
  created_at timestamptz not null default now()
);
create index activity_user_day on public.activity_log(user_id, day);
create index activity_team_day on public.activity_log(team_id, day);

-- ---------------------------------------------------------------------
-- Daily missions
-- ---------------------------------------------------------------------
create table public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  day date not null,
  lesson_id text references public.lessons(id) on delete set null,
  new_words int not null default 8 check (new_words between 0 and 30),
  review_cap int not null default 30 check (review_cap between 0 and 100),
  quiz_size int not null default 10 check (quiz_size between 5 and 30),
  pass_pct int not null default 70 check (pass_pct between 0 and 100),
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  unique (team_id, day)
);

create table public.mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  team_id uuid references public.teams(id) on delete cascade,
  review_done boolean not null default false,
  learn_done boolean not null default false,
  read_done boolean not null default false,
  quiz_done boolean not null default false,
  quiz_pct int,
  seconds int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------
-- Social: nudges, badges, push subscriptions
-- ---------------------------------------------------------------------
create table public.nudges (
  id bigserial primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  message text not null default '',
  day date not null default public.app_today(),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  rewarded boolean not null default false,
  unique (from_user, to_user, day)
);

create table public.badges (
  id text primary key,
  emoji text not null,
  name text not null,
  bn text not null,
  description text not null
);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Exams
-- ---------------------------------------------------------------------
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  scope jsonb not null default '{"lessons": [], "chapters": []}'::jsonb,
  question_types text[] not null default array['meaning', 'german', 'article', 'listen'],
  num_questions int not null default 20 check (num_questions between 5 and 60),
  seconds_per_question int not null default 25 check (seconds_per_question between 10 and 120),
  duration_min int not null default 15 check (duration_min between 3 and 120),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  max_violations int not null default 3 check (max_violations between 1 and 10),
  require_fullscreen boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  score int,
  total int,
  violations int not null default 0,
  auto_submitted boolean not null default false,
  unique (exam_id, user_id)
);

-- Answer keys live apart and have no policies: nobody can read them directly.
create table public.exam_keys (
  attempt_id uuid primary key references public.exam_attempts(id) on delete cascade,
  keys jsonb not null
);

create table public.proctor_events (
  id bigserial primary key,
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Helper functions
-- =====================================================================
create or replace function public.my_team_id() returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from public.team_members where user_id = auth.uid()
$$;

create or replace function public.is_leader_of(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members
                 where team_id = t and user_id = auth.uid() and role = 'leader')
$$;

create or replace function public.shares_team_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members a
                 join public.team_members b on a.team_id = b.team_id
                 where a.user_id = auth.uid() and b.user_id = other)
$$;

-- New sign-ups get a profile row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- XP earned today for one kind of activity (used to enforce daily caps).
create or replace function public.xp_today(p_user uuid, p_kind text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(xp), 0)::int from public.activity_log
  where user_id = p_user and kind = p_kind and day = public.app_today()
$$;

create or replace function public.log_activity(p_kind text, p_xp int, p_correct boolean default null,
                                               p_word text default null, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity_log (user_id, team_id, kind, xp, correct, word_id, meta)
  values (auth.uid(), public.my_team_id(), p_kind, greatest(p_xp, 0), p_correct, p_word, coalesce(p_meta, '{}'::jsonb));
end $$;
revoke execute on function public.log_activity(text, int, boolean, text, jsonb) from public, anon, authenticated;

create or replace function public.award_badge(p_user uuid, p_badge text) returns boolean
language plpgsql security definer set search_path = public as $$
declare inserted int;
begin
  insert into public.user_badges (user_id, badge_id) values (p_user, p_badge) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    insert into public.activity_log (user_id, team_id, kind, xp, meta)
    values (p_user, (select team_id from public.team_members where user_id = p_user), 'badge', 0,
            (select jsonb_build_object('badge', b.id, 'emoji', b.emoji, 'name', b.name) from public.badges b where b.id = p_badge));
  end if;
  return inserted > 0;
end $$;
revoke execute on function public.award_badge(uuid, text) from public, anon, authenticated;

-- =====================================================================
-- Teams
-- =====================================================================
create or replace function public.create_team(p_name text) returns public.teams
language plpgsql security definer set search_path = public as $$
declare t public.teams;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.team_members where user_id = auth.uid()) then
    raise exception 'You are already in a team';
  end if;
  insert into public.teams (name, created_by) values (trim(p_name), auth.uid()) returning * into t;
  insert into public.team_members (team_id, user_id, role) values (t.id, auth.uid(), 'leader');
  return t;
end $$;

create or replace function public.join_team(p_code text) returns public.teams
language plpgsql security definer set search_path = public as $$
declare t public.teams;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.team_members where user_id = auth.uid()) then
    raise exception 'You are already in a team';
  end if;
  select * into t from public.teams where invite_code = upper(trim(p_code));
  if not found then raise exception 'No team has this invite code'; end if;
  insert into public.team_members (team_id, user_id, role) values (t.id, auth.uid(), 'member');
  return t;
end $$;

create or replace function public.set_member_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := public.my_team_id();
begin
  if not public.is_leader_of(t) then raise exception 'Only the team leader can change roles'; end if;
  if p_role not in ('member', 'leader') then raise exception 'Unknown role'; end if;
  update public.team_members set role = p_role where team_id = t and user_id = p_user;
end $$;

-- =====================================================================
-- Spaced repetition
-- Grades: 0 = forgot, 1 = hard, 2 = good, 3 = easy
-- =====================================================================
create or replace function public.learn_words(p_words text[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; w text; cap_left int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  foreach w in array coalesce(p_words, array[]::text[]) loop
    insert into public.user_words (user_id, word_id, due, interval_days, reps)
    values (auth.uid(), w, public.app_today() + 1, 1, 1)
    on conflict do nothing;
    if found then n := n + 1; end if;
  end loop;
  if n > 0 then
    cap_left := greatest(0, 45 - public.xp_today(auth.uid(), 'learn'));
    perform public.log_activity('learn', least(n * 3, cap_left), null, null, jsonb_build_object('count', n));
  end if;
  return n;
end $$;

create or replace function public.review_word(p_word text, p_grade int) returns public.user_words
language plpgsql security definer set search_path = public as $$
declare uw public.user_words; new_int int; cap_left int; today date := public.app_today();
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_grade not between 0 and 3 then raise exception 'grade must be 0..3'; end if;

  insert into public.user_words (user_id, word_id) values (auth.uid(), p_word) on conflict do nothing;
  select * into uw from public.user_words where user_id = auth.uid() and word_id = p_word for update;

  if p_grade = 0 then
    uw.lapses := uw.lapses + 1; uw.reps := 0; uw.wrong := uw.wrong + 1;
    uw.ease := greatest(1.3, uw.ease - 0.2);
    new_int := 0;
  else
    uw.correct := uw.correct + 1;
    if p_grade = 1 then
      new_int := greatest(1, round(greatest(uw.interval_days, 1) * 1.2)::int);
      uw.ease := greatest(1.3, uw.ease - 0.15);
    elsif p_grade = 2 then
      new_int := case uw.reps when 0 then 1 when 1 then 3 else round(greatest(uw.interval_days, 1) * uw.ease)::int end;
    else
      new_int := case uw.reps when 0 then 3 when 1 then 5 else round(greatest(uw.interval_days, 1) * uw.ease * 1.3)::int end;
      uw.ease := least(3.0, uw.ease + 0.15);
    end if;
    uw.reps := uw.reps + 1;
  end if;

  update public.user_words
     set due = today + new_int, interval_days = new_int, ease = uw.ease, reps = uw.reps,
         lapses = uw.lapses, correct = uw.correct, wrong = uw.wrong, last_reviewed = now()
   where user_id = auth.uid() and word_id = p_word
  returning * into uw;

  cap_left := greatest(0, 60 - public.xp_today(auth.uid(), 'review'));
  perform public.log_activity('review', case when p_grade > 0 then least(2, cap_left) else 0 end,
                              p_grade > 0, p_word, jsonb_build_object('grade', p_grade));

  if (select count(*) from public.user_words where user_id = auth.uid() and interval_days >= 21) >= 100 then
    perform public.award_badge(auth.uid(), 'words_100');
  end if;
  if (select count(*) from public.user_words where user_id = auth.uid() and interval_days >= 21) >= 300 then
    perform public.award_badge(auth.uid(), 'words_300');
  end if;
  return uw;
end $$;

create or replace function public.record_quiz(p_context text, p_total int, p_correct int) returns int
language plpgsql security definer set search_path = public as $$
declare bonus int := 0; pct int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_total <= 0 or p_correct < 0 or p_correct > p_total then raise exception 'bad quiz result'; end if;
  pct := round(p_correct * 100.0 / p_total);
  if pct >= 90 and public.xp_today(auth.uid(), 'quiz') < 20 then bonus := 20; end if;
  perform public.log_activity('quiz', bonus, null, null,
    jsonb_build_object('context', p_context, 'total', p_total, 'correct', p_correct, 'pct', pct));
  return pct;
end $$;

create or replace function public.mark_read(p_lesson text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform public.log_activity('read', 0, null, null, jsonb_build_object('lesson', p_lesson));
end $$;

-- =====================================================================
-- Streaks
-- A personal streak counts consecutive days with a completed mission.
-- One missed day per ISO week is forgiven automatically (streak freeze).
-- =====================================================================
create or replace function public.user_streak(p_user uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare d date := public.app_today(); streak int := 0; used_weeks text[] := array[]::text[]; wk text; i int;
begin
  if not exists (select 1 from public.mission_progress where user_id = p_user and day = d and completed_at is not null) then
    d := d - 1;  -- today is not over yet
  end if;
  for i in 1..400 loop
    if exists (select 1 from public.mission_progress where user_id = p_user and day = d and completed_at is not null) then
      streak := streak + 1;
    else
      wk := to_char(d, 'IYYY-IW');
      if streak > 0 and not (wk = any(used_weeks))
         and exists (select 1 from public.mission_progress where user_id = p_user and day = d - 1 and completed_at is not null) then
        used_weeks := used_weeks || wk;   -- freeze bridges this single day
      else
        exit;
      end if;
    end if;
    d := d - 1;
  end loop;
  return streak;
end $$;

-- Team streak: consecutive days on which every member (who had joined by then) finished.
create or replace function public.team_streak(p_team uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare d date := public.app_today(); streak int := 0; members int; done int; i int;
begin
  for i in 1..400 loop
    select count(*) into members from public.team_members
      where team_id = p_team and (joined_at at time zone public.app_tz())::date <= d;
    select count(*) into done from public.mission_progress mp
      join public.team_members tm on tm.user_id = mp.user_id and tm.team_id = p_team
      where mp.day = d and mp.completed_at is not null
        and (tm.joined_at at time zone public.app_tz())::date <= d;
    if members > 0 and done >= members then
      streak := streak + 1;
    elsif d = public.app_today() then
      null;  -- today still running: don't break the streak yet
    else
      exit;
    end if;
    d := d - 1;
  end loop;
  return streak;
end $$;

-- =====================================================================
-- Daily missions
-- =====================================================================

-- The lesson whose words this user should learn next.
create or replace function public.next_lesson_for(p_user uuid, p_chapter text default null) returns text
language sql stable security definer set search_path = public as $$
  select l.id from public.lessons l
  join public.chapters c on c.id = l.chapter_id
  where (p_chapter is null or l.chapter_id = p_chapter)
    and exists (select 1 from public.word_lessons wl
                where wl.lesson_id = l.id
                  and not exists (select 1 from public.user_words uw where uw.user_id = p_user and uw.word_id = wl.word_id
                                    and (uw.learned_at at time zone public.app_tz())::date < public.app_today()))
  order by c.sort, l.sort
  limit 1
$$;

create or replace function public.get_today_mission() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t uuid := public.my_team_id();
  today date := public.app_today();
  m public.daily_missions;
  p public.mission_progress;
  lesson text;
  focus text;
  new_ids text[];
  due_ids text[];
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if t is null then return null; end if;

  select * into m from public.daily_missions where team_id = t and day = today;
  if not found then
    insert into public.daily_missions (team_id, day) values (t, today)
    on conflict (team_id, day) do nothing;
    select * into m from public.daily_missions where team_id = t and day = today;
  end if;

  insert into public.mission_progress (user_id, day, team_id) values (auth.uid(), today, t)
  on conflict do nothing;
  select * into p from public.mission_progress where user_id = auth.uid() and day = today;

  -- Which lesson the new words come from (words first learned today still count as
  -- unlearned here, so the choice stays stable for the whole day):
  -- the leader's lesson while it still has unlearned words, then the next lesson
  -- in that chapter, then the team's focus chapter, then anything unlearned.
  select focus_chapter_id into focus from public.teams where id = t;
  lesson := null;
  if m.lesson_id is not null then
    if exists (select 1 from public.word_lessons wl where wl.lesson_id = m.lesson_id
               and not exists (select 1 from public.user_words uw where uw.user_id = auth.uid() and uw.word_id = wl.word_id
                               and (uw.learned_at at time zone public.app_tz())::date < today)) then
      lesson := m.lesson_id;
    else
      lesson := public.next_lesson_for(auth.uid(), (select chapter_id from public.lessons where id = m.lesson_id));
    end if;
  end if;
  if lesson is null then
    lesson := coalesce(public.next_lesson_for(auth.uid(), focus), public.next_lesson_for(auth.uid(), null));
  end if;

  select array_agg(id) into new_ids from (
    select w.id from public.words w
    join public.word_lessons wl on wl.word_id = w.id and wl.lesson_id = lesson
    left join public.user_words uw on uw.user_id = auth.uid() and uw.word_id = w.id
    where uw.word_id is null or (uw.learned_at at time zone public.app_tz())::date = today
    -- words already learned today stay "today's words", so the quiz still covers them
    order by (uw.word_id is null), (w.kind = 'phrase'), w.sort, w.id
    limit m.new_words
  ) s;

  select array_agg(word_id) into due_ids from (
    select word_id from public.user_words
    where user_id = auth.uid() and due <= today
    order by due, interval_days
    limit m.review_cap
  ) s;

  return jsonb_build_object(
    'day', today,
    'mission', to_jsonb(m),
    'lesson_id', coalesce(m.lesson_id, lesson),
    'learn_lesson_id', lesson,
    'progress', to_jsonb(p),
    'new_word_ids', coalesce(to_jsonb(new_ids), '[]'::jsonb),
    'due_word_ids', coalesce(to_jsonb(due_ids), '[]'::jsonb),
    'streak', public.user_streak(auth.uid()),
    'team_streak', public.team_streak(t)
  );
end $$;

create or replace function public.complete_mission_step(p_step text, p_pct int default null, p_seconds int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t uuid := public.my_team_id();
  today date := public.app_today();
  m public.daily_missions;
  p public.mission_progress;
  members int; done int; s int; n record;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform public.get_today_mission();  -- makes sure both rows exist
  select * into m from public.daily_missions where team_id = t and day = today;
  select * into p from public.mission_progress where user_id = auth.uid() and day = today for update;

  -- Steps unlock in order: review → learn → read → quiz
  if p_step = 'review' then
    p.review_done := true;
  elsif p_step = 'learn' then
    if not p.review_done then raise exception 'Finish today''s review first'; end if;
    p.learn_done := true;
  elsif p_step = 'read' then
    if not p.learn_done then raise exception 'Learn today''s new words first'; end if;
    p.read_done := true;
  elsif p_step = 'quiz' then
    if not p.read_done then raise exception 'Read today''s text first'; end if;
    p.quiz_pct := greatest(coalesce(p.quiz_pct, 0), coalesce(p_pct, 0));
    if coalesce(p_pct, 0) >= m.pass_pct then p.quiz_done := true; end if;
  else
    raise exception 'Unknown step %', p_step;
  end if;

  update public.mission_progress
     set review_done = p.review_done, learn_done = p.learn_done, read_done = p.read_done,
         quiz_done = p.quiz_done, quiz_pct = p.quiz_pct,
         seconds = seconds + least(greatest(coalesce(p_seconds, 0), 0), 3600)
   where user_id = auth.uid() and day = today;

  -- A nudge answered within an hour earns both people +10
  for n in select * from public.nudges
           where to_user = auth.uid() and day = today and not rewarded
             and created_at > now() - interval '1 hour' loop
    update public.nudges set rewarded = true where id = n.id;
    perform public.log_activity('nudge_response', 10, null, null, jsonb_build_object('from', n.from_user));
    insert into public.activity_log (user_id, team_id, kind, xp, meta)
    values (n.from_user, t, 'nudge_response', 10, jsonb_build_object('to', auth.uid()));
  end loop;

  -- Mission complete?
  if p.review_done and p.learn_done and p.read_done and p.quiz_done and p.completed_at is null then
    update public.mission_progress set completed_at = now() where user_id = auth.uid() and day = today;
    perform public.log_activity('mission', 50, null, null, jsonb_build_object('day', today));
    perform public.award_badge(auth.uid(), 'first_mission');
    if extract(hour from now() at time zone public.app_tz()) < 7 then
      perform public.award_badge(auth.uid(), 'early_bird');
    end if;

    s := public.user_streak(auth.uid());
    if s > 0 and s % 7 = 0 then
      perform public.log_activity('streak_bonus', 100, null, null, jsonb_build_object('streak', s));
    end if;
    if s >= 7 then perform public.award_badge(auth.uid(), 'streak_7'); end if;
    if s >= 30 then perform public.award_badge(auth.uid(), 'streak_30'); end if;

    -- Whole team done today → everyone gets the team bonus once
    select count(*) into members from public.team_members where team_id = t;
    select count(*) into done from public.mission_progress
      where team_id = t and day = today and completed_at is not null;
    if done >= members and not exists (
         select 1 from public.activity_log where team_id = t and day = today and kind = 'team_bonus') then
      insert into public.activity_log (user_id, team_id, kind, xp, meta)
      select tm.user_id, t, 'team_bonus', 20, jsonb_build_object('day', today)
      from public.team_members tm where tm.team_id = t;
    end if;
  end if;

  return public.get_today_mission();
end $$;

-- =====================================================================
-- Leaderboard, team overview, feed
-- =====================================================================
create or replace function public.leaderboard(p_period text default 'week')
returns table (user_id uuid, display_name text, avatar_emoji text, xp int, accuracy int,
               streak int, improvement int, mastered int)
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.my_team_id(); start_d date; prev_start date;
begin
  if p_period = 'week' then
    start_d := date_trunc('week', public.app_today())::date; prev_start := start_d - 7;
  elsif p_period = 'month' then
    start_d := date_trunc('month', public.app_today())::date; prev_start := (start_d - interval '1 month')::date;
  else
    start_d := date '2000-01-01'; prev_start := date '2000-01-01';
  end if;
  return query
  select tm.user_id, pr.display_name, pr.avatar_emoji,
    coalesce((select sum(a.xp) from public.activity_log a where a.user_id = tm.user_id and a.day >= start_d), 0)::int,
    coalesce((select round(100.0 * count(*) filter (where a.correct) / nullif(count(*) filter (where a.correct is not null), 0))
              from public.activity_log a where a.user_id = tm.user_id and a.day >= start_d), 0)::int,
    public.user_streak(tm.user_id),
    (coalesce((select sum(a.xp) from public.activity_log a where a.user_id = tm.user_id and a.day >= start_d), 0)
     - coalesce((select sum(a.xp) from public.activity_log a where a.user_id = tm.user_id and a.day >= prev_start and a.day < start_d), 0))::int,
    (select count(*) from public.user_words uw where uw.user_id = tm.user_id and uw.interval_days >= 21)::int
  from public.team_members tm
  join public.profiles pr on pr.id = tm.user_id
  where tm.team_id = t
  order by 4 desc;
end $$;

create or replace function public.team_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.my_team_id(); today date := public.app_today(); wk date := date_trunc('week', public.app_today())::date;
begin
  if t is null then return null; end if;
  return jsonb_build_object(
    'team', (select to_jsonb(x) from (select id, name, invite_code, focus_chapter_id, weekly_goal_words from public.teams where id = t) x),
    'am_leader', public.is_leader_of(t),
    'team_streak', public.team_streak(t),
    'week_words', (select count(*) from public.user_words uw join public.team_members tm on tm.user_id = uw.user_id
                   where tm.team_id = t and (uw.learned_at at time zone public.app_tz())::date >= wk),
    'members', coalesce((select jsonb_agg(row_to_json(r) order by r.done_today desc, r.display_name) from (
      select tm.user_id, tm.role, pr.display_name, pr.avatar_emoji,
        coalesce((select mp.completed_at is not null from public.mission_progress mp where mp.user_id = tm.user_id and mp.day = today), false) as done_today,
        (select jsonb_build_object('review', mp.review_done, 'learn', mp.learn_done, 'read', mp.read_done, 'quiz', mp.quiz_done, 'quiz_pct', mp.quiz_pct)
           from public.mission_progress mp where mp.user_id = tm.user_id and mp.day = today) as steps,
        (select count(*) from public.mission_progress mp where mp.user_id = tm.user_id and mp.day >= wk and mp.completed_at is not null)::int as days_this_week,
        coalesce((select sum(mp.seconds) from public.mission_progress mp where mp.user_id = tm.user_id and mp.day = today), 0)::int as seconds_today,
        coalesce((select sum(mp.seconds) from public.mission_progress mp where mp.user_id = tm.user_id and mp.day >= wk), 0)::int as seconds_week,
        coalesce((select sum(a.xp) from public.activity_log a where a.user_id = tm.user_id and a.day >= wk), 0)::int as xp_week,
        coalesce((select round(100.0 * count(*) filter (where a.correct) / nullif(count(*) filter (where a.correct is not null), 0))
                  from public.activity_log a where a.user_id = tm.user_id and a.day >= wk), 0)::int as accuracy_week,
        (select max(a.created_at) from public.activity_log a where a.user_id = tm.user_id) as last_active,
        (select count(*) from public.user_words uw where uw.user_id = tm.user_id)::int as words_learned,
        (select count(*) from public.user_words uw where uw.user_id = tm.user_id and uw.interval_days >= 21)::int as mastered,
        public.user_streak(tm.user_id) as streak,
        exists (select 1 from public.nudges n where n.from_user = auth.uid() and n.to_user = tm.user_id and n.day = today) as nudged_today
      from public.team_members tm join public.profiles pr on pr.id = tm.user_id
      where tm.team_id = t) r), '[]'::jsonb)
  );
end $$;

-- 30-day calendar for the leader dashboard
create or replace function public.team_heatmap(p_days int default 30)
returns table (user_id uuid, day date, completed boolean, xp int)
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.my_team_id();
begin
  if not public.is_leader_of(t) then raise exception 'Only the team leader can see this'; end if;
  return query
  select tm.user_id, d::date,
    exists (select 1 from public.mission_progress mp where mp.user_id = tm.user_id and mp.day = d::date and mp.completed_at is not null),
    coalesce((select sum(a.xp) from public.activity_log a where a.user_id = tm.user_id and a.day = d::date), 0)::int
  from public.team_members tm
  cross join generate_series(public.app_today() - (p_days - 1), public.app_today(), interval '1 day') d
  where tm.team_id = t;
end $$;

-- Words the team gets wrong most often (last 30 days)
create or replace function public.team_weak_words(p_limit int default 20)
returns table (word_id text, de text, en text, bn text, wrong int, attempts int)
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.my_team_id();
begin
  if t is null then raise exception 'Not in a team'; end if;
  return query
  select w.id, w.de, w.en, w.bn,
    (count(*) filter (where a.correct = false))::int, count(*)::int
  from public.activity_log a join public.words w on w.id = a.word_id
  where a.team_id = t and a.kind = 'review' and a.day >= public.app_today() - 30
  group by w.id
  having count(*) filter (where a.correct = false) > 0
  order by 5 desc, 6 desc
  limit p_limit;
end $$;

create or replace function public.team_feed(p_limit int default 30)
returns table (id bigint, user_id uuid, display_name text, avatar_emoji text, kind text, xp int, meta jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.my_team_id();
begin
  return query
  select a.id, a.user_id, pr.display_name, pr.avatar_emoji, a.kind, a.xp, a.meta, a.created_at
  from public.activity_log a join public.profiles pr on pr.id = a.user_id
  where a.team_id = t and a.kind in ('mission', 'streak_bonus', 'badge', 'exam', 'team_bonus')
    and not (a.kind = 'team_bonus' and a.user_id <> auth.uid())
  order by a.created_at desc
  limit p_limit;
end $$;

create or replace function public.my_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare wk date := date_trunc('week', public.app_today())::date;
begin
  return jsonb_build_object(
    'xp_total', coalesce((select sum(xp) from public.activity_log where user_id = auth.uid()), 0),
    'xp_week', coalesce((select sum(xp) from public.activity_log where user_id = auth.uid() and day >= wk), 0),
    'xp_today', coalesce((select sum(xp) from public.activity_log where user_id = auth.uid() and day = public.app_today()), 0),
    'words_learned', (select count(*) from public.user_words where user_id = auth.uid()),
    'mastered', (select count(*) from public.user_words where user_id = auth.uid() and interval_days >= 21),
    'due_today', (select count(*) from public.user_words where user_id = auth.uid() and due <= public.app_today()),
    'streak', public.user_streak(auth.uid()),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'emoji', b.emoji, 'name', b.name, 'bn', b.bn, 'earned_at', ub.earned_at))
                        from public.user_badges ub join public.badges b on b.id = ub.badge_id where ub.user_id = auth.uid()), '[]'::jsonb),
    'unseen_nudges', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'message', n.message, 'from', pr.display_name, 'created_at', n.created_at))
                               from public.nudges n join public.profiles pr on pr.id = n.from_user
                               where n.to_user = auth.uid() and n.seen_at is null), '[]'::jsonb)
  );
end $$;

-- =====================================================================
-- Nudges
-- =====================================================================
create or replace function public.send_nudge(p_to uuid, p_message text default '') returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := public.my_team_id();
begin
  if p_to = auth.uid() then raise exception 'You cannot nudge yourself'; end if;
  if not public.shares_team_with(p_to) then raise exception 'Not in your team'; end if;
  insert into public.nudges (team_id, from_user, to_user, message)
  values (t, auth.uid(), p_to, left(coalesce(p_message, ''), 140));
exception when unique_violation then
  raise exception 'You already nudged this person today';
end $$;

create or replace function public.mark_nudges_seen() returns void
language sql security definer set search_path = public as $$
  update public.nudges set seen_at = now() where to_user = auth.uid() and seen_at is null
$$;

-- =====================================================================
-- Exams
-- =====================================================================
create or replace function public.norm_de(s text) returns text
language sql immutable as $$
  select trim(regexp_replace(
           translate(replace(replace(replace(replace(lower(coalesce(s, '')), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
                     '.,!?;:„“"''()…–-', '              '),
           '\s+', ' ', 'g'))
$$;

-- Does a typed answer match the German word? Accepts with or without article,
-- either half of "der Arzt / die Ärztin", and ae/oe/ue/ss for umlauts.
create or replace function public.de_matches(p_answer text, p_de text) returns boolean
language plpgsql immutable as $$
declare part text; a text := public.norm_de(p_answer); n text;
begin
  if a = '' then return false; end if;
  foreach part in array regexp_split_to_array(regexp_replace(p_de, '\([^)]*\)', '', 'g'), '\s*[/,]\s*') loop
    n := public.norm_de(part);
    if n = '' then continue; end if;
    if a = n or a = regexp_replace(n, '^(der|die|das) ', '') then return true; end if;
  end loop;
  return false;
end $$;

create or replace function public.exam_scope_words(p_exam public.exams) returns setof public.words
language sql stable security definer set search_path = public as $$
  select distinct w.* from public.words w
  left join public.word_lessons wl on wl.word_id = w.id
  where (wl.lesson_id in (select jsonb_array_elements_text(coalesce(p_exam.scope->'lessons', '[]'::jsonb))))
     or (w.chapter_id in (select jsonb_array_elements_text(coalesce(p_exam.scope->'chapters', '[]'::jsonb))))
$$;

create or replace function public.start_exam(p_exam uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e public.exams; a public.exam_attempts; w public.words;
  qs jsonb := '[]'::jsonb; ks jsonb := '[]'::jsonb;
  qtype text; i int := 0; ntypes int; opts jsonb; noun text; art text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into e from public.exams where id = p_exam;
  if not found or e.team_id <> public.my_team_id() then raise exception 'Exam not found'; end if;

  select * into a from public.exam_attempts where exam_id = p_exam and user_id = auth.uid();
  if found then
    if a.submitted_at is null and now() >= a.deadline then
      perform public.finish_exam(a.id, true);
      select * into a from public.exam_attempts where id = a.id;
    end if;
    return to_jsonb(a) - 'answers' || jsonb_build_object('answered', jsonb_array_length(a.answers),
             'exam', to_jsonb(e) - 'scope', 'server_now', now());
  end if;

  if now() < e.opens_at then raise exception 'This exam has not opened yet'; end if;
  if now() >= e.closes_at then raise exception 'This exam is closed'; end if;

  ntypes := coalesce(array_length(e.question_types, 1), 0);
  if ntypes = 0 then raise exception 'Exam has no question types'; end if;

  for w in select * from public.exam_scope_words(e) order by random() limit e.num_questions loop
    qtype := e.question_types[(i % ntypes) + 1];
    if qtype = 'article' and w.de !~ '^(der|die|das) [^/,(]+$' then qtype := 'meaning'; end if;
    if qtype = 'german' and (w.kind <> 'word' or length(w.de) > 32) then qtype := 'meaning'; end if;

    if qtype in ('meaning', 'listen') then
      select jsonb_agg(o order by random()) into opts from (
        select jsonb_build_object('id', w.id, 'en', w.en, 'bn', w.bn) as o
        union all
        select * from (
          select jsonb_build_object('id', x.id, 'en', x.en, 'bn', x.bn)
          from public.exam_scope_words(e) x
          where x.id <> w.id and x.en <> w.en
          order by random() limit 3) d
      ) s;
      qs := qs || jsonb_build_array(jsonb_build_object('type', qtype,
              'de', w.de, 'say', w.say, 'options', opts));
      ks := ks || jsonb_build_array(to_jsonb(w.id));
    elsif qtype = 'german' then
      qs := qs || jsonb_build_array(jsonb_build_object('type', 'german', 'en', w.en, 'bn', w.bn));
      ks := ks || jsonb_build_array(to_jsonb(w.de));
    else
      art := substring(w.de from '^(der|die|das) ');
      noun := regexp_replace(w.de, '^(der|die|das) ', '');
      qs := qs || jsonb_build_array(jsonb_build_object('type', 'article', 'noun', noun, 'en', w.en, 'bn', w.bn,
              'options', jsonb_build_array('der', 'die', 'das')));
      ks := ks || jsonb_build_array(to_jsonb(art));
    end if;
    i := i + 1;
  end loop;

  if i = 0 then raise exception 'This exam has no words in its scope'; end if;

  insert into public.exam_attempts (exam_id, user_id, deadline, questions, total)
  values (p_exam, auth.uid(), least(now() + make_interval(mins => e.duration_min), e.closes_at), qs, i)
  returning * into a;
  insert into public.exam_keys (attempt_id, keys) values (a.id, ks);

  return to_jsonb(a) - 'answers' || jsonb_build_object('answered', 0, 'exam', to_jsonb(e) - 'scope', 'server_now', now());
end $$;

create or replace function public.answer_exam(p_attempt uuid, p_index int, p_answer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.exam_attempts;
begin
  select * into a from public.exam_attempts where id = p_attempt and user_id = auth.uid() for update;
  if not found then raise exception 'Attempt not found'; end if;
  if a.submitted_at is not null then raise exception 'Exam already submitted'; end if;
  if now() >= a.deadline then
    perform public.finish_exam(a.id, true);
    raise exception 'Time is up';
  end if;
  -- One way only: answers must arrive in order, no going back
  if p_index <> jsonb_array_length(a.answers) then raise exception 'Questions must be answered in order'; end if;
  if p_index >= a.total then raise exception 'No such question'; end if;
  update public.exam_attempts set answers = answers || jsonb_build_array(left(coalesce(p_answer, ''), 200))
  where id = a.id;
  if p_index + 1 >= a.total then
    return public.finish_exam(a.id, false);
  end if;
  return jsonb_build_object('answered', p_index + 1);
end $$;

create or replace function public.finish_exam(p_attempt uuid, p_auto boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.exam_attempts; k jsonb; q jsonb; sc int := 0; i int; ans text; key text; pct int; e public.exams;
begin
  select * into a from public.exam_attempts where id = p_attempt and (user_id = auth.uid() or auth.uid() is null) for update;
  if not found then raise exception 'Attempt not found'; end if;
  if a.submitted_at is not null then
    return jsonb_build_object('score', a.score, 'total', a.total, 'submitted', true);
  end if;
  select keys into k from public.exam_keys where attempt_id = a.id;
  for i in 0 .. a.total - 1 loop
    q := a.questions -> i;
    ans := a.answers ->> i;
    key := k ->> i;
    if ans is null then continue; end if;
    if q->>'type' = 'german' then
      if public.de_matches(ans, key) then sc := sc + 1; end if;
    elsif ans = key then
      sc := sc + 1;
    end if;
  end loop;
  update public.exam_attempts set submitted_at = now(), score = sc, auto_submitted = p_auto where id = a.id;
  pct := round(sc * 100.0 / greatest(a.total, 1));
  select * into e from public.exams where id = a.exam_id;
  insert into public.activity_log (user_id, team_id, kind, xp, meta)
  values (a.user_id, e.team_id, 'exam', least(pct, 100),
          jsonb_build_object('exam', e.id, 'title', e.title, 'score', sc, 'total', a.total, 'pct', pct, 'auto', p_auto));
  if pct = 100 then perform public.award_badge(a.user_id, 'exam_100'); end if;
  return jsonb_build_object('score', sc, 'total', a.total, 'pct', pct, 'submitted', true, 'auto', p_auto);
end $$;

create or replace function public.log_exam_violation(p_attempt uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.exam_attempts; e public.exams;
begin
  select * into a from public.exam_attempts where id = p_attempt and user_id = auth.uid() for update;
  if not found then raise exception 'Attempt not found'; end if;
  if a.submitted_at is not null then return jsonb_build_object('submitted', true); end if;
  select * into e from public.exams where id = a.exam_id;
  insert into public.proctor_events (attempt_id, kind) values (a.id, left(p_kind, 40));
  update public.exam_attempts set violations = violations + 1 where id = a.id returning * into a;
  if a.violations >= e.max_violations then
    return public.finish_exam(a.id, true) || jsonb_build_object('violations', a.violations);
  end if;
  return jsonb_build_object('violations', a.violations, 'max', e.max_violations, 'submitted', false);
end $$;

-- After the window closes (or for the leader at any time) show the right answers.
create or replace function public.exam_review(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.exam_attempts; e public.exams; k jsonb;
begin
  select * into a from public.exam_attempts where id = p_attempt;
  if not found then raise exception 'Attempt not found'; end if;
  select * into e from public.exams where id = a.exam_id;
  if a.user_id <> auth.uid() and not public.is_leader_of(e.team_id) then raise exception 'Not allowed'; end if;
  if a.submitted_at is null then raise exception 'Exam not finished yet'; end if;
  if now() < e.closes_at and not public.is_leader_of(e.team_id) then
    return jsonb_build_object('locked', true, 'closes_at', e.closes_at, 'score', a.score, 'total', a.total);
  end if;
  select keys into k from public.exam_keys where attempt_id = a.id;
  return jsonb_build_object('locked', false, 'questions', a.questions, 'answers', a.answers, 'keys', k,
                            'score', a.score, 'total', a.total, 'violations', a.violations);
end $$;

-- =====================================================================
-- Row level security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.sentences enable row level security;
alter table public.words enable row level security;
alter table public.word_lessons enable row level security;
alter table public.user_words enable row level security;
alter table public.activity_log enable row level security;
alter table public.daily_missions enable row level security;
alter table public.mission_progress enable row level security;
alter table public.nudges enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.exams enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_keys enable row level security;
alter table public.proctor_events enable row level security;

-- Profiles: you and your teammates; you edit only yourself
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_team_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Teams
create policy teams_read on public.teams for select to authenticated
  using (id = public.my_team_id());
create policy teams_update on public.teams for update to authenticated
  using (public.is_leader_of(id)) with check (public.is_leader_of(id));
create policy members_read on public.team_members for select to authenticated
  using (team_id = public.my_team_id());
create policy members_leave on public.team_members for delete to authenticated
  using (user_id = auth.uid() or public.is_leader_of(team_id));

-- Content: every signed-in user reads; only the service role writes
create policy chapters_read on public.chapters for select to authenticated using (true);
create policy lessons_read on public.lessons for select to authenticated using (true);
create policy sentences_read on public.sentences for select to authenticated using (true);
create policy words_read on public.words for select to authenticated using (true);
create policy word_lessons_read on public.word_lessons for select to authenticated using (true);
create policy badges_read on public.badges for select to authenticated using (true);

-- Personal learning data: only your own rows (writes go through functions)
create policy user_words_read on public.user_words for select to authenticated using (user_id = auth.uid());
create policy activity_read on public.activity_log for select to authenticated using (user_id = auth.uid());
create policy progress_read on public.mission_progress for select to authenticated
  using (user_id = auth.uid() or public.is_leader_of(team_id));
create policy user_badges_read on public.user_badges for select to authenticated
  using (user_id = auth.uid() or public.shares_team_with(user_id));

-- Missions: team reads, leader writes
create policy missions_read on public.daily_missions for select to authenticated using (team_id = public.my_team_id());
create policy missions_insert on public.daily_missions for insert to authenticated with check (public.is_leader_of(team_id));
create policy missions_update on public.daily_missions for update to authenticated
  using (public.is_leader_of(team_id)) with check (public.is_leader_of(team_id));
create policy missions_delete on public.daily_missions for delete to authenticated using (public.is_leader_of(team_id));

-- Nudges: sender and receiver see them
create policy nudges_read on public.nudges for select to authenticated
  using (to_user = auth.uid() or from_user = auth.uid());

-- Push subscriptions: your own
create policy push_read on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- Exams: team reads, leader writes
create policy exams_read on public.exams for select to authenticated using (team_id = public.my_team_id());
create policy exams_insert on public.exams for insert to authenticated with check (public.is_leader_of(team_id));
create policy exams_update on public.exams for update to authenticated
  using (public.is_leader_of(team_id)) with check (public.is_leader_of(team_id));
create policy exams_delete on public.exams for delete to authenticated using (public.is_leader_of(team_id));
create policy attempts_read on public.exam_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_leader_of((select team_id from public.exams where id = exam_id)));
create policy proctor_read on public.proctor_events for select to authenticated
  using (public.is_leader_of((select e.team_id from public.exam_attempts a join public.exams e on e.id = a.exam_id where a.id = attempt_id)));
-- exam_keys: no policies on purpose

-- Functions that must never be called directly by clients
revoke execute on function public.finish_exam(uuid, boolean) from anon;
revoke execute on function public.exam_scope_words(public.exams) from public, anon, authenticated;
revoke execute on function public.xp_today(uuid, text) from public, anon, authenticated;
revoke execute on function public.next_lesson_for(uuid, text) from public, anon, authenticated;

-- =====================================================================
-- Badges
-- =====================================================================
insert into public.badges (id, emoji, name, bn, description) values
  ('first_mission', '🚀', 'Erste Mission', 'প্রথম মিশন', 'Finished your first daily mission'),
  ('streak_7', '🔥', '7 Tage', '৭ দিনের আগুন', 'Seven days in a row'),
  ('streak_30', '🏆', '30 Tage', '৩০ দিনের চ্যাম্পিয়ন', 'Thirty days in a row'),
  ('words_100', '📚', '100 Wörter', '১০০ শব্দ আয়ত্ত', '100 words remembered for 21+ days'),
  ('words_300', '🎓', '300 Wörter', '৩০০ শব্দ আয়ত্ত', '300 words remembered for 21+ days'),
  ('exam_100', '💯', 'Perfekt', 'পরীক্ষায় ১০০%', 'Full marks in an exam'),
  ('early_bird', '🐦', 'Frühaufsteher', 'ভোরের পাখি', 'Finished the mission before 7 AM')
on conflict (id) do nothing;
