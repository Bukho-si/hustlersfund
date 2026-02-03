import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Share, 
  PlusSquare,
  Chrome,
  Zap,
  Bell,
  Wifi
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);
    
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <AppLayout requireAuth={false}>
        <div className="text-center py-8">
          <div className="h-16 w-16 rounded-2xl bg-success/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">App Installed!</h1>
          <p className="text-muted-foreground">
            You're using Hustlers Fund as an installed app.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requireAuth={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Smartphone className="h-10 w-10 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Install Hustlers Fund</h1>
          <p className="text-muted-foreground text-sm">
            Add to your home screen for quick access
          </p>
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Why install?</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm">Instant Access</p>
                <p className="text-xs text-muted-foreground">Launch directly from your home screen</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-info/20 flex items-center justify-center flex-shrink-0">
                <Wifi className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="font-medium text-sm">Works Offline</p>
                <p className="text-xs text-muted-foreground">Access your data even without internet</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                <Bell className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm">Full Screen Experience</p>
                <p className="text-xs text-muted-foreground">No browser bars, feels like a native app</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Actions */}
        {isInstalled ? (
          <Alert className="border-success/30 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription>
              <strong>App installed successfully!</strong> Find it on your home screen.
            </AlertDescription>
          </Alert>
        ) : deferredPrompt ? (
          <Button 
            onClick={handleInstallClick} 
            className="w-full h-14 text-base font-semibold bg-accent hover:bg-accent/90"
          >
            <Download className="h-5 w-5 mr-2" />
            Install App
          </Button>
        ) : isIOS ? (
          <Card className="border-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Share className="h-4 w-4" />
                Install on iPhone/iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">1</div>
                <p className="text-sm">Tap the <Share className="inline h-4 w-4 mx-1" /> Share button</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">2</div>
                <p className="text-sm">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">3</div>
                <p className="text-sm">Tap <strong>"Add"</strong> in the top right</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Chrome className="h-4 w-4" />
                Install on Android
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">1</div>
                <p className="text-sm">Tap the menu <strong>⋮</strong> in your browser</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">2</div>
                <p className="text-sm">Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">3</div>
                <p className="text-sm">Confirm by tapping <strong>"Install"</strong></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer note */}
        <p className="text-xs text-center text-muted-foreground">
          No app store needed. Install directly from your browser.
        </p>
      </div>
    </AppLayout>
  );
}
