import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { cachedMe } from '@/api/khClient';
import { Scribble } from '@/components/Brand';

/** Same-origin return targets only — never bounce to an external URL. */
function safeReturnTo(raw) {
  if (!raw) return '/';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}

function getOAuthUrl(returnTo) {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Carry the final destination through the OAuth round-trip.
  const state = btoa(JSON.stringify({ redirectUri, returnTo }));

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set('client_id', appID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'profile');
  url.searchParams.set('state', state);
  return url.toString();
}

export default function Login() {
  const { t, lang } = useI18n();
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const returnTo = safeReturnTo(params.get('returnTo'));

  useEffect(() => {
    (async () => {
      const me = await cachedMe();
      if (me) window.location.replace(returnTo);
      else setChecking(false);
    })();
  }, [returnTo]);

  return (
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-20 text-center">
      <span className="kh-eyebrow">{lang === 'ar' ? 'حسابك' : 'Your account'}</span>
      <h1
        className="mt-3 font-heading text-5xl sm:text-7xl uppercase"
        style={{ fontFamily: 'var(--brand-font-heading)' }}
      >
        {lang === 'ar' ? 'تسجيل الدخول' : 'Log in'}
      </h1>
      <Scribble className="mx-auto mt-6" width={120} />
      <p className="mt-6 text-muted-foreground">
        {lang === 'ar'
          ? 'سجّل دخولك بحساب Kimi لتتبّع طلباتك وتدير حسابك.'
          : 'Sign in with your Kimi account to track orders and manage your profile.'}
      </p>
      <button
        disabled={checking}
        onClick={() => { window.location.href = getOAuthUrl(returnTo); }}
        className="kh-btn-scribble mt-8 !justify-center mx-auto"
      >
        {checking
          ? t.common.loading
          : lang === 'ar'
            ? 'الدخول عبر Kimi'
            : 'Sign in with Kimi'}
      </button>
      <p className="mt-6 text-xs text-muted-foreground">
        {lang === 'ar' ? 'ما عندك حساب؟ بتسجّل أول مرة ومنكمّل.' : 'No account? One is created on your first sign-in.'}
      </p>
      <Link to="/" className="kh-btn-text mt-8 !text-[12px]">← {lang === 'ar' ? 'رجوع' : 'Back to shop'}</Link>
    </div>
  );
}
