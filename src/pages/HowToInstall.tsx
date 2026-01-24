import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { InstallButton } from '@/components/pwa/InstallButton';
import { InstalledBadge } from '@/components/pwa/InstalledBadge';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { 
  Smartphone, 
  Share, 
  Plus, 
  Download, 
  Chrome, 
  MoreVertical,
  CheckCircle
} from 'lucide-react';

export default function HowToInstall() {
  const { isInstalled, isIOS } = usePWAInstall();

  return (
    <AppLayout requireAuth={false}>
      <PageHeader 
        title="Install Hustlers" 
        subtitle="Add to your home screen"
        action={<InstalledBadge />}
      />

      {isInstalled ? (
        <Card className="mb-6 bg-success/10 border-success/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success-foreground" />
            </div>
            <div>
              <p className="font-medium text-success">App Installed!</p>
              <p className="text-sm text-muted-foreground">
                Hustlers is installed on your device
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 bg-accent/10 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-accent font-extrabold text-lg">H</span>
              </div>
              <div>
                <p className="font-semibold">Quick Install</p>
                <p className="text-xs text-muted-foreground">
                  One tap to add to home screen
                </p>
              </div>
            </div>
            <InstallButton className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* iOS Instructions */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">iPhone / iPad (Safari)</p>
              <p className="text-xs text-muted-foreground">iOS devices</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Open in Safari</p>
                <p className="text-xs text-muted-foreground">
                  Make sure you're using the Safari browser
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                2
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  Tap the Share button <Share className="h-4 w-4" />
                </p>
                <p className="text-xs text-muted-foreground">
                  Located at the bottom center of the screen
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                3
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  Select "Add to Home Screen" <Plus className="h-4 w-4" />
                </p>
                <p className="text-xs text-muted-foreground">
                  Scroll down in the share menu to find it
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                4
              </div>
              <div>
                <p className="font-medium text-sm">Tap "Add"</p>
                <p className="text-xs text-muted-foreground">
                  Confirm by tapping Add in the top right
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Android Instructions */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Chrome className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Android (Chrome)</p>
              <p className="text-xs text-muted-foreground">Samsung, Pixel, etc.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Open in Chrome</p>
                <p className="text-xs text-muted-foreground">
                  Use the Chrome browser for best experience
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                2
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  Tap the menu <MoreVertical className="h-4 w-4" />
                </p>
                <p className="text-xs text-muted-foreground">
                  Three dots in the top right corner
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                3
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  Tap "Install app" or "Add to Home screen" <Download className="h-4 w-4" />
                </p>
                <p className="text-xs text-muted-foreground">
                  You may also see an install banner at the bottom
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                4
              </div>
              <div>
                <p className="font-medium text-sm">Confirm installation</p>
                <p className="text-xs text-muted-foreground">
                  Tap "Install" in the popup dialog
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardContent className="p-4">
          <p className="font-medium mb-3">Why install the app?</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              Quick access from your home screen
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              Works offline with cached data
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              Full screen experience, no browser bars
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              Faster loading times
            </li>
          </ul>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
