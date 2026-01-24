import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, CheckCircle } from 'lucide-react';
import { IOSInstallDialog } from './IOSInstallDialog';

interface InstallButtonProps {
  variant?: 'default' | 'compact' | 'footer';
  className?: string;
}

export function InstallButton({ variant = 'default', className = '' }: InstallButtonProps) {
  const { isInstalled, canInstall, isIOSSafari, promptInstall, hasNativePrompt } = usePWAInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  if (isInstalled) {
    if (variant === 'compact') {
      return (
        <div className={`flex items-center gap-1.5 text-success text-xs ${className}`}>
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Installed</span>
        </div>
      );
    }
    return null;
  }

  if (!canInstall) {
    return null;
  }

  const handleClick = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    } else if (isIOSSafari) {
      setShowIOSDialog(true);
    } else {
      // For other browsers without native prompt, show iOS-style instructions
      setShowIOSDialog(true);
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className={`h-8 px-2 text-xs ${className}`}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Install
        </Button>
        <IOSInstallDialog open={showIOSDialog} onOpenChange={setShowIOSDialog} />
      </>
    );
  }

  if (variant === 'footer') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors ${className}`}
        >
          <Download className="h-4 w-4" />
          <span>Install Hustlers App</span>
        </button>
        <IOSInstallDialog open={showIOSDialog} onOpenChange={setShowIOSDialog} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        className={`bg-accent text-accent-foreground hover:bg-accent/90 ${className}`}
      >
        <Download className="h-4 w-4 mr-2" />
        Install Hustlers App
      </Button>
      <IOSInstallDialog open={showIOSDialog} onOpenChange={setShowIOSDialog} />
    </>
  );
}
