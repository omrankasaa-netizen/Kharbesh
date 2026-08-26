import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { whatsappLink } from '@/lib/whatsapp';
import { IconWhatsApp } from '@/components/Brand';

const STATUSES = ['new', 'read', 'archived'];

export default function AdminMessages() {
  const { lang } = useI18n();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setMessages(await base44.entities.ContactMessages.list());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateStatus = async (id, status) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    await base44.entities.ContactMessages.updateStatus(id, status);
  };

  const filtered = filter ? messages.filter((m) => m.status === filter) : messages;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'الرسائل' : 'Messages'} />
      <p className="text-sm text-muted-foreground mt-2 max-w-[560px]">
        {lang === 'ar'
          ? 'الرسائل يلي بتوصل من صفحة التواصل. رد عبر واتساب أو إيميل مباشرة.'
          : 'Messages submitted through the Contact page. Reply directly via WhatsApp or email.'}
      </p>
      <div className="flex flex-wrap gap-3 mt-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="kh-input max-w-[200px]">
          <option value="">{lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="text-muted-foreground mt-8">{lang === 'ar' ? 'جاري التحميل…' : 'Loading…'}</div>
      ) : (
        <div className="mt-8 space-y-4">
          {filtered.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-md p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)' }}>{m.name}</span>
                  <div className="text-muted-foreground text-xs mt-1">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
                  <div className="text-muted-foreground text-xs">{new Date(m.created_date).toLocaleString(lang === 'ar' ? 'ar-LB' : 'en-US')}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m.phone && (
                    <a
                      href={whatsappLink(m.phone, `${lang === 'ar' ? 'هاي' : 'Hi'} ${m.name}, ${lang === 'ar' ? 'معك من خربش، بخص رسالتك' : 'this is Kharbesh regarding your message'}...`)}
                      target="_blank"
                      rel="noreferrer"
                      className="kh-btn-text text-xs flex items-center gap-1"
                      style={{ color: '#25D366' }}
                    >
                      <IconWhatsApp size={14} /> WhatsApp
                    </a>
                  )}
                  <select value={m.status} onChange={(e) => updateStatus(m.id, e.target.value)} className="kh-input !h-9 !py-1 max-w-[140px]">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <p className="mt-4 text-sm whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground">{lang === 'ar' ? 'ما في رسائل.' : 'No messages.'}</p>}
        </div>
      )}
    </div>
  );
}
