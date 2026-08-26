import React from 'react';
import { useLocation } from 'react-router';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import { useI18n } from '@/lib/i18n';
import { whatsappLink } from '@/lib/whatsapp';
import { IconWhatsApp } from '@/components/Brand';

const DEFAULT_WHATSAPP_NUMBER = '96176465367';

/** Sitewide floating support entry point — click-to-chat only, no backend
 * integration. Hidden on /admin/* (staff have their own tools) so it never
 * collides with the back-office UI. */
export default function WhatsAppButton() {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  const { lang } = useI18n();
  if (pathname.startsWith('/admin')) return null;

  const number = settings?.contact?.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
  const greeting = lang === 'ar' ? 'هاي خربش، معي سؤال بخص الموقع.' : "Hi Kharbesh, I have a question about the site.";

  return (
    <a
      href={whatsappLink(number, greeting)}
      target="_blank"
      rel="noreferrer"
      aria-label={lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Chat with us on WhatsApp'}
      title={lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Chat with us on WhatsApp'}
      className="fixed z-40 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
      style={{
        bottom: '20px',
        insetInlineEnd: '20px',
        width: '56px',
        height: '56px',
        background: '#25D366',
        color: '#fff',
      }}
    >
      <IconWhatsApp size={28} />
    </a>
  );
}
