import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, useMe } from './app/auth';
import { ClientShell, CoachShell } from './app/Shells';
import { EmptyState, Skeleton } from './design';
import { t } from './i18n';
import type { Role } from './types';

/** Lazy-load a named export so each role's screens ship as separate chunks. */
function screen<M extends Record<string, ComponentType>>(load: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}

const ClientsScreen = screen(() => import('./screens/coach/ClientsScreen'), 'ClientsScreen');
const ClientScreen = screen(() => import('./screens/coach/ClientScreen'), 'ClientScreen');
const LibraryScreen = screen(() => import('./screens/coach/LibraryScreen'), 'LibraryScreen');
const WorkoutsScreen = screen(() => import('./screens/coach/WorkoutsScreen'), 'WorkoutsScreen');
const WorkoutBuilder = screen(() => import('./screens/coach/WorkoutBuilder'), 'WorkoutBuilder');
const ProgramEditor = screen(() => import('./screens/coach/ProgramEditor'), 'ProgramEditor');
const ReviewScreen = screen(() => import('./screens/coach/ReviewScreen'), 'ReviewScreen');
const CoachSettings = screen(() => import('./screens/coach/CoachSettings'), 'CoachSettings');

const TodayScreen = screen(() => import('./screens/client/TodayScreen'), 'TodayScreen');
const CalendarScreen = screen(() => import('./screens/client/CalendarScreen'), 'CalendarScreen');
const ProgressScreen = screen(() => import('./screens/client/ProgressScreen'), 'ProgressScreen');
const ClientSettings = screen(() => import('./screens/client/ClientSettings'), 'ClientSettings');
const WorkoutScreen = screen(() => import('./screens/client/WorkoutScreen'), 'WorkoutScreen');
const TimerScreen = screen(() => import('./screens/client/TimerScreen'), 'TimerScreen');

const home = (role: Role) => (role === 'coach' ? '/coach/clients' : '/app/today');

function RoleHome() {
  return <Navigate to={home(useMe().role)} replace />;
}

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const me = useMe();
  return me.role === role ? <>{children}</> : <Navigate to={home(me.role)} replace />;
}

function NotFound() {
  const me = useMe();
  return (
    <main className="app-page app-scroll">
      <EmptyState icon="compass" title={t('notFound.title')} body={t('notFound.body')} action={t('notFound.action')} onAction={() => window.location.assign(home(me.role))} />
    </main>
  );
}

export function App() {
  return (
    <Suspense fallback={<Skeleton variant="detail" />}>
      <Routes>
        <Route element={<AuthGate />}>
          <Route index element={<RoleHome />} />
          <Route
            path="coach"
            element={
              <RequireRole role="coach">
                <CoachShell />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="clients" replace />} />
            <Route path="clients" element={<ClientsScreen />} />
            <Route path="clients/:clientId" element={<ClientScreen />} />
            <Route path="library" element={<LibraryScreen />} />
            <Route path="workouts" element={<WorkoutsScreen />} />
            <Route path="workouts/:workoutId" element={<WorkoutBuilder />} />
            <Route path="programs/:programId" element={<ProgramEditor />} />
            <Route path="review/:assignmentId" element={<ReviewScreen />} />
            <Route path="settings" element={<CoachSettings />} />
          </Route>
          <Route
            path="app"
            element={
              <RequireRole role="client">
                <ClientShell />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="today" replace />} />
            <Route path="today" element={<TodayScreen />} />
            <Route path="calendar" element={<CalendarScreen />} />
            <Route path="progress" element={<ProgressScreen />} />
            <Route path="settings" element={<ClientSettings />} />
            <Route path="workout/:assignmentId" element={<WorkoutScreen />} />
          </Route>
          <Route
            path="app/timer/:assignmentId/:blockId"
            element={
              <RequireRole role="client">
                <TimerScreen />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
