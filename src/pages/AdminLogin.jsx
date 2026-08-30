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

/**
 * The authorize URL is built server-side by /api/auth/google/start: it mints
 * the CSRF nonce cookie the callback verifies — something a client-side
 * link can't do. flow=staff keeps this page on the staff allowlist path.
 */
function getGoogleStartUrl(returnTo) {
  return `/api/auth/google/start?flow=staff&returnTo=${encodeURIComponent(returnTo)}`;
}

const ERROR_COPY = {
  access_denied: 'Sign-in was cancelled.',
  not_authorized: "That Google account isn't on the staff list. Ask an admin to add your email.",
  state_mismatch: 'Sign-in session expired. Please try again.',
  server_error: 'Something went wrong on our end. Try again in a moment.',
};

export default function AdminLogin() {
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const returnTo = safeReturnTo(params.get('returnTo'));
  const errorCode = params.get('error');

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

      <button
        disabled={checking}
        onClick={() => { window.location.href = getGoogleStartUrl(returnTo); }}
        className="kh-btn-scribble mt-8 !justify-center mx-auto"
      >
        {checking ? 'Loading…' : 'Continue with Google →'}
      </button>

      <Link to="/" className="kh-btn-text mt-10 !text-[12px]">← Back to shop</Link>
    </div>
  );
}
