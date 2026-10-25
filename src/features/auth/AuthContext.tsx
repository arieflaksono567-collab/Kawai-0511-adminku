import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, isDemoModeAllowed } from '../../lib/supabase';
import { AdminUser, AdminRole, DbUserProfile } from '../../types/database';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isDemoSession: boolean;
  isDemoAllowed: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoAdmin: (role: AdminRole) => { success: boolean; error?: string };
  logout: () => Promise<void>;
  hasRole: (requiredRoles: AdminRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoSession, setIsDemoSession] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      // Restore demo session ONLY if demo mode is explicitly allowed in development
      if (isDemoModeAllowed) {
        const savedDemo = sessionStorage.getItem('kawai_demo_admin_user');
        if (savedDemo) {
          try {
            const parsed = JSON.parse(savedDemo);
            setUser(parsed);
            setIsDemoSession(true);
            setIsLoading(false);
            return;
          } catch (e) {
            sessionStorage.removeItem('kawai_demo_admin_user');
          }
        }
      } else {
        // Enforce cleanup in production
        sessionStorage.removeItem('kawai_demo_admin_user');
      }

      // Check real Supabase Auth session
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (session?.user && !sessionError) {
            // Check authorization against production table: user_profiles
            // Schema has columns: id, display_name, phone, avatar_url, role, created_at, updated_at
            const { data: profileRecord, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, display_name, phone, avatar_url, role, created_at, updated_at')
              .eq('id', session.user.id)
              .maybeSingle();

            const isAuthorizedAdmin = Boolean(
              profileRecord && 
              !profileError && 
              (profileRecord.role === 'admin' || profileRecord.role === 'superadmin')
            );

            if (isAuthorizedAdmin && profileRecord) {
              const name = profileRecord.display_name || session.user.email?.split('@')[0] || 'Administrator';
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                display_name: name,
                full_name: name,
                role: 'admin',
                is_admin: true,
                avatar_url: profileRecord.avatar_url,
                created_at: profileRecord.created_at,
                updated_at: profileRecord.updated_at,
              });
              setIsDemoSession(false);
            } else {
              // Not an authorized admin: invalidate session
              await supabase.auth.signOut();
              setUser(null);
            }
          }
        } catch (err) {
          console.error('Failed to verify Supabase admin session:', err);
        }
      }

      setIsLoading(false);
    };

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setIsDemoSession(false);
        }
      });
      return () => authListener.subscription.unsubscribe();
    }
  }, []);

  const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      if (isDemoModeAllowed) {
        // Authenticate into operational dashboard directly with administrator privileges
        const adminName = email.split('@')[0] || 'Administrator';
        const adminUser: AdminUser = {
          id: 'usr-admin-0511',
          email: email || 'admin@kawai0511.id',
          display_name: adminName,
          full_name: adminName,
          role: 'superadmin',
          is_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(adminUser);
        setIsDemoSession(true);
        sessionStorage.setItem('kawai_demo_admin_user', JSON.stringify(adminUser));
        return { success: true };
      }
      return {
        success: false,
        error: 'Sistem belum terhubung ke Supabase produksi. Hubungi Administrator Sistem.'
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { success: false, error: error?.message || 'Login gagal. Periksa kembali email dan kata sandi.' };
      }

      // Check admin status against production table: user_profiles
      // Schema columns: id, display_name, phone, avatar_url, role, created_at, updated_at
      const { data: profileRecord, error: roleError } = await supabase
        .from('user_profiles')
        .select('id, display_name, phone, avatar_url, role, created_at, updated_at')
        .eq('id', data.user.id)
        .maybeSingle();

      const isAuthorizedAdmin = Boolean(
        profileRecord && 
        !roleError && 
        (profileRecord.role === 'admin' || profileRecord.role === 'superadmin')
      );

      if (!isAuthorizedAdmin || !profileRecord) {
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Akun Anda terdaftar tetapi tidak memiliki otorisasi administrator operasional KAWAI 0511 (HTTP 403 Akses Ditolak).' 
        };
      }

      const name = profileRecord.display_name || data.user.email?.split('@')[0] || 'Administrator';
      const adminUser: AdminUser = {
        id: data.user.id,
        email: data.user.email || '',
        display_name: name,
        full_name: name,
        role: 'admin',
        is_admin: true,
        avatar_url: profileRecord.avatar_url,
        created_at: profileRecord.created_at,
        updated_at: profileRecord.updated_at,
      };

      setUser(adminUser);
      setIsDemoSession(false);
      sessionStorage.removeItem('kawai_demo_admin_user');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error saat menghubungi layanan Supabase Auth.' };
    }
  };

  const loginAsDemoAdmin = (role: AdminRole): { success: boolean; error?: string } => {
    if (!isDemoModeAllowed) {
      return {
        success: false,
        error: 'Mode demo dinonaktifkan di lingkungan produksi. Akses ditolak.'
      };
    }

    const demoUser: AdminUser = {
      id: `usr-0511-demo-${role}`,
      email: `${role}.demo@kawai0511.com`,
      display_name: `Administrator Demo (${role.toUpperCase()})`,
      full_name: `Administrator Demo (${role.toUpperCase()})`,
      role: role,
      is_admin: true,
      created_at: new Date().toISOString(),
    };

    setUser(demoUser);
    setIsDemoSession(true);
    sessionStorage.setItem('kawai_demo_admin_user', JSON.stringify(demoUser));
    return { success: true };
  };

  const logout = async (): Promise<void> => {
    if (isDemoSession) {
      sessionStorage.removeItem('kawai_demo_admin_user');
      setUser(null);
      setIsDemoSession(false);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsDemoSession(false);
  };

  const hasRole = (requiredRoles: AdminRole[]): boolean => {
    if (!user) return false;
    // In production database, role is 'admin', which has full administrative access
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isDemoSession,
      isDemoAllowed: isDemoModeAllowed,
      loginWithPassword,
      loginAsDemoAdmin,
      logout,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
