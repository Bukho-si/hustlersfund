import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Car, Lock } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, session } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check if user arrived via password reset link
  useEffect(() => {
    if (!session) {
      // Wait a moment for session to be established from the reset link
      const timeout = setTimeout(() => {
        if (!session) {
          toast({
            title: 'Invalid Reset Link',
            description: 'This password reset link is invalid or has expired. Please request a new one.',
            variant: 'destructive',
          });
          navigate('/auth');
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [session, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Password Updated',
      description: 'Your password has been successfully reset. Please sign in with your new password.',
    });
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center">
            <Car className="h-8 w-8 text-accent-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-primary-foreground mb-2">
          Hustlers
        </h1>
        <p className="text-primary-foreground/80 text-sm max-w-xs">
          Reset your password
        </p>
      </div>

      {/* Reset Card */}
      <Card className="rounded-t-3xl rounded-b-none border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <PasswordInput
                id="confirm-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Reset Password'}
            </Button>
            <Button 
              type="button"
              variant="ghost" 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
