import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

type AuthorizationDetails = {
  client?: { name?: string; client_name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm your identity',
  email: 'Share your email address',
  profile: 'Share your basic profile',
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Missing authorization_id in the request.');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/auth?next=' + encodeURIComponent(next);
        return;
      }
      if (active) setEmail(sess.session.user.email ?? null);

      const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: decisionError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError('No redirect returned by the authorization server.');
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? details?.client?.client_name ?? 'this app';
  const scopes = (details?.scope ?? '').split(/\s+/).filter(Boolean);

  return (
    <main className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-6 space-y-5">
        {error ? (
          <div className="space-y-3 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <h1 className="text-lg font-bold text-foreground">Could not load this request</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !details ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Loading authorization request…</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="h-11 w-11 rounded-2xl bg-accent/15 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-accent" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                Connect {clientName} to Hustlers Fund
              </h1>
              <p className="text-sm text-muted-foreground">
                This lets {clientName} use Hustlers Fund as you.
              </p>
            </div>

            {email && (
              <div className="rounded-xl border border-border p-3 text-sm">
                <p className="text-muted-foreground text-xs">Signed in as</p>
                <p className="font-medium text-foreground">{email}</p>
              </div>
            )}

            {details.client?.redirect_uri && (
              <div className="rounded-xl border border-border p-3 text-sm">
                <p className="text-muted-foreground text-xs">Redirects to</p>
                <p className="font-mono text-xs break-all text-foreground">{details.client.redirect_uri}</p>
              </div>
            )}

            {scopes.length > 0 && (
              <ul className="space-y-1.5 text-sm text-foreground">
                {scopes.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>{SCOPE_LABELS[s] ?? `Additional permission requested: ${s}`}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">
              This does not bypass Hustlers Fund permissions — {clientName} only sees what your account can see.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 h-11 rounded-xl border border-border font-semibold text-sm text-foreground disabled:opacity-60"
              >
                Cancel connection
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 h-11 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-60"
              >
                {busy ? 'Working…' : 'Approve'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
