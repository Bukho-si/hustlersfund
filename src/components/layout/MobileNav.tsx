import { Link, useLocation } from 'react-router-dom';
import { Home, CreditCard, Wallet, AlertTriangle, User, Users, FileCheck, Fuel, RefreshCw, BarChart3, Settings, DollarSign, Heart, Car, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/lib/roles';
import { getDashboardRoute } from '@/lib/roleRedirect';

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

const memberNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/loans', label: 'Loans', icon: DollarSign },
  { href: '/emergencies', label: 'Emergency', icon: AlertTriangle },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/profile', label: 'Profile', icon: User },
];

function getAdminNavItems(roles: AppRole[], dashRoute: string): NavItem[] {
  const isSuperOrAdmin = roles.includes('super_admin') || roles.includes('admin');

  if (isSuperOrAdmin) {
    return [
      { href: dashRoute, label: 'Dashboard', icon: Home },
      { href: '/admin/members', label: 'Members', icon: Users },
      { href: '/admin/verify', label: 'Verify', icon: FileCheck },
      { href: '/admin/cycles', label: 'Cycles', icon: RefreshCw },
      { href: '/admin/petrol-loans', label: 'Petrol', icon: Fuel },
      { href: '/admin/personal-loans', label: 'Personal', icon: DollarSign },
      { href: '/admin/emergency-dashboard', label: 'Emergency', icon: AlertTriangle },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ];
  }

  if (roles.includes('petrol_loan_admin')) {
    return [
      { href: dashRoute, label: 'Dashboard', icon: Home },
      { href: '/admin/petrol-loans', label: 'Petrol Loans', icon: Fuel },
      { href: '/admin/petrol-loan-reports', label: 'Reports', icon: BarChart3 },
    ];
  }

  if (roles.includes('personal_loan_admin')) {
    return [
      { href: dashRoute, label: 'Dashboard', icon: Home },
      { href: '/admin/personal-loans', label: 'Personal Loans', icon: DollarSign },
      { href: '/admin/personal-loan-reports', label: 'Reports', icon: BarChart3 },
    ];
  }

  if (roles.includes('accident_admin')) {
    return [
      { href: dashRoute, label: 'Dashboard', icon: Home },
      { href: '/admin/accident-events', label: 'Accidents', icon: Car },
      { href: '/admin/accident-payments', label: 'Payments', icon: FileCheck },
      { href: '/admin/accident-reports', label: 'Reports', icon: BarChart3 },
    ];
  }

  if (roles.includes('funeral_admin')) {
    return [
      { href: dashRoute, label: 'Dashboard', icon: Home },
      { href: '/admin/funeral-events', label: 'Funerals', icon: Heart },
      { href: '/admin/funeral-payments', label: 'Payments', icon: FileCheck },
      { href: '/admin/funeral-reports', label: 'Reports', icon: BarChart3 },
    ];
  }

  // Legacy emergency_admin
  if (roles.includes('emergency_admin')) {
    return [
      { href: dashRoute, label: 'Dashboard', icon: Home },
      { href: '/admin/events', label: 'Events', icon: AlertTriangle },
      { href: '/admin/emergency-payments', label: 'Payments', icon: FileCheck },
      { href: '/admin/emergency-reports', label: 'Reports', icon: BarChart3 },
    ];
  }

  return [{ href: dashRoute, label: 'Dashboard', icon: Home }];
}

export function MobileNav() {
  const location = useLocation();
  const { isAdmin, userRoles } = useAuth();
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  const adminDashRoute = getDashboardRoute(userRoles);
  
  let navItems: NavItem[];
  if (isAdminRoute && isAdmin) {
    navItems = getAdminNavItems(userRoles, adminDashRoute);
  } else {
    navItems = memberNavItems;
  }

  // For super admin with many items, use scrollable nav
  const isScrollable = navItems.length > 5;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className={cn(
        "flex items-center h-16 px-2",
        isScrollable ? "overflow-x-auto gap-1 justify-start" : "justify-around"
      )}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center h-full gap-1 transition-colors",
                isScrollable ? "min-w-[4rem] px-1.5" : "flex-1",
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-accent")} />
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
