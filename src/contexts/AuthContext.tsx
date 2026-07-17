import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiService } from '@/lib/api';
import { claimGuestIfPresent } from '@/lib/guest';

export interface AuthEntitlements {
  plan: string;
  plan_label?: string;
  features: string[];
  limits: Record<string, number | null>;
}

export interface AuthUser {
  email: string;
  name?: string;
  role?: string;
  sector?: string;
  plan?: string;
  onboarded?: boolean;
  isAdmin?: boolean;
  preferences?: Record<string, unknown>;
  entitlements?: AuthEntitlements;
}

type ProfileData = NonNullable<Awaited<ReturnType<typeof apiService.getProfile>>['data']>;

function mapProfile(data: ProfileData): AuthUser {
  return {
    email: data.email,
    name: data.name,
    role: data.role,
    sector: data.sector,
    plan: data.plan,
    onboarded: data.onboarded,
    isAdmin: !!data.is_admin,
    preferences: data.preferences,
    entitlements: data.entitlements,
  };
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** @deprecated use isAdmin — kept for back-compat with existing callers */
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    session_id?: string,
    fingerprint_hash?: string
  ) => Promise<{ error?: string }>;
  register: (
    email: string,
    password: string,
    role?: string,
    sector?: string,
    session_id?: string,
    fingerprint_hash?: string
  ) => Promise<{ error?: string }>;
  checkUser: (fingerprint_hash: string) => Promise<{ exists: boolean; email?: string } | null>;
  updateProfile: (data: { name?: string; role?: string; sector?: string }) => Promise<{ error?: string }>;
  /** Persist onboarding/personalization preferences; refreshes the user. */
  savePreferences: (prefs: Record<string, unknown>) => Promise<{ error?: string }>;
  /** Store a token (e.g. from a social-login callback) and load the profile. */
  hydrateFromToken: (token: string) => Promise<{ error?: string }>;
  /** Re-fetch the profile (after plan change, onboarding, etc.). */
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const profileResponse = await apiService.getProfile();
    if (profileResponse.data) {
      setUser(mapProfile(profileResponse.data));
    }
  }, []);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = apiService.getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }
        const response = await apiService.verifyToken();
        if (response.error || !response.data?.valid) {
          apiService.logout();
          setUser(null);
        } else {
          await refreshProfile();
        }
      } catch {
        apiService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();

    const onSessionExpired = () => {
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', onSessionExpired);
    };
  }, [refreshProfile]);

  const login = async (
    email: string,
    password: string,
    session_id?: string,
    fingerprint_hash?: string
  ) => {
    try {
      const response = await apiService.login(email, password, session_id, fingerprint_hash);
      if (response.error) {
        return { error: response.error };
      }
      if (response.data) {
        // Claim any guest-onboarding work (resume + tailors) into this
        // account before the app loads — idempotent server-side, clears
        // guest_id on success, and never fails the login.
        await claimGuestIfPresent();
        await refreshProfile();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:login'));
        }
      }
      return {};
    } catch {
      return { error: 'Login failed. Please try again.' };
    }
  };

  const register = async (
    email: string,
    password: string,
    role?: string,
    sector?: string,
    session_id?: string,
    fingerprint_hash?: string
  ) => {
    try {
      const response = await apiService.register(
        email,
        password,
        role,
        sector,
        session_id,
        fingerprint_hash
      );
      if (response.error) {
        return { error: response.error };
      }
      // Don't auto-login — clear any token set by the API call and let the
      // user sign in explicitly.
      apiService.logout();
      return { success: true };
    } catch {
      return { error: 'Registration failed. Please try again.' };
    }
  };

  const checkUser = async (fingerprint_hash: string) => {
    try {
      const response = await apiService.checkUser(fingerprint_hash);
      if (response.data) {
        return { exists: response.data.exists, email: response.data.email };
      }
      return null;
    } catch {
      return null;
    }
  };

  const updateProfile = useCallback(async (data: { name?: string; role?: string; sector?: string }) => {
    try {
      const response = await apiService.updateProfile(data);
      if (response.error) {
        return { error: response.error };
      }
      if (response.data) {
        setUser(mapProfile(response.data as ProfileData));
      }
      return {};
    } catch {
      return { error: 'Failed to update profile.' };
    }
  }, []);

  const savePreferences = useCallback(async (prefs: Record<string, unknown>) => {
    try {
      const response = await apiService.savePreferences(prefs);
      if (response.error) {
        return { error: response.error };
      }
      if (response.data) {
        setUser(mapProfile(response.data as ProfileData));
      }
      return {};
    } catch {
      return { error: 'Failed to save preferences.' };
    }
  }, []);

  const hydrateFromToken = useCallback(async (token: string) => {
    try {
      apiService.setToken(token);
      const verify = await apiService.verifyToken();
      if (verify.error || !verify.data?.valid) {
        apiService.logout();
        setUser(null);
        return { error: 'Sign-in could not be completed. Please try again.' };
      }
      // Social sign-in path — same guest-claim hook as password login.
      await claimGuestIfPresent();
      await refreshProfile();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:login'));
      }
      return {};
    } catch {
      apiService.logout();
      setUser(null);
      return { error: 'Sign-in could not be completed. Please try again.' };
    }
  }, [refreshProfile]);

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  const isAdmin = !!user?.isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSuperAdmin: isAdmin,
        isAdmin,
        isLoading,
        login,
        register,
        checkUser,
        updateProfile,
        savePreferences,
        hydrateFromToken,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
