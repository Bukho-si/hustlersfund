import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/lib/roleRedirect';
import { Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userRoles, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const dest = getDashboardRoute(userRoles);
      navigate(dest, { replace: true });
    }
  }, [isLoading, userRoles, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}
