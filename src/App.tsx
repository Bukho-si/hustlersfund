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

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminVerify from "./pages/admin/AdminVerify";
import AdminLoans from "./pages/admin/AdminLoans";
import AdminEvents from "./pages/admin/AdminEvents";

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
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/verify" element={<AdminVerify />} />
            <Route path="/admin/loans" element={<AdminLoans />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
