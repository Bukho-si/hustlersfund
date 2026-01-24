import { usePWAInstall } from '@/hooks/usePWAInstall';
import { CheckCircle } from 'lucide-react';

export function InstalledBadge() {
  const { isInstalled } = usePWAInstall();

  if (!isInstalled) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
      <CheckCircle className="h-3 w-3" />
      <span>Installed</span>
    </div>
  );
}
