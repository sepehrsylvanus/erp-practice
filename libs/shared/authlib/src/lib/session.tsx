import { useCallback, useSyncExternalStore } from "react";
import { authApi, setToken, refreshOnce } from "@erp/shared-api";
import type { SessionUser } from "@erp/shared-api";

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
}

interface SessionStore {
  state: SessionState;
  listeners: Set<() => void>;
  set(partial: Partial<SessionState>): void;
  subscribe(listener: () => void): () => void;
}
const globalStore = globalThis as unknown as { __ERP_SESSION__?: SessionStore };
if (!globalStore.__ERP_SESSION__) {
  globalStore.__ERP_SESSION__ = {
    state: { user: null, loading: true },
    listeners: new Set<() => void>(),
    set(partial: Partial<SessionState>) {
      this.state = { ...this.state, ...partial };
      this.listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    },
  };
}
const store: SessionStore = globalStore.__ERP_SESSION__;

const subscribe = (l: () => void) => store.subscribe(l);
const getState = () => store.state;

/** در root فقط یک‌بار صدا بزنید (داخل shell) */
export function initSession() {
  (async () => {
    const ok = await refreshOnce();
    if (!ok) return store.set({ loading: false });
    try {
      const { data } = await authApi.me();
      store.set({ user: data, loading: false });
    } catch {
      store.set({ loading: false });
    }
  })();
}

export function useSession() {
  const state = useSyncExternalStore(subscribe, getState);
  const login = useCallback(
    async (email: string, password: string, companyId?: string) => {
      const result = await authApi.login({ email, password, companyId });
      setToken(result.accessToken);
      store.set({ user: result.user });
    },
    [],
  );
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setToken(null);
      store.set({ user: null });
    }
  }, []);
  const can = useCallback(
    (...permissions: string[]) =>
      !!state.user &&
      permissions.every((p) => state.user?.permissions.includes(p) ?? false),
    [state.user],
  );

  return { ...state, login, logout, can };
}
