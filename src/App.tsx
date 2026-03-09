import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import PaymentSubmit from "./pages/PaymentSubmit";
import Loans from "./pages/Loans";
import LoanRequest from "./pages/LoanRequest";
import Emergencies from "./pages/Emergencies";
import Profile from "./pages/Profile";
import Install from "./pages/Install";
import ResetPassword from "./pages/ResetPassword";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import EmergencyAdminDashboard from "./pages/admin/EmergencyAdminDashboard";
import PetrolLoanDashboard from "./pages/admin/PetrolLoanDashboard";
import PersonalLoanDashboard from "./pages/admin/PersonalLoanDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminVerify from "./pages/admin/AdminVerify";
import AdminLoans from "./pages/admin/AdminLoans";
import AdminPetrolLoans from "./pages/admin/AdminPetrolLoans";
import AdminPersonalLoans from "./pages/admin/AdminPersonalLoans";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminEmergencyPayments from "./pages/admin/AdminEmergencyPayments";
import AdminEmergencyReports from "./pages/admin/AdminEmergencyReports";
import AdminPetrolLoanReports from "./pages/admin/AdminPetrolLoanReports";
import AdminPersonalLoanReports from "./pages/admin/AdminPersonalLoanReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReports from "./pages/admin/AdminReports";
import AdminContributionSettings from "./pages/admin/AdminContributionSettings";
import AdminCycles from "./pages/admin/AdminCycles";
import AdminRoles from "./pages/admin/AdminRoles";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/submit" element={<PaymentSubmit />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/request" element={<LoanRequest />} />
            <Route path="/emergencies" element={<Emergencies />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/install" element={<Install />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/admin/emergency-dashboard" element={<EmergencyAdminDashboard />} />
            <Route path="/admin/petrol-dashboard" element={<PetrolLoanDashboard />} />
            <Route path="/admin/personal-loan-dashboard" element={<PersonalLoanDashboard />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/verify" element={<AdminVerify />} />
            <Route path="/admin/loans" element={<AdminLoans />} />
            <Route path="/admin/petrol-loans" element={<AdminPetrolLoans />} />
            <Route path="/admin/personal-loans" element={<AdminPersonalLoans />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/emergency-payments" element={<AdminEmergencyPayments />} />
            <Route path="/admin/emergency-reports" element={<AdminEmergencyReports />} />
            <Route path="/admin/petrol-loan-reports" element={<AdminPetrolLoanReports />} />
            <Route path="/admin/personal-loan-reports" element={<AdminPersonalLoanReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/contribution-settings" element={<AdminContributionSettings />} />
            <Route path="/admin/cycles" element={<AdminCycles />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
