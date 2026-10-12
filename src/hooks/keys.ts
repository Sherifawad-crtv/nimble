import type { ExerciseQuery } from '../services/DataService';

/** Query keys in one place so invalidation stays honest. */
export const keys = {
  me: ['me'] as const,
  exercises: (q?: ExerciseQuery) => ['exercises', q ?? {}] as const,
  exercisesAll: ['exercises'] as const,
  templates: ['templates'] as const,
  programs: ['programs'] as const,
  clients: ['clients'] as const,
  assignments: (clientId: string | undefined, from: string, to: string) => ['assignments', clientId ?? 'me', from, to] as const,
  assignment: (id: string) => ['assignments', 'one', id] as const,
  assignmentsAll: ['assignments'] as const,
  log: (assignmentId: string) => ['log', assignmentId] as const,
  logsAll: ['log'] as const,
  records: (clientId: string) => ['records', clientId] as const,
  progress: (clientId: string) => ['progress', clientId] as const,
  recordsAll: ['records'] as const,
  progressAll: ['progress'] as const,
  summary: (clientId: string) => ['progress', 'summary', clientId] as const,
  comments: (assignmentId: string) => ['comments', assignmentId] as const,
  packages: (clientId: string) => ['packages', clientId] as const,
  wearable: (clientId: string) => ['wearable', clientId] as const,
  metrics: (clientId: string, from: string, to: string) => ['metrics', clientId, from, to] as const,
  readiness: (clientId: string) => ['readiness', clientId] as const,
};
