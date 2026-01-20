import { Link, useLocation } from 'react-router-dom';
import { Home, CreditCard, Wallet, AlertTriangle, User, Settings, Users, FileCheck, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const memberNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/loans', label: 'Loans', icon: Wallet },
  { href: '/emergencies', label: 'Emergency', icon: AlertTriangle },
  { href: '/profile', label: 'Profile', icon: User },
];

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/verify', label: 'Verify', icon: FileCheck },
  { href: '/admin/loans', label: 'Loans', icon: Wallet },
  { href: '/admin/events', label: 'Events', icon: AlertTriangle },
];

export function MobileNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  const navItems = isAdminRoute ? adminNavItems : memberNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-accent")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
