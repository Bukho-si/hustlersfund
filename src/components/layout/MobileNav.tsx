import { Link, useLocation } from 'react-router-dom';
import { Home, CreditCard, Wallet, AlertTriangle, User, Users, FileCheck, Fuel, UserCog, RefreshCw, BarChart3, Settings, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AdminModule } from '@/lib/roles';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  module?: AdminModule;
}

const memberNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/loans', label: 'Loans', icon: Wallet },
  { href: '/emergencies', label: 'Emergency', icon: AlertTriangle },
  { href: '/profile', label: 'Profile', icon: User },
];

const allAdminNavItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Home, module: 'dashboard' },
  { href: '/admin/members', label: 'Members', icon: Users, module: 'members' },
  { href: '/admin/verify', label: 'Verify', icon: FileCheck, module: 'verify' },
  { href: '/admin/cycles', label: 'Cycles', icon: RefreshCw, module: 'cycles' },
  { href: '/admin/petrol-loans', label: 'Petrol', icon: Fuel, module: 'petrol_loans' },
  { href: '/admin/personal-loans', label: 'Personal', icon: DollarSign, module: 'personal_loans' },
  { href: '/admin/events', label: 'Emergency', icon: AlertTriangle, module: 'emergency_events' },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
  { href: '/admin/roles', label: 'Roles', icon: UserCog, module: 'roles' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, module: 'settings' },
];

export function MobileNav() {
  const location = useLocation();
  const { isAdmin, canAccessModule } = useAuth();
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  let navItems: NavItem[];
  if (isAdminRoute && isAdmin) {
    // Filter admin nav items by role permissions, limit to 5 for mobile
    const allowed = allAdminNavItems.filter(item => 
      !item.module || canAccessModule(item.module)
    );
    // Show first 5 items that the user has access to
    navItems = allowed.slice(0, 5);
  } else {
    navItems = memberNavItems;
  }

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
