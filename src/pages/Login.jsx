import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { cachedMe, base44 } from '@/api/khClient';
import { Scribble } from '@/components/Brand';

const RESEND_COOLDOWN_S = 60;

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

  // Email sign-in: 'email' -> enter address, 'code' -> enter the mailed code.
  const [otpStep, setOtpStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => {
    (async () => {
      const me = await cachedMe();
      if (me) window.location.replace(returnTo);
      else setChecking(false);
    })();
  }, [returnTo]);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const sendCode = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpBusy(true);
    try {
      await base44.auth.requestEmailOtp(email.trim(), lang);
      setOtpStep('code');
      startCooldown();
    } catch (err) {
      setOtpError(err?.message || (lang === 'ar' ? 'ما قدرنا نبعت الرمز.' : "Couldn't send the code."));
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpBusy(true);
    try {
      await base44.auth.verifyEmailOtp(email.trim(), code.trim());
      window.location.replace(returnTo);
    } catch (err) {
      setOtpError(err?.message || (lang === 'ar' ? 'الرمز مش صحيح.' : "That code isn't right."));
      setOtpBusy(false);
    }
  };

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
          ? 'سجّل دخولك بحساب Google أو Kimi لتتبّع طلباتك وتدير حسابك.'
          : 'Sign in with Google or your Kimi account to track orders and manage your profile.'}
      </p>
      {params.get('error') && (
        <p className="mt-4 text-sm" style={{ color: 'var(--brick, #B5432B)' }}>
          {lang === 'ar' ? 'فشل تسجيل الدخول عبر Google. جرّب مرة تانية.' : 'Google sign-in failed. Please try again.'}
        </p>
      )}
      <button
        disabled={checking}
        onClick={() => { window.location.href = `/api/auth/google/start?flow=customer&returnTo=${encodeURIComponent(returnTo)}`; }}
        className="kh-btn-scribble mt-8 !justify-center mx-auto"
      >
        {checking
          ? t.common.loading
          : lang === 'ar'
            ? 'تابع بحساب Google'
            : 'Continue with Google'}
      </button>
      <button
        disabled={checking}
        onClick={() => { window.location.href = getOAuthUrl(returnTo); }}
        className="kh-btn-scribble mt-3 !justify-center mx-auto"
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

      <div className="flex items-center gap-3 mt-10">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{lang === 'ar' ? 'أو' : 'or'}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {otpStep === 'email' ? (
        <form onSubmit={sendCode} className="mt-6 flex flex-col gap-3 max-w-sm mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={lang === 'ar' ? 'إيميلك' : 'Your email'}
            className="kh-input"
          />
          <button type="submit" disabled={otpBusy} className="kh-btn-outline !justify-center">
            {otpBusy ? t.common.loading : lang === 'ar' ? 'بعتلي رمز' : 'Email me a code'}
          </button>
          {otpError && <p className="text-xs" style={{ color: 'var(--brand-destructive)' }}>{otpError}</p>}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 flex flex-col gap-3 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground -mb-1">
            {lang === 'ar' ? `بعتنا رمز عَ ${email}` : `We sent a code to ${email}`}
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="______"
            className="kh-input text-center tracking-[0.4em] font-heading text-lg"
          />
          <button type="submit" disabled={otpBusy || code.length !== 6} className="kh-btn-scribble !justify-center">
            {otpBusy ? t.common.loading : lang === 'ar' ? 'دخول' : 'Verify & sign in'}
          </button>
          {otpError && <p className="text-xs" style={{ color: 'var(--brand-destructive)' }}>{otpError}</p>}
          <div className="flex items-center justify-between text-xs mt-1">
            <button type="button" onClick={() => { setOtpStep('email'); setOtpError(''); setCode(''); }} className="kh-btn-text !text-[12px]">
              {lang === 'ar' ? 'غيّر الإيميل' : 'Change email'}
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || otpBusy}
              onClick={sendCode}
              className="kh-btn-text !text-[12px] disabled:opacity-50"
            >
              {cooldown > 0
                ? (lang === 'ar' ? `أعد الإرسال (${cooldown})` : `Resend (${cooldown}s)`)
                : (lang === 'ar' ? 'أعد الإرسال' : 'Resend code')}
            </button>
          </div>
        </form>
      )}

      <Link to="/" className="kh-btn-text mt-8 !text-[12px]">← {lang === 'ar' ? 'رجوع' : 'Back to shop'}</Link>
    </div>
  );
}
