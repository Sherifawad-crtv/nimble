// Domain types. These are the contract shared by the mock layer and the real backend.

export type Id = string;
export type ISODate = string; // "2026-10-12"
export type ISOTime = string; // full ISO timestamp

export type Role = 'coach' | 'client';

export interface Profile {
  id: Id;
  workspaceId: Id;
  role: Role;
  name: string;
  email: string;
}

/** A code the coach shares so a client can join their workspace. */
export interface Invite {
  code: string;
  createdAt: ISOTime;
}

// ---------- library ----------
export type MeasuredAs = 'reps' | 'weight_reps' | 'time' | 'distance' | 'rounds';
export type VideoProvider = 'youtube' | 'vimeo';
export type LinkStatus = 'ok' | 'unavailable' | 'unchecked';

export interface Exercise {
  id: Id;
  workspaceId: Id;
  name: string;
  videoUrl?: string;
  videoProvider?: VideoProvider;
  videoId?: string;
  thumbnailUrl?: string;
  equipment: string[];
  tags: string[];
  measuredAs: MeasuredAs;
  cues?: string;
  linkStatus: LinkStatus;
  createdAt: ISOTime;
}

export interface LinkPreview {
  provider: VideoProvider;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  embeddable: boolean;
}

export type ExerciseInput = Omit<Exercise, 'id' | 'workspaceId' | 'createdAt' | 'linkStatus'>;

// ---------- workouts ----------
export type BlockType = 'standard' | 'amrap' | 'emom' | 'for_time' | 'tabata' | 'custom';

export interface ItemTarget {
  sets?: number;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  loadNote?: string;
  restSec?: number;
  notes?: string;
}

export interface BlockItem {
  id: Id;
  exerciseId: Id;
  exerciseName: string; // snapshot, so assignments stay readable
  target: ItemTarget;
}

export type CustomStep = { label: string; kind: 'work' | 'rest'; durationSec: number };

export type BlockSettings =
  | { type: 'standard' }
  | { type: 'amrap'; capSec: number }
  | { type: 'emom'; totalMin: number; intervalSec: number }
  | { type: 'for_time'; rounds: number; capSec?: number }
  | { type: 'tabata'; workSec: number; restSec: number; rounds: number }
  | { type: 'custom'; steps: CustomStep[] };

export interface Block {
  id: Id;
  title: string;
  settings: BlockSettings;
  items: BlockItem[];
}

export interface Workout {
  id: Id;
  workspaceId: Id;
  title: string;
  isTemplate: boolean;
  blocks: Block[];
}

export type WorkoutInput = Omit<Workout, 'id' | 'workspaceId' | 'isTemplate'> & { id?: Id };

export interface Program {
  id: Id;
  workspaceId: Id;
  title: string;
  days: { dayOffset: number; workoutId: Id }[];
}

export type ProgramInput = Omit<Program, 'id' | 'workspaceId'> & { id?: Id };

// ---------- assigning and logging ----------
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface Assignment {
  id: Id;
  workspaceId: Id;
  clientId: Id;
  date: ISODate;
  workout: Workout; // the client's own copy
  programId?: Id;
  status: AssignmentStatus;
}

export interface SetResult {
  reps?: number;
  load?: string;
  durationSec?: number;
  distanceM?: number;
}

export type TimerResult =
  | { kind: 'amrap'; rounds: number; extraReps: number }
  | { kind: 'for_time'; finishSec: number; capped: boolean }
  | { kind: 'emom' | 'tabata' | 'custom'; completed: boolean };

export interface WorkoutLog {
  id: Id;
  assignmentId: Id;
  startedAt: ISOTime;
  completedAt?: ISOTime;
  itemResults: { itemId: Id; sets: SetResult[] }[];
  timerResults: { blockId: Id; result: TimerResult }[];
  clientNote?: string;
}

export interface Comment {
  id: Id;
  assignmentId: Id;
  authorId: Id;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: ISOTime;
}

export interface PersonalRecord {
  exerciseId: Id;
  exerciseName: string;
  label: string; // e.g. "5 × 80 kg", "12:41"
  achievedOn: ISODate;
}

export interface ExerciseProgress {
  exerciseId: Id;
  exerciseName: string;
  unit: string;
  points: { date: ISODate; value: number }[];
}

/** Consistency over a recent window, computed by the service. */
export interface ProgressSummary {
  from: ISODate;
  to: ISODate;
  assigned: number;
  completed: number;
  completionPct: number;
  setsLogged: number;
  personalRecords: number;
  /** Total load moved across every completed workout, all time, in kg. */
  weightLiftedKg: number;
  /** Consecutive calendar weeks (Mon–Sun) with a completed workout, ending this week or last. */
  streakWeeks: number;
}

// ---------- packages (tracking only) ----------
export type PackageState = 'active' | 'expiring' | 'expired';

export interface Package {
  id: Id;
  workspaceId: Id;
  clientId: Id;
  name: string;
  sessionsIncluded: number;
  sessionsUsed: number;
  expiresOn: ISODate;
  paymentReceived: boolean;
  // computed by the service
  sessionsRemaining: number;
  state: PackageState;
}

export type PackageInput = Omit<Package, 'id' | 'sessionsRemaining' | 'state'> & { id?: Id };
