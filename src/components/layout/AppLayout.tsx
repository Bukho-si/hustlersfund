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
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
        <div className="min-h-screen bg-background pb-20">
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="w-full max-w-[720px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <AppBrandWidget />
              <div className="flex items-center gap-1">
                <ThemeToggle />
                {user && <NotificationBell />}
              </div>
            </div>
          </header>
          <main className="w-full max-w-[720px] mx-auto px-4 py-4">
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
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="w-full max-w-[720px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <AppBrandWidget />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user && <NotificationBell />}
          </div>
        </div>
      </header>
      <main className="w-full max-w-[720px] mx-auto px-4 py-4">
        {children}
      </main>
      {user && <MobileNav />}
    </div>
  );
}
