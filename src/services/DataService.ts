import type {
  Assignment,
  AssignmentStatus,
  Comment,
  DailyMetrics,
  Exercise,
  ExerciseInput,
  ExerciseProgress,
  Id,
  ISODate,
  LinkPreview,
  Package,
  PackageInput,
  PersonalRecord,
  Profile,
  Program,
  ProgramInput,
  Readiness,
  WearableConnection,
  WearableProvider,
  Workout,
  WorkoutInput,
  WorkoutLog,
} from '../types';

export type ServiceErrorCode = 'not_found' | 'forbidden' | 'invalid_link' | 'unauthenticated' | 'invalid';

/** Same error shape the real backend returns. */
export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

export interface ExerciseQuery {
  search?: string;
  tags?: string[];
  equipment?: string[];
}

/** Everything the UI is allowed to know about the backend. */
export interface DataService {
  // session
  getMe(): Promise<Profile>;

  // library
  listExercises(q?: ExerciseQuery): Promise<Exercise[]>;
  previewVideoLink(url: string): Promise<LinkPreview>; // rejects non YouTube/Vimeo
  createExercise(input: ExerciseInput): Promise<Exercise>;
  updateExercise(id: Id, patch: Partial<Exercise>): Promise<Exercise>;
  deleteExercise(id: Id): Promise<void>;

  // workouts
  listTemplates(): Promise<Workout[]>;
  saveWorkout(w: WorkoutInput): Promise<Workout>;
  listPrograms(): Promise<Program[]>;
  saveProgram(p: ProgramInput): Promise<Program>;

  // clients and assigning
  listClients(): Promise<Profile[]>;
  assignWorkout(input: { clientIds: Id[]; workoutId: Id; dates: ISODate[] }): Promise<Assignment[]>;
  assignProgram(input: { clientId: Id; programId: Id; startDate: ISODate }): Promise<Assignment[]>;
  getAssignment(id: Id): Promise<Assignment>;
  listAssignments(q: { clientId?: Id; from: ISODate; to: ISODate }): Promise<Assignment[]>;
  updateAssignment(id: Id, patch: { date?: ISODate; status?: AssignmentStatus }): Promise<Assignment>;
  deleteAssignment(id: Id): Promise<void>;

  // logging
  startWorkout(assignmentId: Id): Promise<WorkoutLog>;
  saveLog(log: WorkoutLog): Promise<WorkoutLog>;
  completeWorkout(assignmentId: Id): Promise<WorkoutLog>;
  getLog(assignmentId: Id): Promise<WorkoutLog | null>;
  listPersonalRecords(clientId: Id): Promise<PersonalRecord[]>;
  listExerciseProgress(clientId: Id): Promise<ExerciseProgress[]>;

  // comments
  listComments(assignmentId: Id): Promise<Comment[]>;
  addComment(assignmentId: Id, body: string): Promise<Comment>;

  // packages
  listPackages(clientId: Id): Promise<Package[]>;
  savePackage(p: PackageInput): Promise<Package>;

  // wearables
  getWearableConnection(clientId: Id): Promise<WearableConnection | null>;
  connectWearable(provider: WearableProvider): Promise<WearableConnection>;
  disconnectWearable(): Promise<void>;
  getDailyMetrics(clientId: Id, from: ISODate, to: ISODate): Promise<DailyMetrics[]>;
  getReadiness(clientId: Id): Promise<Readiness | null>;
}

/** Sign-in surface. The mock lists demo accounts; the real backend uses Supabase Auth. */
export interface SessionService {
  listDemoAccounts(): Promise<Profile[]>;
  signIn(profileId: Id): Promise<Profile>;
  signOut(): Promise<void>;
  currentProfileId(): Id | null;
}
