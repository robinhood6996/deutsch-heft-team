export type Chapter = {
  id: string;
  kind: "course" | "vocab";
  title: string;
  subtitle: string;
  bn_title: string;
  sort: number;
  story: Story | null;
};

export type Story = {
  title: string;
  bn_title?: string;
  sentences: [de: string, en: string, bn: string][];
};

export type Lesson = {
  id: string;
  chapter_id: string;
  num: number;
  title: string;
  en_title: string;
  bn_title: string;
  kind: "phrases" | "text" | "numbers";
  sort: number;
  notes_html: string;
  exercises: Exercise[] | null;
};

export type Exercise = {
  sec: string;
  t?: "build";
  q?: string;
  en: string;
  bn: string;
  a: string;
  full?: string;
  opts?: string[];
  note?: string;
};

export type Sentence = {
  id: number;
  lesson_id: string;
  idx: number;
  de: string;
  en: string;
  bn: string;
  say: string;
  emoji: string;
  tip: string;
  grp: string;
  is_list: boolean;
};

export type Word = {
  id: string;
  chapter_id: string;
  kind: "word" | "phrase";
  de: string;
  en: string;
  bn: string;
  say: string;
  topic: string;
  emoji: string;
  tip: string;
  mnemonic: string;
  image_url: string;
  sort: number;
};

export type UserWord = {
  word_id: string;
  due: string;
  interval_days: number;
  reps: number;
  lapses: number;
  correct: number;
  wrong: number;
};

export type Mission = {
  id: string;
  team_id: string;
  day: string;
  lesson_id: string | null;
  new_words: number;
  review_cap: number;
  quiz_size: number;
  pass_pct: number;
  note: string;
};

export type MissionProgress = {
  review_done: boolean;
  learn_done: boolean;
  read_done: boolean;
  quiz_done: boolean;
  quiz_pct: number | null;
  seconds: number;
  completed_at: string | null;
};

export type TodayMission = {
  day: string;
  mission: Mission;
  lesson_id: string | null;
  learn_lesson_id: string | null;
  progress: MissionProgress;
  new_word_ids: string[];
  due_word_ids: string[];
  streak: number;
  team_streak: number;
};

export type Badge = { id: string; emoji: string; name: string; bn: string; earned_at?: string };

export type MyStats = {
  xp_total: number;
  xp_week: number;
  xp_today: number;
  words_learned: number;
  mastered: number;
  due_today: number;
  streak: number;
  badges: Badge[];
  unseen_nudges: { id: number; message: string; from: string; created_at: string }[];
};

export type Member = {
  user_id: string;
  role: "member" | "leader";
  display_name: string;
  avatar_emoji: string;
  done_today: boolean;
  steps: { review: boolean; learn: boolean; read: boolean; quiz: boolean; quiz_pct: number | null } | null;
  days_this_week: number;
  seconds_today: number;
  seconds_week: number;
  xp_week: number;
  accuracy_week: number;
  last_active: string | null;
  words_learned: number;
  mastered: number;
  streak: number;
  nudged_today: boolean;
};

export type TeamOverview = {
  team: { id: string; name: string; invite_code: string; focus_chapter_id: string | null; weekly_goal_words: number };
  am_leader: boolean;
  team_streak: number;
  week_words: number;
  members: Member[];
};

export type LeaderRow = {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
  xp: number;
  accuracy: number;
  streak: number;
  improvement: number;
  mastered: number;
};

export type Exam = {
  id: string;
  team_id: string;
  title: string;
  scope: { lessons?: string[]; chapters?: string[] };
  question_types: string[];
  num_questions: number;
  seconds_per_question: number;
  duration_min: number;
  opens_at: string;
  closes_at: string;
  max_violations: number;
  require_fullscreen: boolean;
};

export type ExamQuestion =
  | { type: "meaning" | "listen"; de: string; say: string; options: { id: string; en: string; bn: string }[] }
  | { type: "german"; en: string; bn: string }
  | { type: "article"; noun: string; en: string; bn: string; options: string[] };

export type ExamAttempt = {
  id: string;
  exam_id: string;
  started_at: string;
  deadline: string;
  submitted_at: string | null;
  questions: ExamQuestion[];
  score: number | null;
  total: number;
  violations: number;
  auto_submitted: boolean;
  answered: number;
  exam: Omit<Exam, "scope">;
  server_now: string;
};
