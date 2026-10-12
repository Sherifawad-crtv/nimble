import type { DataService, SessionService } from './DataService';
import { MockDataService } from './mock/MockDataService';
import { createSupabase } from './supabase/client';
import { SupabaseDataService } from './supabase/SupabaseDataService';
import { SupabaseSession } from './supabase/SupabaseSession';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Supabase when the project is configured; otherwise the local demo backend with seeded accounts. */
function pick(): { data: DataService; session: SessionService } {
  if (url && key) {
    const sb = createSupabase(url, key);
    return { data: new SupabaseDataService(sb), session: new SupabaseSession(sb) };
  }
  const mock = new MockDataService();
  return { data: mock, session: mock };
}

const backend = pick();

export const dataService = backend.data;
export const sessionService = backend.session;
export { ServiceError } from './DataService';
export type { AccountSession, DataService, DemoSession, SessionService, SignUpInput } from './DataService';
