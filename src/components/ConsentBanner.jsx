import React from 'react';
import { shouldAskConsent, grantConsent, denyConsent } from '@/lib/metaPixel';

/**
 * Implied-consent banner: tracking (Meta Pixel + CAPI) is ON by default and
 * stays on unless the visitor explicitly declines. The banner only informs —
 * accepting simply records the choice; declining revokes consent and wipes
 * stored advanced-matching data. If the visitor never interacts, tracking
 * remains active (per store policy).
 */
export default function ConsentBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      setVisible(shouldAskConsent());
    } catch {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  const choose = (fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 px-4 pb-4"
    >
      <div
        className="mx-auto max-w-3xl border-2 border-black p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-[6px_6px_0_0_#000]"
        style={{ background: 'var(--card, #fff)', color: 'var(--foreground, #000)' }}
      >
        <p className="text-sm leading-relaxed flex-1">
          <span className="font-bold block sm:inline">
            We use cookies &amp; pixels to improve your experience and our ads.
          </span>{' '}
          Tracking stays on by default — decline if you prefer not to be tracked.
          <span dir="rtl" className="block mt-1 font-arabic">
            نستخدم ملفات تعريف الارتباط لتحسين تجربتك وإعلاناتنا. التتبّع مفعّل
            تلقائياً — يمكنك الرفض إذا كنت تفضّل ذلك.
          </span>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => choose(grantConsent)}
            className="px-4 py-2 text-sm font-bold border-2 border-black uppercase tracking-wide hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
            style={{ background: 'var(--brand-accent, #D4ED0B)', color: 'var(--on-lime, #000)' }}
          >
            Accept / قبول
          </button>
          <button
            type="button"
            onClick={() => choose(denyConsent)}
            className="px-4 py-2 text-sm font-bold border-2 border-black uppercase tracking-wide hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
            style={{ background: 'transparent', color: 'inherit' }}
          >
            Decline / رفض
          </button>
        </div>
      </div>
    </div>
  );
}
