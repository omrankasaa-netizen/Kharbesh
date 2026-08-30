import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/use-toast';

// Mirrors the server's custom_requests status enum (admin.updateCustomRequestStatus).
const STATUSES = ['new_request','review','quote_sent','deposit_paid','designing','customer_review','revision','approved','balance_due','production','shipped','closed'];

export default function AdminCustomRequests() {
  const { t, lang } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  // Distinct from "loaded but empty" — staff must never confuse a failed
  // load with "no requests".
  const [loadError, setLoadError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await base44.entities.CustomProject.list();
      setRequests(list || []);
    } catch (err) {
      setRequests([]);
      setLoadError(err?.message || (lang === 'ar' ? 'ما قدرنا نحمّل الطلبات' : 'Could not load custom requests'));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (loadError) toast({ title: loadError, variant: 'destructive' });
  }, [loadError]);

  // Optimistic: flip the badge immediately, roll back on failure.
  const updateStatus = async (id, newStatus) => {
    const prev = requests.find((r) => r.id === id)?.status;
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    try {
      await base44.entities.CustomProject.updateStatus(id, newStatus);
      toast({ title: lang === 'ar' ? 'تحدّثت الحالة ✓' : 'Status updated ✓' });
    } catch (err) {
      setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: prev } : r)));
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحدّث الحالة' : 'Could not update status'), variant: 'destructive' });
    }
  };

  const detailField = (labelEn, labelAr, value) => {
    if (value == null || value === '') return null;
    return (
      <div>
        <div className="kh-eyebrow mb-1">{lang === 'ar' ? labelAr : labelEn}</div>
        <div className="text-sm whitespace-pre-wrap break-words">{value}</div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'طلبات خاصة' : 'Custom Requests'} sub={lang === 'ar' ? 'طلبات "خربش ع ذوقك" — تصاميم خاصة حسب ذوق الزبون' : '"Kharbesh 3a Zaw2ak" custom design requests — the owner designs each one personally.'} />

      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : loadError ? (
        <div className="mt-8 border rounded-md px-4 py-6 text-sm" style={{ borderColor: 'var(--brand-destructive)', color: 'var(--brand-destructive)', background: 'color-mix(in srgb, var(--brand-destructive) 8%, transparent)' }}>
          <div className="font-semibold mb-1">{lang === 'ar' ? 'فشل تحميل الطلبات' : 'Failed to load custom requests'}</div>
          <div className="opacity-80 mb-3">{loadError}</div>
          <button onClick={load} className="kh-btn-secondary !py-2 !px-4 text-sm">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-8 border border-border rounded-md px-4 py-10 text-center text-muted-foreground text-sm">
          {lang === 'ar' ? 'لا يوجد طلبات خاصة بعد.' : 'No custom requests yet.'}
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-3">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'العبارة' : 'Phrase'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'القطعة' : 'Garment'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'التواصل' : 'Contact'}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <React.Fragment key={r.id}>
                  <tr
                    className="border-b border-border cursor-pointer hover:bg-muted/40"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground text-xs">
                      <span className="mr-1">{expandedId === r.id ? '▾' : '▸'}</span>
                      {new Date(r.created_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3 font-medium">{r.name}</td>
                    <td className="py-3 pr-3 max-w-[220px]"><span className="block truncate">{r.phrase}</span></td>
                    <td className="py-3 pr-3 text-muted-foreground text-xs whitespace-nowrap">
                      {[r.garment, r.color, r.size].filter(Boolean).join(' · ') || '—'}{r.quantity ? ` · ×${r.quantity}` : ''}
                    </td>
                    <td className="py-3 pr-3" onClick={(e) => e.stopPropagation()}>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium border"
                        style={r.status === 'closed'
                          ? { background: 'transparent', color: 'var(--muted)', borderColor: 'var(--border)' }
                          : { background: 'color-mix(in srgb, var(--brand-accent) 12%, transparent)', color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className="kh-input !h-9 !py-1 max-w-[170px] ml-2"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      <div>{r.email}</div>
                      {r.phone && <div>{r.phone}</div>}
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="border-b border-border bg-muted/20">
                      <td colSpan={6} className="py-4 px-4">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            {detailField('Phrase', 'العبارة', r.phrase)}
                            {detailField('Story', 'القصة', r.story)}
                            {detailField('Notes', 'ملاحظات', r.notes)}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                              {r.language && <span className="px-2 py-0.5 rounded border border-border">{r.language === 'ar' ? 'عربي' : 'English'}</span>}
                              {r.rights_confirmed && <span className="px-2 py-0.5 rounded border border-border">{lang === 'ar' ? 'أكّد الحقوق ✓' : 'rights confirmed ✓'}</span>}
                              <span>{new Date(r.created_date).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {detailField('Recipient', 'لمن', r.recipient)}
                            {detailField('Occasion', 'المناسبة', r.occasion)}
                            {detailField('Tone', 'النبرة', r.tone)}
                            {detailField('Placement', 'مكان الطبعة', r.placement)}
                            {detailField('Needed by', 'مطلوب قبل', r.needed_by)}
                            <div>
                              <div className="kh-eyebrow mb-1">{lang === 'ar' ? 'ملفات مرجعية' : 'Reference files'}</div>
                              {(r.reference_files || []).length === 0 ? (
                                <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'لا يوجد' : 'None attached'}</div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {(r.reference_files || []).map((file, i) => (
                                    <a key={i} href={file} download={`reference-${i}`} className="block border border-border rounded overflow-hidden hover:opacity-80">
                                      {typeof file === 'string' && file.startsWith('data:image/') ? (
                                        <img src={file} alt={`reference-${i}`} className="max-h-24 w-auto" />
                                      ) : (
                                        <span className="inline-block px-3 py-2 text-xs">{lang === 'ar' ? `تحميل الملف ${i + 1}` : `Download file ${i + 1}`}</span>
                                      )}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
