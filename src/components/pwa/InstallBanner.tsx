import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function InstallBanner() {
  const { isInstalled, isInstallable, promptInstall, dismissPrompt } = usePwaInstall();

  // Don't show if already installed
  if (isInstalled) return null;

  // Show native install prompt for Android/Chrome
  if (isInstallable) {
    return (
      <Card className="mb-4 border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install Hustlers Fund</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get quick access from your home screen with offline support
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={promptInstall}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={dismissPrompt}
                >
                  Later
                </Button>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 flex-shrink-0"
              onClick={dismissPrompt}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show guide for iOS users (beforeinstallprompt not supported)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return (
      <Card className="mb-4 border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Add to Home Screen</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Install this app for quick access and offline support
              </p>
              <Link to="/install">
                <Button 
                  size="sm" 
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  See How
                </Button>
              </Link>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 flex-shrink-0"
              onClick={dismissPrompt}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
