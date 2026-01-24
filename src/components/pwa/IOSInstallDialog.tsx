import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Share, Plus, Smartphone } from 'lucide-react';

interface IOSInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IOSInstallDialog({ open, onOpenChange }: IOSInstallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-accent" />
            Install Hustlers App
          </DialogTitle>
          <DialogDescription>
            Add Hustlers to your home screen for quick access
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold">1</span>
            </div>
            <div>
              <p className="font-medium text-sm">Tap the Share button</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Look for the <Share className="h-3 w-3 inline mx-0.5" /> icon at the bottom of your browser
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold">2</span>
            </div>
            <div>
              <p className="font-medium text-sm">Tap "Add to Home Screen"</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scroll down and look for <Plus className="h-3 w-3 inline mx-0.5" /> Add to Home Screen
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 rounded-lg bg-muted">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold">3</span>
            </div>
            <div>
              <p className="font-medium text-sm">Tap "Add"</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirm by tapping Add in the top right corner
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            The app will appear on your home screen just like a regular app!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
