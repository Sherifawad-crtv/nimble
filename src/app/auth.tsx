import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Splash } from '../design';
import { keys } from '../hooks/keys';
import { dataService, sessionService } from '../services';
import type { Profile } from '../types';
import { SignInScreen } from '../screens/SignIn';

const MeContext = createContext<Profile | null>(null);

/** The signed-in profile. Only valid below <AuthGate>. */
export function useMe(): Profile {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe must be used inside AuthGate');
  return me;
}

export function useSessionActions() {
  const client = useQueryClient();
  return {
    async signIn(profileId: string) {
      await sessionService.signIn(profileId);
      client.clear();
      await client.invalidateQueries({ queryKey: keys.me });
    },
    async signOut() {
      await sessionService.signOut();
      client.clear();
      await client.invalidateQueries({ queryKey: keys.me });
    },
  };
}

export function AuthGate() {
  const me = useQuery({ queryKey: keys.me, queryFn: () => dataService.getMe(), retry: false, staleTime: Infinity });
  if (me.isPending) return <Splash />;
  if (me.isError) return <SignInScreen />;
  return (
    <MeContext.Provider value={me.data}>
      <Outlet />
    </MeContext.Provider>
  );
}
