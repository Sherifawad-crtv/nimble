import { MockDataService } from './mock/MockDataService';

// Phase 2 swaps this one line for a Supabase-backed implementation of the same two interfaces.
const backend = new MockDataService();

export const dataService = backend;
export const sessionService = backend;
export { ServiceError } from './DataService';
export type { DataService, SessionService } from './DataService';
