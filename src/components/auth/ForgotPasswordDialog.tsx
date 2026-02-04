import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');

interface ForgotPasswordDialogProps {
  children: React.ReactNode;
}

export function ForgotPasswordDialog({ children }: ForgotPasswordDialogProps) {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Request Failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Reset Link Sent',
      description: 'Check your email for a password reset link.',
    });
    setEmail('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Mail className="h-6 w-6 text-muted-foreground" />
          </div>
          <DialogTitle className="text-center">Forgot Password?</DialogTitle>
          <DialogDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
