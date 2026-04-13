import { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { AppBrandWidget } from './AppBrandWidget';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldX } from 'lucide-react';
import { ROUTE_MODULE_MAP } from '@/lib/roles';
import { Card, CardContent } from '@/components/ui/card';

interface AppLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function AppLayout({ children, requireAuth = true, requireAdmin = false }: AppLayoutProps) {
  const { user, isLoading, isAdmin, canAccessRoute } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center animate-pulse">
            <span className="text-accent-foreground font-extrabold text-xl">H</span>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check module-level access for admin routes
  if (requireAdmin && isAdmin) {
    const module = ROUTE_MODULE_MAP[location.pathname];
    if (module && !canAccessRoute(location.pathname)) {
      return (
        <div className="min-h-screen bg-background pb-24">
          <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
            <div className="w-full max-w-[720px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <AppBrandWidget />
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                {user && <NotificationBell />}
              </div>
            </div>
          </header>
          <main className="w-full max-w-[720px] mx-auto px-4 py-6">
            <Card>
              <CardContent className="p-8 text-center">
                <ShieldX className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-bold mb-2">Access Denied</h2>
                <p className="text-sm text-muted-foreground">
                  You don't have permission to access this module. Contact a Super Admin to request access.
                </p>
              </CardContent>
            </Card>
          </main>
          {user && <MobileNav />}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="w-full max-w-[720px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <AppBrandWidget />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {user && <NotificationBell />}
          </div>
        </div>
      </header>
      <main className="w-full max-w-[720px] mx-auto px-4 py-6">
        {children}
      </main>
      {user && <MobileNav />}
    </div>
  );
}
