import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Splash } from '../design';
import { keys } from '../hooks/keys';
import { pauseDevice, restorePush } from '../lib/push';
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

/** Forgets everything cached for the previous account, then asks again who is signed in. */
const resetSession = async (client: QueryClient) => {
  client.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me[0] });
  await client.resetQueries({ queryKey: keys.me });
};

export function useSessionActions() {
  const client = useQueryClient();
  const reset = () => resetSession(client);
  return {
    /** Demo backend only: continue as one of the seeded accounts. */
    async signInAs(profileId: string) {
      if (sessionService.kind !== 'demo') return;
      await sessionService.signIn(profileId);
      await reset();
    },
    async signOut() {
      try {
        if (sessionService.kind === 'account') await pauseDevice((endpoint) => dataService.removePushDevice(endpoint));
        await sessionService.signOut();
      } finally {
        await reset();
      }
    },
    refresh: reset,
  };
}

export function AuthGate() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [recovering, setRecovering] = useState(false);
  const me = useQuery({ queryKey: keys.me, queryFn: () => dataService.getMe(), retry: false, staleTime: Infinity });

  // Bring back this account's notifications on this device after signing in.
  useEffect(() => {
    if (me.data && sessionService.kind === 'account') void restorePush(me.data.id, (d) => dataService.savePushDevice(d));
  }, [me.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // After signing out and back in, start on the home screen rather than wherever the last session ended.
  const signedIn = useRef(false);
  const signedOut = useRef(false);
  useEffect(() => {
    if (me.data) {
      if (signedOut.current) {
        signedOut.current = false;
        navigate('/', { replace: true });
      }
      signedIn.current = true;
    } else if (me.isError && signedIn.current) {
      signedIn.current = false;
      signedOut.current = true;
    }
  }, [me.data, me.isError, navigate]);

  // Real accounts can change outside the app: email links, expiry, another tab signing out.
  useEffect(() => {
    if (sessionService.kind !== 'account') return;
    return sessionService.onChange((event) => {
      if (event === 'password_recovery') {
        setRecovering(true);
        return;
      }
      void resetSession(client);
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
