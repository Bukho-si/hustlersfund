import { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { AppBrandWidget } from './AppBrandWidget';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function AppLayout({ children, requireAuth = true, requireAdmin = false }: AppLayoutProps) {
  const { user, isLoading, isAdmin } = useAuth();
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center">
          <AppBrandWidget />
        </div>
      </header>
      <main className="container max-w-lg mx-auto px-4 py-4">
        {children}
      </main>
      {user && <MobileNav />}
    </div>
  );
}
