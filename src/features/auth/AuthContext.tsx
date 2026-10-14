import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, isDemoModeAllowed } from '../../lib/supabase';
import { AdminUser, AdminRole } from '../../types/database';

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

      // Restore demo session ONLY if demo mode is explicitly allowed (e.g. DEV or VITE_ENABLE_DEMO=true)
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
        // Enforce cleanup if previously saved in development
        sessionStorage.removeItem('kawai_demo_admin_user');
      }

      // Check real Supabase Auth session
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (session?.user && !sessionError) {
            // Check authorization against production table: user_profiles
            const { data: profileRecord, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const isAuthorizedAdmin = Boolean(
              profileRecord && 
              !profileError && 
              profileRecord.status !== 'suspended' &&
              profileRecord.is_active !== false &&
              (
                profileRecord.is_admin === true ||
                ['superadmin', 'admin', 'dispatcher', 'finance', 'support'].includes(profileRecord.role)
              )
            );

            if (isAuthorizedAdmin && profileRecord) {
              const assignedRole = (profileRecord.role === 'admin' ? 'superadmin' : profileRecord.role) as AdminRole;
              setUser({
                id: session.user.id,
                email: session.user.email || profileRecord.email || '',
                full_name: profileRecord.full_name || 'Admin KAWAI',
                role: assignedRole,
                is_admin: true,
                is_active: profileRecord.is_active ?? true,
                status: profileRecord.status || 'active',
                wallet_balance: profileRecord.wallet_balance || 0,
                created_at: profileRecord.created_at,
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
        return { 
          success: false, 
          error: 'Koneksi database Supabase belum terkonfigurasi. Silakan gunakan Mode Evaluasi / Audit di lingkungan pengujian.' 
        };
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
      const { data: profileRecord, error: roleError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const isAuthorizedAdmin = Boolean(
        profileRecord && 
        !roleError && 
        profileRecord.status !== 'suspended' &&
        profileRecord.is_active !== false &&
        (
          profileRecord.is_admin === true ||
          ['superadmin', 'admin', 'dispatcher', 'finance', 'support'].includes(profileRecord.role)
        )
      );

      if (!isAuthorizedAdmin || !profileRecord) {
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Akun Anda terdaftar tetapi tidak memiliki otorisasi administrator operasional KAWAI 0511 (HTTP 403 Akses Ditolak).' 
        };
      }

      const assignedRole = (profileRecord.role === 'admin' ? 'superadmin' : profileRecord.role) as AdminRole;
      const adminUser: AdminUser = {
        id: data.user.id,
        email: data.user.email || profileRecord.email || '',
        full_name: profileRecord.full_name,
        role: assignedRole,
        is_admin: true,
        is_active: profileRecord.is_active ?? true,
        status: profileRecord.status || 'active',
        wallet_balance: profileRecord.wallet_balance || 0,
        created_at: profileRecord.created_at,
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
    // Strictly prevent demo bypass in production
    if (!isDemoModeAllowed) {
      return {
        success: false,
        error: 'Mode evaluasi / demo dinonaktifkan pada lingkungan produksi demi keamanan data.'
      };
    }

    const roleNames: Record<AdminRole, string> = {
      superadmin: 'Super Admin KAWAI',
      admin: 'Administrator Operasional',
      dispatcher: 'Operator Dispatcher',
      finance: 'Admin Finansial & Omset',
      support: 'Customer Care Support',
      customer: 'Pengguna Standar',
    };

    const demoUser: AdminUser = {
      id: `demo-${role}-${Date.now()}`,
      email: `${role}.demo@kawai0511.id`,
      full_name: roleNames[role] || 'Admin KAWAI',
      role,
      is_admin: true,
      is_active: true,
      status: 'active',
      wallet_balance: 0,
      created_at: new Date().toISOString(),
    };

    setUser(demoUser);
    setIsDemoSession(true);
    sessionStorage.setItem('kawai_demo_admin_user', JSON.stringify(demoUser));
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {}
    }
    sessionStorage.removeItem('kawai_demo_admin_user');
    setUser(null);
    setIsDemoSession(false);
  };

  const hasRole = (requiredRoles: AdminRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin' || user.role === 'admin') return true; // Superadmin/admin has full permission
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
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
