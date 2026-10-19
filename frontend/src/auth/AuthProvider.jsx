import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthTokenGetter, fetchCurrentUser, loginUser, signupUser, acceptInviteUser } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'macai_auth_token';
const USER_KEY = 'macai_auth_user';

function getInitials(name = '', email = '') {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'AD';
}

const DEMO_USER = {
  id: 'auth0|superadmin_dev_01',
  name: 'Administrator',
  email: 'admin@macpulse.tech',
  role: 'Super Admin',
  initials: 'AD',
};
const DEMO_TOKEN = 'dev-superadmin';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || DEMO_TOKEN;
    } catch {
      return DEMO_TOKEN;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : DEMO_USER;
    } catch {
      return DEMO_USER;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Synchronize api.js token getter immediately and keep updated
  if (token) {
    setAuthTokenGetter(async () => token);
  } else {
    setAuthTokenGetter(async () => DEMO_TOKEN);
  }

  useEffect(() => {
    setAuthTokenGetter(async () => token || DEMO_TOKEN);
  }, [token]);

  // If token exists on load, verify session in background with /api/v1/me
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    fetchCurrentUser()
      .then((profile) => {
        if (!isMounted) return;
        const initials = getInitials(profile.name, profile.email);
        const updatedUser = { ...profile, initials };
        setUser(updatedUser);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        } catch (e) {
          console.warn('Could not save user profile to localStorage', e);
        }
      })
      .catch((err) => {
        console.warn('Stored token background verification warning:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = useCallback(async ({ email, password }) => {
    const data = await loginUser({ email, password });
    const authToken = data.access_token || data.id_token;
    const profile = data.user || {};
    const initials = getInitials(profile.name, profile.email);
    const fullUser = { ...profile, initials };

    setToken(authToken);
    setUser(fullUser);

    try {
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
    } catch (e) {
      console.warn('Could not persist session', e);
    }
    return fullUser;
  }, []);

  const signup = useCallback(async ({ email, password, name }) => {
    const data = await signupUser({ email, password, name });
    const authToken = data.access_token || data.id_token;
    const profile = data.user || {};
    const initials = getInitials(profile.name, profile.email);
    const fullUser = { ...profile, initials };

    setToken(authToken);
    setUser(fullUser);

    try {
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
    } catch (e) {
      console.warn('Could not persist session', e);
    }
    return fullUser;
  }, []);

  const acceptInvite = useCallback(async ({ inviteToken, password }) => {
    const data = await acceptInviteUser({ inviteToken, password });
    const authToken = data.access_token || data.id_token;
    const profile = data.user || {};
    const initials = getInitials(profile.name, profile.email);
    const fullUser = { ...profile, initials };

    setToken(authToken);
    setUser(fullUser);

    try {
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
    } catch (e) {
      console.warn('Could not persist session', e);
    }
    return fullUser;
  }, []);

  const switchDevRole = useCallback((newRole) => {
    const isSuper = newRole === 'Super Admin';
    const newToken = isSuper ? 'dev-superadmin' : 'dev-admin';
    const newUser = {
      id: isSuper ? 'auth0|superadmin_dev_01' : 'auth0|admin_dev_02',
      name: isSuper ? 'Administrator (Super Admin)' : 'Administrator (Admin)',
      email: isSuper ? 'superadmin@macpulse.tech' : 'admin@macpulse.tech',
      role: newRole,
      initials: isSuper ? 'SA' : 'AD',
    };
    setToken(newToken);
    setUser(newUser);
    setAuthTokenGetter(async () => newToken);
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    // In bypass mode, reset to default Super Admin session instead of locking the user out
    setToken(DEMO_TOKEN);
    setUser(DEMO_USER);
    setError(null);
    setAuthTokenGetter(async () => DEMO_TOKEN);
    try {
      localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
      localStorage.setItem(USER_KEY, JSON.stringify(DEMO_USER));
    } catch {}
  }, []);

  const role = user?.role || 'Super Admin';
  const isSuperAdmin = role === 'Super Admin';
  const isAdmin = role === 'Admin' || isSuperAdmin;
  const isAuthenticated = true;

  const value = {
    isAuthenticated: true,
    isLoading: false,
    error,
    user: user || DEMO_USER,
    role,
    isSuperAdmin,
    isAdmin,
    login,
    signup,
    acceptInvite,
    loginWithRedirect: login,
    logout,
    isMockAuth: true,
    switchDevRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
