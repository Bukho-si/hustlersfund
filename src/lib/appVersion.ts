// App version control — bump this on major releases
const APP_VERSION = '2.0';
const VERSION_KEY = 'hustlers_app_version';

export function checkAppVersion(): { needsRefresh: boolean; currentVersion: string; newVersion: string } {
  const stored = localStorage.getItem(VERSION_KEY);
  if (!stored || stored < APP_VERSION) {
    return { needsRefresh: true, currentVersion: stored || '0', newVersion: APP_VERSION };
  }
  return { needsRefresh: false, currentVersion: stored, newVersion: APP_VERSION };
}

export function applyVersionUpdate(): void {
  localStorage.setItem(VERSION_KEY, APP_VERSION);
  // Clear caches
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
}

export function getAppVersion(): string {
  return APP_VERSION;
}
