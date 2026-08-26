import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const TIERS = ['new_kharboush', 'kharboush_khebra', 'kharboush_aslee'];
const TIER_LABEL = {
  new_kharboush: { en: 'New Kharboush', ar: 'خربوش جديد' },
  kharboush_khebra: { en: 'Kharboush Khebra', ar: 'خربوش خبرة' },
  kharboush_aslee: { en: 'Kharboush Aslee', ar: 'خربوش أصلي' },
};

function TierBadge({ tier }) {
  const color = tier === 'kharboush_aslee' ? 'var(--brand-accent)' : tier === 'kharboush_khebra' ? 'var(--foreground)' : 'var(--muted)';
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border" style={{ borderColor: color, color }}>
      {TIER_LABEL[tier]?.en ?? tier}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function EditRow({ account, onCancel, onSaved, lang }) {
  const [form, setForm] = useState({
    tier: account.tier,
    freeShippingCredits: account.freeShippingCredits,
    tierLockedByAdmin: account.tierLockedByAdmin,
    lifetimeSpentCents: account.lifetimeSpentCents,
    notes: account.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await base44.entities.Loyalty.admin.update(account.email, {
        tier: form.tier,
        freeShippingCredits: Number(form.freeShippingCredits) || 0,
        tierLockedByAdmin: !!form.tierLockedByAdmin,
        lifetimeSpentCents: Math.round((Number(form.lifetimeSpentCents) || 0)),
        notes: form.notes.trim() || null,
      });
      onSaved();
    } catch (e) {
      setError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b border-border" style={{ background: 'var(--card)' }}>
      <td className="py-3 pr-3 align-top" colSpan={6}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
          <Field label={lang === 'ar' ? 'المستوى' : 'Tier'}>
            <select className="kh-input" value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}>
              {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t].en}</option>)}
            </select>
          </Field>
          <Field label={lang === 'ar' ? 'رصيد شحن مجاني' : 'Free shipping credits'}>
            <input type="number" min="0" className="kh-input" value={form.freeShippingCredits} onChange={(e) => setForm((f) => ({ ...f, freeShippingCredits: e.target.value }))} />
          </Field>
          <Field label={lang === 'ar' ? 'إجمالي الصرف (بالدولار)' : 'Lifetime spend ($)'}>
            <input type="number" min="0" step="0.01" className="kh-input" value={(form.lifetimeSpentCents / 100)} onChange={(e) => setForm((f) => ({ ...f, lifetimeSpentCents: Math.round((Number(e.target.value) || 0) * 100) }))} />
          </Field>
          <label className="flex items-center gap-2 mt-1">
            <input type="checkbox" checked={form.tierLockedByAdmin} onChange={(e) => setForm((f) => ({ ...f, tierLockedByAdmin: e.target.checked }))} />
            <span className="text-sm">{lang === 'ar' ? 'تثبيت المستوى (منع الترقية التلقائية)' : 'Lock tier (block auto-upgrade)'}</span>
          </label>
          <div className="sm:col-span-2">
            <Field label={lang === 'ar' ? 'ملاحظات' : 'Notes (admin-only)'}>
              <input className="kh-input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}
        <div className="flex gap-3 mt-2">
          <button onClick={save} disabled={saving} className="kh-btn-primary">{saving ? 'Saving…' : (lang === 'ar' ? 'حفظ' : 'Save')}</button>
          <button onClick={onCancel} className="kh-btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminLoyalty() {
  const { lang } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingEmail, setEditingEmail] = useState(null);

  const load = async (q) => {
    setLoading(true);
    try {
      setRows((await base44.entities.Loyalty.admin.list(q)) || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSearch = (e) => {
    e.preventDefault();
    load(search.trim() || undefined);
  };

  const summary = useMemo(() => {
    const counts = { new_kharboush: 0, kharboush_khebra: 0, kharboush_aslee: 0 };
    for (const r of rows) counts[r.tier] = (counts[r.tier] || 0) + 1;
    return counts;
  }, [rows]);

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader
        eyebrow="Admin"
        title={lang === 'ar' ? 'برنامج الولاء' : 'Loyalty'}
        sub={lang === 'ar' ? 'New Kharboush، Kharboush Khebra، Kharboush Aslee — شوف كل زبون وين واقف وعدّل يدوياً عند اللزوم.' : 'New Kharboush, Kharboush Khebra, Kharboush Aslee — see where every customer stands and override manually when needed. Thresholds and perks are configured in Settings.'}
      />

      <div className="flex flex-wrap gap-3 mt-6">
        {TIERS.map((t) => (
          <div key={t} className="kh-card px-4 py-3 flex items-center gap-3">
            <TierBadge tier={t} />
            <span className="text-lg font-medium">{summary[t] || 0}</span>
          </div>
        ))}
      </div>

      <form onSubmit={onSearch} className="flex gap-2 mt-8">
        <input
          className="kh-input max-w-xs"
          placeholder={lang === 'ar' ? 'دوّر بالإيميل...' : 'Search by email…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="kh-btn-secondary">{lang === 'ar' ? 'دوّر' : 'Search'}</button>
      </form>

      {loading ? (
        <div className="text-muted-foreground mt-6">Loading…</div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-3">Email</th>
                <th className="py-3 pr-3">Tier</th>
                <th className="py-3 pr-3">Lifetime spend</th>
                <th className="py-3 pr-3">Free shipping credits</th>
                <th className="py-3 pr-3">Locked</th>
                <th className="py-3 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <React.Fragment key={r.email}>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-3 font-medium">{r.email}</td>
                    <td className="py-3 pr-3"><TierBadge tier={r.tier} /></td>
                    <td className="py-3 pr-3">${(r.lifetimeSpentCents / 100).toFixed(2)}</td>
                    <td className="py-3 pr-3">{r.tier === 'kharboush_aslee' ? '∞' : r.freeShippingCredits}</td>
                    <td className="py-3 pr-3">{r.tierLockedByAdmin ? (lang === 'ar' ? 'نعم' : 'Yes') : '—'}</td>
                    <td className="py-3 pr-3 text-right">
                      <button onClick={() => setEditingEmail(editingEmail === r.email ? null : r.email)} className="kh-btn-text text-xs">
                        {editingEmail === r.email ? (lang === 'ar' ? 'إغلاق' : 'Close') : (lang === 'ar' ? 'تعديل' : 'Edit')}
                      </button>
                    </td>
                  </tr>
                  {editingEmail === r.email && (
                    <EditRow account={r} lang={lang} onCancel={() => setEditingEmail(null)} onSaved={() => { setEditingEmail(null); load(search.trim() || undefined); }} />
                  )}
                </React.Fragment>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-muted-foreground">No loyalty accounts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
