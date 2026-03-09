import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, isAnyAdmin, isSuperAdmin, canAccessModule, canAccessRoute, getAllowedModules, AdminModule } from '@/lib/roles';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  userRoles: AppRole[];
  isSuperAdmin: boolean;
  canAccessModule: (module: AdminModule) => boolean;
  canAccessRoute: (route: string) => boolean;
  getAllowedModules: () => Set<AdminModule>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);

  const isAdminValue = isAnyAdmin(userRoles);
  const isSuperAdminValue = isSuperAdmin(userRoles);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRoles([]);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRoles(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const roles = (data || []).map(r => r.role as AppRole);
    setUserRoles(roles);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (!profile) {
        const fullName = data.user.user_metadata?.full_name || email.split('@')[0];
        await supabase
          .from('member_profiles')
          .insert({
            user_id: data.user.id,
            full_name: fullName,
            status: 'pending',
          });
      }
    }
    
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) return { error: error as Error };

    if (data.user) {
      const { error: profileError } = await supabase
        .from('member_profiles')
        .insert({
          user_id: data.user.id,
          full_name: fullName,
          status: 'pending',
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRoles([]);
  };

  const resetPasswordFn = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAdmin: isAdminValue,
      userRoles,
      isSuperAdmin: isSuperAdminValue,
      canAccessModule: (module: AdminModule) => canAccessModule(userRoles, module),
      canAccessRoute: (route: string) => canAccessRoute(userRoles, route),
      getAllowedModules: () => getAllowedModules(userRoles),
      signIn,
      signUp,
      signOut,
      resetPassword: resetPasswordFn,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR, context can momentarily be undefined. 
    // Return a safe fallback to avoid crashing the entire app.
    console.warn('useAuth called outside AuthProvider — likely HMR. Returning fallback.');
    return {
      user: null,
      session: null,
      isLoading: true,
      isAdmin: false,
      userRoles: [] as AppRole[],
      isSuperAdmin: false,
      canAccessModule: () => false,
      canAccessRoute: () => false,
      getAllowedModules: () => new Set<AdminModule>(),
      signIn: async () => ({ error: new Error('Not initialized') }),
      signUp: async () => ({ error: new Error('Not initialized') }),
      signOut: async () => {},
      resetPassword: async () => ({ error: new Error('Not initialized') }),
      updatePassword: async () => ({ error: new Error('Not initialized') }),
    } as AuthContextType;
  }
  return context;
}
