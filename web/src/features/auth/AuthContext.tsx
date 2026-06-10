import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  clearAuthToken,
  fetchMe,
  getAuthToken,
  listUsers,
  login as loginRequest,
  createUser as createUserRequest,
  deleteUser as deleteUserRequest,
  updateUserPassword as updatePasswordRequest,
} from "./api";
import type {
  ConsoleUser,
  CreateUserInput,
  LoginRequest,
  UpdatePasswordInput,
} from "./types";

type AuthContextValue = {
  user: ConsoleUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  login: (input: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;

  // Management (only meaningful for admin users)
  users: ConsoleUser[];
  refreshUsers: () => Promise<void>;
  createUser: (input: CreateUserInput) => Promise<ConsoleUser>;
  updatePassword: (userId: number, input: UpdatePasswordInput) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<ConsoleUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<ConsoleUser[]>([]);

  const refreshMe = useCallback(async () => {
    const t = getAuthToken();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      setToken(t);
    } catch (e) {
      // Invalid/expired token
      clearAuthToken();
      setUser(null);
      setToken(null);
      throw e;
    }
  }, []);

  const login = useCallback(
    async (input: LoginRequest) => {
      setError(null);
      setLoading(true);
      try {
        const result = await loginRequest(input);
        setToken(result.token);
        setUser(result.user);
        // Optionally refresh full profile
        await refreshMe().catch(() => {});
        // Navigation is handled by the caller (LoginPage) or router guards
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Login failed";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [refreshMe]
  );

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setToken(null);
    setUsers([]);
    // Use full navigation since we may be deep in protected routes
    window.location.href = "/login";
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const list = await listUsers();
      setUsers(list);
    } catch (e) {
      // If 401 the global handler below can react, but for list we just surface
      throw e;
    }
  }, []);

  const createUser = useCallback(async (input: CreateUserInput) => {
    const created = await createUserRequest(input);
    await refreshUsers().catch(() => {});
    return created;
  }, [refreshUsers]);

  const updatePassword = useCallback(async (userId: number, input: UpdatePasswordInput) => {
    await updatePasswordRequest(userId, input);
  }, []);

  const deleteUser = useCallback(async (userId: number) => {
    await deleteUserRequest(userId);
    await refreshUsers().catch(() => {});
  }, [refreshUsers]);

  // On mount: if we have a token, try to restore session
  useEffect(() => {
    const t = getAuthToken();
    if (!t) {
      setLoading(false);
      return;
    }
    refreshMe()
      .catch(() => {
        // token bad; already cleared in refreshMe
      })
      .finally(() => setLoading(false));
  }, [refreshMe]);

  // Global 401 handling for future fetches (simple approach)
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await origFetch(input, init);
      if (res.status === 401) {
        // Only auto-logout for our API paths (heuristic)
        const url = typeof input === "string" ? input : (input as Request).url || "";
        if (url.includes("/auth/") || url.includes("/devices") || url.includes("/send") || url.includes("/app/")) {
          clearAuthToken();
          setUser(null);
          setToken(null);
          // Soft redirect hint; pages can also react to user===null
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        }
      }
      return res;
    };
    return () => {
      window.fetch = origFetch;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      error,
      login,
      logout,
      refreshMe,
      users,
      refreshUsers,
      createUser,
      updatePassword,
      deleteUser,
    }),
    [user, token, loading, error, login, logout, refreshMe, users, refreshUsers, createUser, updatePassword, deleteUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
