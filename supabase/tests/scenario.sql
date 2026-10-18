\set ON_ERROR_STOP 1
-- emulate Supabase default grants
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.log_activity(text,int,boolean,text,jsonb) from authenticated;
revoke execute on function public.award_badge(uuid,text) from authenticated;
revoke execute on function public.exam_scope_words(public.exams) from authenticated;
revoke execute on function public.xp_today(uuid,text) from authenticated;
revoke execute on function public.next_lesson_for(uuid,text) from authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','leader@x.com','{"display_name":"Robin"}'),
 ('22222222-2222-2222-2222-222222222222','rima@x.com','{"display_name":"Rima"}'),
 ('33333333-3333-3333-3333-333333333333','outsider@x.com','{}');

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select name, length(invite_code) from public.create_team('Deutsch Gruppe');
-- leader sets focus chapter and a mission lesson
update public.teams set focus_chapter_id = 'k2';
select invite_code as code from public.teams \gset
select jsonb_array_length(m->'new_word_ids') new_words, m->>'learn_lesson_id' lesson, m->'streak' streak from (select public.get_today_mission() m) x;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select name from public.join_team(:'code');

-- RLS: Rima cannot read leader's activity, can read team profiles
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select count(*) as outsider_sees_profiles from public.profiles;
select count(*) as outsider_sees_teams from public.teams;

-- Rima's mission flow
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
declare m jsonb; ids text[];
begin
  m := public.get_today_mission();
  begin perform public.complete_mission_step('learn'); raise exception 'order not enforced';
  exception when others then if sqlerrm = 'order not enforced' then raise; end if; end;
  perform public.complete_mission_step('review', null, 120);
  select array(select jsonb_array_elements_text(m->'new_word_ids')) into ids;
  perform public.learn_words(ids);
  perform public.complete_mission_step('learn', null, 200);
  perform public.mark_read(m->>'learn_lesson_id');
  perform public.complete_mission_step('read', null, 90);
  perform public.record_quiz('mission', 10, 6);
  m := public.complete_mission_step('quiz', 60, 60);
  if (m->'progress'->>'quiz_done')::boolean then raise exception 'quiz should fail under 70'; end if;
  perform public.record_quiz('mission', 10, 10);
  m := public.complete_mission_step('quiz', 100, 60);
  raise notice 'completed_at %, streak %', m->'progress'->>'completed_at', m->>'streak';
  -- review a word: forgot then good
  perform public.review_word(ids[1], 0);
  perform public.review_word(ids[1], 2);
end $$;
select kind, sum(xp) xp, count(*) from public.activity_log group by kind order by kind;
select * from public.user_words where word_id = (select word_id from public.user_words order by last_reviewed nulls last limit 1) limit 1;
select count(*) as rima_sees_activity_rows from public.activity_log;

-- nudge from leader to rima
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.send_nudge('22222222-2222-2222-2222-222222222222', 'Los geht''s!');
do $$ begin perform public.send_nudge('22222222-2222-2222-2222-222222222222','again'); raise exception 'dup allowed';
exception when others then if sqlerrm='dup allowed' then raise; end if; raise notice 'dup blocked: %', sqlerrm; end $$;
select display_name, xp, accuracy, streak, improvement from public.leaderboard('week');
select jsonb_pretty(public.team_overview()->'members'->0) ;
select count(*) heatmap_rows from public.team_heatmap(30);
select * from public.team_weak_words(5);
select kind, display_name from public.team_feed(10);

-- exam
insert into public.exams (team_id, title, scope, num_questions, duration_min, opens_at, closes_at)
values (public.my_team_id(), 'Kapitel 2 Test', '{"chapters":["k2"]}', 12, 10, now() - interval '1 minute', now() + interval '1 hour');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
declare a jsonb; e uuid; i int; q jsonb; r jsonb;
begin
  select id into e from public.exams limit 1;
  a := public.start_exam(e);
  raise notice 'questions %, types %', a->'total', (select string_agg(x->>'type', ',') from jsonb_array_elements(a->'questions') x);
  if a::text like '%keys%' then raise exception 'keys leaked'; end if;
  begin perform public.answer_exam((a->>'id')::uuid, 3, 'x'); raise exception 'skip allowed';
  exception when others then if sqlerrm='skip allowed' then raise; end if; end;
  perform public.log_exam_violation((a->>'id')::uuid, 'tab_hidden');
  for i in 0 .. (a->>'total')::int - 1 loop
    q := a->'questions'->i;
    r := public.answer_exam((a->>'id')::uuid, i,
      case q->>'type' when 'article' then 'der' when 'german' then 'falsch' else q->'options'->0->>'id' end);
  end loop;
  raise notice 'result %', r;
end $$;
select count(*) as rima_reads_keys from public.exam_keys;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select score, total, violations from public.exam_attempts;
select (public.exam_review((select id from public.exam_attempts limit 1))->>'locked') leader_review_locked;
select public.de_matches('Arzt','der Arzt / die Ärztin') a, public.de_matches('die aerztin','der Arzt / die Ärztin') b, public.de_matches('Bahnhof','der Bahnhof') c, public.de_matches('Bahnof','der Bahnhof') d;
select jsonb_pretty(public.my_stats() - 'badges' - 'unseen_nudges');

-- Today's new words stay the same after learning them, so the quiz still covers them
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select (public.get_today_mission()->'new_word_ids') as before_ids \gset
select public.learn_words(array(select jsonb_array_elements_text(:'before_ids'::jsonb)));
select (public.get_today_mission()->'new_word_ids') = :'before_ids'::jsonb as stable_after_learning;
