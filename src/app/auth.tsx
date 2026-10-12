import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Splash } from '../design';
import { keys } from '../hooks/keys';
import { dataService, sessionService } from '../services';
import type { Profile } from '../types';
import { NewPasswordScreen, SignInScreen } from '../screens/SignIn';

const MeContext = createContext<Profile | null>(null);

/** The signed-in profile. Only valid below <AuthGate>. */
export function useMe(): Profile {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe must be used inside AuthGate');
  return me;
}

export function useSessionActions() {
  const client = useQueryClient();
  const reset = async () => {
    client.clear();
    await client.invalidateQueries({ queryKey: keys.me });
  };
  return {
    /** Demo backend only: continue as one of the seeded accounts. */
    async signInAs(profileId: string) {
      if (sessionService.kind !== 'demo') return;
      await sessionService.signIn(profileId);
      await reset();
    },
    async signOut() {
      await sessionService.signOut();
      await reset();
    },
    refresh: reset,
  };
}

export function AuthGate() {
  const client = useQueryClient();
  const [recovering, setRecovering] = useState(false);
  const me = useQuery({ queryKey: keys.me, queryFn: () => dataService.getMe(), retry: false, staleTime: Infinity });

  // Real accounts can change outside the app: email links, expiry, another tab signing out.
  useEffect(() => {
    if (sessionService.kind !== 'account') return;
    return sessionService.onChange((event) => {
      if (event === 'password_recovery') {
        setRecovering(true);
        return;
      }
      client.clear();
      void client.invalidateQueries({ queryKey: keys.me });
    });
  }, [client]);

  if (recovering) return <NewPasswordScreen onDone={() => setRecovering(false)} />;
  if (me.isPending) return <Splash />;
  if (me.isError) return <SignInScreen />;
  return (
    <MeContext.Provider value={me.data}>
      <Outlet />
    </MeContext.Provider>
  );
}
