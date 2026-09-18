"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca a sessão atual no banco de dados ao iniciar a página (mount)
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data && data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Falha ao checar sessão ativa:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Lógica de login com E-mail e Senha tradicional
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao realizar login');
        return false;
      }

      if (data && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro na requisição de login:', err);
      setError('Erro de conexão com o servidor');
      return false;
    }
  }, []);

  // Lógica de cadastro (Sign-up) tradicional
  const signup = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao criar conta');
        return false;
      }

      if (data && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro na requisição de cadastro:', err);
      setError('Erro de conexão com o servidor');
      return false;
    }
  }, []);

  // Lógica de login com credencial obtida do Google OAuth (Front)
  const loginWithGoogle = useCallback(async (credential: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao autenticar com o Google');
        return false;
      }

      if (data && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro na autenticação Google:', err);
      setError('Erro ao autenticar com servidores do Google');
      return false;
    }
  }, []);

  // Lógica de Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erro de rede ao deslogar:', err);
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      signup,
      loginWithGoogle,
      logout,
      clearError,
    }),
    [user, loading, error, login, signup, loginWithGoogle, logout, clearError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
