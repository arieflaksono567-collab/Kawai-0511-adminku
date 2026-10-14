import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminUser, AdminRole } from '../../types/database';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isDemoSession: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoAdmin: (role: AdminRole) => void;
  logout: () => Promise<void>;
  hasRole: (requiredRoles: AdminRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoSession, setIsDemoSession] = useState(false);

  useEffect(() => {
    // Check existing session
    const initAuth = async () => {
      setIsLoading(true);

      // Check saved demo session in sessionStorage
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

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Verify role in public.admin_users
            const { data: adminRecord, error } = await supabase
              .from('admin_users')
              .select('*')
              .eq('id', session.user.id)
              .eq('is_active', true)
              .single();

            if (adminRecord && !error) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                full_name: adminRecord.full_name || 'Admin KAWAI',
                role: adminRecord.role as AdminRole,
                is_active: adminRecord.is_active,
                created_at: adminRecord.created_at,
              });
              setIsDemoSession(false);
            }
          }
        } catch (err) {
          console.error('Failed to restore Supabase session', err);
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
      return { 
        success: false, 
        error: 'Database Supabase belum terhubung di environment variables. Silakan gunakan Mode Evaluasi / Audit.' 
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { success: false, error: error?.message || 'Login gagal' };
      }

      // Check admin status in admin_users
      const { data: adminRecord, error: roleError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (roleError || !adminRecord || !adminRecord.is_active) {
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Akun Anda tidak terdaftar sebagai administrator aktif KAWAI 0511 (Akses Ditolak).' 
        };
      }

      const adminUser: AdminUser = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: adminRecord.full_name,
        role: adminRecord.role,
        is_active: adminRecord.is_active,
        created_at: adminRecord.created_at,
      };

      setUser(adminUser);
      setIsDemoSession(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error saat menghubungi Supabase Auth' };
    }
  };

  const loginAsDemoAdmin = (role: AdminRole) => {
    const roleNames: Record<AdminRole, string> = {
      superadmin: 'Super Admin KAWAI',
      dispatcher: 'Operator Dispatcher',
      finance: 'Admin Finansial & Omset',
      support: 'Customer Care Support',
    };

    const demoUser: AdminUser = {
      id: `demo-${role}-${Date.now()}`,
      email: `${role}.demo@kawai0511.id`,
      full_name: roleNames[role],
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setUser(demoUser);
    setIsDemoSession(true);
    sessionStorage.setItem('kawai_demo_admin_user', JSON.stringify(demoUser));
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
    if (user.role === 'superadmin') return true; // Superadmin has all permissions
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isDemoSession,
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
