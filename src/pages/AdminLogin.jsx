import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { cachedMe, hasRole } from '@/api/khClient';
import { Scribble } from '@/components/Brand';

/** Same-origin return targets only — never bounce to an external URL. */
function safeReturnTo(raw) {
  if (!raw) return '/admin/dashboard';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/admin/dashboard';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/admin/dashboard';
  }
}

function getGoogleOAuthUrl(returnTo) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/auth/google/callback`;
  const state = btoa(JSON.stringify({ redirectUri, returnTo }));

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);
  return url.toString();
}

const ERROR_COPY = {
  access_denied: 'Sign-in was cancelled.',
  not_authorized: "That Google account isn't on the staff list. Ask an admin to add your email.",
  server_error: 'Something went wrong on our end. Try again in a moment.',
};

export default function AdminLogin() {
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const returnTo = safeReturnTo(params.get('returnTo'));
  const errorCode = params.get('error');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    (async () => {
      const me = await cachedMe();
      if (hasRole(me, 'staff')) window.location.replace(returnTo);
      else setChecking(false);
    })();
  }, [returnTo]);

  return (
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-20 text-center">
      <span className="kh-eyebrow">Staff access</span>
      <h1
        className="mt-3 font-heading text-5xl sm:text-7xl uppercase"
        style={{ fontFamily: 'var(--brand-font-heading)' }}
      >
        Admin login
      </h1>
      <Scribble className="mx-auto mt-6" width={120} />
      <p className="mt-6 text-muted-foreground">
        Sign in with your Kharbesh staff Google account to access the admin panel.
      </p>

      {errorCode && (
        <p className="mt-4 text-sm" style={{ color: 'var(--brick, #B5432B)' }}>
          {ERROR_COPY[errorCode] || 'Sign-in failed. Try again.'}
        </p>
      )}

      {clientId ? (
        <button
          disabled={checking}
          onClick={() => { window.location.href = getGoogleOAuthUrl(returnTo); }}
          className="kh-btn-scribble mt-8 !justify-center mx-auto"
        >
          {checking ? 'Loading…' : 'Continue with Google →'}
        </button>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Google sign-in isn't configured yet on this deployment.
        </p>
      )}

      <Link to="/" className="kh-btn-text mt-10 !text-[12px]">← Back to shop</Link>
    </div>
  );
}
