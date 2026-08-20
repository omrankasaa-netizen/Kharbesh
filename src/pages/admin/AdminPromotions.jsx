import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const VALUE_TYPES = ['percent', 'fixed'];
const APPLIES_TO = ['all', 'product_type', 'collection'];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// datetime-local <-> ISO helpers. Dates are optional everywhere (null = no window bound).
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function StatusBadge({ active, lang }) {
  return (
    <span
      className="text-[10px] uppercase px-2 py-0.5 rounded-full border"
      style={{
        borderColor: active ? 'var(--brand-accent)' : 'var(--border)',
        color: active ? 'var(--brand-accent)' : 'var(--muted)',
      }}
    >
      {active ? (lang === 'ar' ? 'فعّال' : 'Active') : (lang === 'ar' ? 'موقوف' : 'Off')}
    </span>
  );
}

/** Shared value-type + value pair. Fixed values are entered/shown in dollars but stored as cents server-side. */
function ValueFields({ type, valueInput, onType, onValue, lang }) {
  return (
    <>
      <Field label={lang === 'ar' ? 'نوع الحسم' : 'Discount type'}>
        <select className="kh-input" value={type} onChange={(e) => onType(e.target.value)}>
          {VALUE_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'percent' ? (lang === 'ar' ? 'نسبة %' : 'Percent %') : (lang === 'ar' ? 'مبلغ ثابت $' : 'Fixed amount $')}</option>
          ))}
        </select>
      </Field>
      <Field label={type === 'percent' ? (lang === 'ar' ? 'النسبة %' : 'Percent (%)') : (lang === 'ar' ? 'المبلغ $' : 'Amount ($)')}>
        <input type="number" step={type === 'percent' ? '1' : '0.01'} className="kh-input" value={valueInput} onChange={(e) => onValue(e.target.value)} />
      </Field>
    </>
  );
}

// ── Promo codes ───────────────────────────────────────────────────────────

const emptyPromo = { code: '', type: 'percent', valueInput: '10', min_order: '', max_uses: '', active: true, starts_at: '', expires_at: '' };

function toPromoForm(p) {
  return {
    code: p.code, type: p.type,
    valueInput: p.type === 'fixed' ? String(p.value / 100) : String(p.value),
    min_order: p.min_order ?? '', max_uses: p.max_uses ?? '', active: p.active,
    starts_at: isoToLocalInput(p.starts_at), expires_at: isoToLocalInput(p.expires_at),
  };
}
function toPromoPayload(f) {
  return {
    code: f.code.trim(),
    type: f.type,
    value: f.type === 'fixed' ? Math.round((Number(f.valueInput) || 0) * 100) : Number(f.valueInput) || 0,
    min_order: f.min_order === '' ? null : Number(f.min_order),
    max_uses: f.max_uses === '' ? null : Number(f.max_uses),
    active: !!f.active,
    starts_at: localInputToIso(f.starts_at),
    expires_at: localInputToIso(f.expires_at),
  };
}

function PromoCodesTab({ lang }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // 'new' | id | null
  const [form, setForm] = useState(emptyPromo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Promotions.promoCodes.list() || []); }
    catch { setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setForm(emptyPromo); setEditingId('new'); setError(''); };
  const startEdit = (p) => { setForm(toPromoForm(p)); setEditingId(p.id); setError(''); };
  const cancelEdit = () => { setEditingId(null); setForm(emptyPromo); setError(''); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.code.trim()) { setError(lang === 'ar' ? 'الكود مطلوب' : 'Code is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = toPromoPayload(form);
      if (editingId === 'new') {
        const created = await base44.entities.Promotions.promoCodes.create(payload);
        setRows((rs) => [created, ...rs]);
      } else {
        const updated = await base44.entities.Promotions.promoCodes.update(editingId, payload);
        setRows((rs) => rs.map((r) => (r.id === editingId ? updated : r)));
      }
      cancelEdit();
    } catch (err) { setError(err?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(lang === 'ar' ? `حذف الكود "${p.code}"؟` : `Delete code "${p.code}"?`)) return;
    await base44.entities.Promotions.promoCodes.remove(p.id);
    setRows((rs) => rs.filter((r) => r.id !== p.id));
  };

  const toggleActive = async (p) => {
    const updated = await base44.entities.Promotions.promoCodes.update(p.id, { active: !p.active });
    setRows((rs) => rs.map((r) => (r.id === p.id ? updated : r)));
  };

  if (editingId) {
    return (
      <div className="mt-6 bg-card border border-border rounded-md p-6 max-w-2xl">
        <h3 className="font-heading text-lg uppercase mb-5" style={{ fontFamily: 'var(--brand-font-heading)' }}>
          {editingId === 'new' ? (lang === 'ar' ? 'كود جديد' : 'New promo code') : (lang === 'ar' ? 'تعديل الكود' : 'Edit promo code')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={lang === 'ar' ? 'الكود' : 'Code'}>
            <input className="kh-input uppercase" value={form.code} onChange={set('code')} placeholder="KHARBESH10" />
          </Field>
          <div />
          <ValueFields type={form.type} valueInput={form.valueInput} onType={(v) => setForm((f) => ({ ...f, type: v }))} onValue={(v) => setForm((f) => ({ ...f, valueInput: v }))} lang={lang} />
          <Field label={lang === 'ar' ? 'أقل قيمة طلب ($، اختياري)' : 'Min order ($, optional)'}>
            <input type="number" step="0.01" className="kh-input" value={form.min_order} onChange={set('min_order')} />
          </Field>
          <Field label={lang === 'ar' ? 'أقصى عدد استخدام (اختياري)' : 'Max uses (optional)'}>
            <input type="number" className="kh-input" value={form.max_uses} onChange={set('max_uses')} />
          </Field>
          <Field label={lang === 'ar' ? 'يبدأ (اختياري)' : 'Starts at (optional)'}>
            <input type="datetime-local" className="kh-input" value={form.starts_at} onChange={set('starts_at')} />
          </Field>
          <Field label={lang === 'ar' ? 'ينتهي (اختياري)' : 'Expires at (optional)'}>
            <input type="datetime-local" className="kh-input" value={form.expires_at} onChange={set('expires_at')} />
          </Field>
          <label className="flex items-center gap-2 mt-1">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            <span className="text-sm">{lang === 'ar' ? 'فعّال' : 'Active'}</span>
          </label>
        </div>
        {error && <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={save} disabled={saving} className="kh-btn-primary">{saving ? 'Saving…' : (lang === 'ar' ? 'حفظ' : 'Save')}</button>
          <button onClick={cancelEdit} className="kh-btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mt-6"><button onClick={startCreate} className="kh-btn-primary">{lang === 'ar' ? 'كود جديد +' : '+ New promo code'}</button></div>
      {loading ? <div className="text-muted-foreground mt-6">Loading…</div> : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-3 pr-3">Code</th><th className="py-3 pr-3">Value</th><th className="py-3 pr-3">Uses</th><th className="py-3 pr-3">Window</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3"></th>
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="py-3 pr-3"><button onClick={() => startEdit(p)} className="hover:underline font-medium">{p.code}</button></td>
                  <td className="py-3 pr-3">{p.type === 'percent' ? `${p.value}%` : `$${(p.value / 100).toFixed(2)}`}</td>
                  <td className="py-3 pr-3">{p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {p.starts_at ? new Date(p.starts_at).toLocaleDateString() : '—'} → {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : (lang === 'ar' ? 'بلا نهاية' : 'no end')}
                  </td>
                  <td className="py-3 pr-3"><button onClick={() => toggleActive(p)}><StatusBadge active={p.active} lang={lang} /></button></td>
                  <td className="py-3 pr-3 text-right">
                    <button onClick={() => startEdit(p)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تعديل' : 'Edit'}</button>
                    <button onClick={() => remove(p)} className="kh-btn-text text-xs ml-3" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'حذف' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-muted-foreground">No promo codes.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Automatic discounts ──────────────────────────────────────────────────

const emptyDiscount = { name_en: '', name_ar: '', type: 'percent', valueInput: '10', applies_to: 'all', applies_value: '', active: true, starts_at: '', expires_at: '' };

function toDiscountForm(d) {
  return {
    name_en: d.name_en, name_ar: d.name_ar || '', type: d.type,
    valueInput: d.type === 'fixed' ? String(d.value / 100) : String(d.value),
    applies_to: d.applies_to, applies_value: d.applies_value || '', active: d.active,
    starts_at: isoToLocalInput(d.starts_at), expires_at: isoToLocalInput(d.expires_at),
  };
}
function toDiscountPayload(f) {
  return {
    name_en: f.name_en.trim(), name_ar: f.name_ar || null,
    type: f.type,
    value: f.type === 'fixed' ? Math.round((Number(f.valueInput) || 0) * 100) : Number(f.valueInput) || 0,
    applies_to: f.applies_to,
    applies_value: f.applies_to === 'all' ? null : (f.applies_value || null),
    active: !!f.active,
    starts_at: localInputToIso(f.starts_at),
    expires_at: localInputToIso(f.expires_at),
  };
}

function DiscountsTab({ lang }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyDiscount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Promotions.discounts.list() || []); }
    catch { setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setForm(emptyDiscount); setEditingId('new'); setError(''); };
  const startEdit = (d) => { setForm(toDiscountForm(d)); setEditingId(d.id); setError(''); };
  const cancelEdit = () => { setEditingId(null); setForm(emptyDiscount); setError(''); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name_en.trim()) { setError(lang === 'ar' ? 'الاسم مطلوب' : 'Name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = toDiscountPayload(form);
      if (editingId === 'new') {
        const created = await base44.entities.Promotions.discounts.create(payload);
        setRows((rs) => [created, ...rs]);
      } else {
        const updated = await base44.entities.Promotions.discounts.update(editingId, payload);
        setRows((rs) => rs.map((r) => (r.id === editingId ? updated : r)));
      }
      cancelEdit();
    } catch (err) { setError(err?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const remove = async (d) => {
    if (!window.confirm(lang === 'ar' ? `حذف "${d.name_en}"؟` : `Delete "${d.name_en}"?`)) return;
    await base44.entities.Promotions.discounts.remove(d.id);
    setRows((rs) => rs.filter((r) => r.id !== d.id));
  };

  const toggleActive = async (d) => {
    const updated = await base44.entities.Promotions.discounts.update(d.id, { active: !d.active });
    setRows((rs) => rs.map((r) => (r.id === d.id ? updated : r)));
  };

  if (editingId) {
    return (
      <div className="mt-6 bg-card border border-border rounded-md p-6 max-w-2xl">
        <h3 className="font-heading text-lg uppercase mb-5" style={{ fontFamily: 'var(--brand-font-heading)' }}>
          {editingId === 'new' ? (lang === 'ar' ? 'حسم تلقائي جديد' : 'New automatic discount') : (lang === 'ar' ? 'تعديل الحسم' : 'Edit discount')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name (EN)"><input className="kh-input" value={form.name_en} onChange={set('name_en')} /></Field>
          <Field label="Name (AR)"><input className="kh-input" dir="rtl" value={form.name_ar} onChange={set('name_ar')} /></Field>
          <ValueFields type={form.type} valueInput={form.valueInput} onType={(v) => setForm((f) => ({ ...f, type: v }))} onValue={(v) => setForm((f) => ({ ...f, valueInput: v }))} lang={lang} />
          <Field label={lang === 'ar' ? 'يطبّق على' : 'Applies to'}>
            <select className="kh-input" value={form.applies_to} onChange={set('applies_to')}>
              {APPLIES_TO.map((a) => (
                <option key={a} value={a}>{a === 'all' ? (lang === 'ar' ? 'كل المنتجات' : 'All products') : a === 'product_type' ? (lang === 'ar' ? 'نوع منتج' : 'Product type') : (lang === 'ar' ? 'كوليكشن' : 'Collection')}</option>
              ))}
            </select>
          </Field>
          {form.applies_to !== 'all' && (
            <Field label={form.applies_to === 'product_type' ? (lang === 'ar' ? 'نوع المنتج (tee/hoodie/accessory)' : 'Product type (tee/hoodie/accessory)') : (lang === 'ar' ? 'اسم الكوليكشن' : 'Collection name')}>
              <input className="kh-input" value={form.applies_value} onChange={set('applies_value')} />
            </Field>
          )}
          <Field label={lang === 'ar' ? 'يبدأ (اختياري)' : 'Starts at (optional)'}>
            <input type="datetime-local" className="kh-input" value={form.starts_at} onChange={set('starts_at')} />
          </Field>
          <Field label={lang === 'ar' ? 'ينتهي (اختياري)' : 'Expires at (optional)'}>
            <input type="datetime-local" className="kh-input" value={form.expires_at} onChange={set('expires_at')} />
          </Field>
          <label className="flex items-center gap-2 mt-1">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            <span className="text-sm">{lang === 'ar' ? 'فعّال' : 'Active'}</span>
          </label>
        </div>
        {error && <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={save} disabled={saving} className="kh-btn-primary">{saving ? 'Saving…' : (lang === 'ar' ? 'حفظ' : 'Save')}</button>
          <button onClick={cancelEdit} className="kh-btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mt-6"><button onClick={startCreate} className="kh-btn-primary">{lang === 'ar' ? 'حسم جديد +' : '+ New discount'}</button></div>
      {loading ? <div className="text-muted-foreground mt-6">Loading…</div> : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-3 pr-3">Name</th><th className="py-3 pr-3">Value</th><th className="py-3 pr-3">Applies to</th><th className="py-3 pr-3">Window</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3"></th>
            </tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-border">
                  <td className="py-3 pr-3"><button onClick={() => startEdit(d)} className="hover:underline font-medium">{d.name_en}</button></td>
                  <td className="py-3 pr-3">{d.type === 'percent' ? `${d.value}%` : `$${(d.value / 100).toFixed(2)}`}</td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">{d.applies_to}{d.applies_value ? `: ${d.applies_value}` : ''}</td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {d.starts_at ? new Date(d.starts_at).toLocaleDateString() : '—'} → {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : (lang === 'ar' ? 'بلا نهاية' : 'no end')}
                  </td>
                  <td className="py-3 pr-3"><button onClick={() => toggleActive(d)}><StatusBadge active={d.active} lang={lang} /></button></td>
                  <td className="py-3 pr-3 text-right">
                    <button onClick={() => startEdit(d)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تعديل' : 'Edit'}</button>
                    <button onClick={() => remove(d)} className="kh-btn-text text-xs ml-3" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'حذف' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-muted-foreground">No automatic discounts.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Campaigns ─────────────────────────────────────────────────────────────

const emptyCampaign = {
  title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '',
  cta_label_en: '', cta_label_ar: '', link_url: '',
  promo_code_id: '', discount_id: '', active: true, starts_at: '', expires_at: '', sort_order: 0,
};

function toCampaignForm(c) {
  return {
    title_en: c.title_en, title_ar: c.title_ar || '', subtitle_en: c.subtitle_en || '', subtitle_ar: c.subtitle_ar || '',
    cta_label_en: c.cta_label_en || '', cta_label_ar: c.cta_label_ar || '', link_url: c.link_url || '',
    promo_code_id: c.promo_code_id || '', discount_id: c.discount_id || '',
    active: c.active, starts_at: isoToLocalInput(c.starts_at), expires_at: isoToLocalInput(c.expires_at),
    sort_order: c.sort_order ?? 0,
  };
}
function toCampaignPayload(f) {
  return {
    title_en: f.title_en.trim(), title_ar: f.title_ar || null,
    subtitle_en: f.subtitle_en || null, subtitle_ar: f.subtitle_ar || null,
    cta_label_en: f.cta_label_en || null, cta_label_ar: f.cta_label_ar || null,
    link_url: f.link_url || null,
    promo_code_id: f.promo_code_id || null, discount_id: f.discount_id || null,
    active: !!f.active, starts_at: localInputToIso(f.starts_at), expires_at: localInputToIso(f.expires_at),
    sort_order: Number(f.sort_order) || 0,
  };
}

function CampaignsTab({ lang }) {
  const [rows, setRows] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCampaign);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [c, pc, d] = await Promise.all([
        base44.entities.Promotions.campaigns.list(),
        base44.entities.Promotions.promoCodes.list(),
        base44.entities.Promotions.discounts.list(),
      ]);
      setRows(c || []); setPromoCodes(pc || []); setDiscounts(d || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setForm(emptyCampaign); setEditingId('new'); setError(''); };
  const startEdit = (c) => { setForm(toCampaignForm(c)); setEditingId(c.id); setError(''); };
  const cancelEdit = () => { setEditingId(null); setForm(emptyCampaign); setError(''); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title_en.trim()) { setError(lang === 'ar' ? 'العنوان مطلوب' : 'Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = toCampaignPayload(form);
      if (editingId === 'new') {
        const created = await base44.entities.Promotions.campaigns.create(payload);
        setRows((rs) => [created, ...rs]);
      } else {
        const updated = await base44.entities.Promotions.campaigns.update(editingId, payload);
        setRows((rs) => rs.map((r) => (r.id === editingId ? updated : r)));
      }
      cancelEdit();
    } catch (err) { setError(err?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(lang === 'ar' ? `حذف "${c.title_en}"؟` : `Delete "${c.title_en}"?`)) return;
    await base44.entities.Promotions.campaigns.remove(c.id);
    setRows((rs) => rs.filter((r) => r.id !== c.id));
  };

  const toggleActive = async (c) => {
    const updated = await base44.entities.Promotions.campaigns.update(c.id, { active: !c.active });
    setRows((rs) => rs.map((r) => (r.id === c.id ? updated : r)));
  };

  if (editingId) {
    return (
      <div className="mt-6 bg-card border border-border rounded-md p-6 max-w-2xl">
        <h3 className="font-heading text-lg uppercase mb-5" style={{ fontFamily: 'var(--brand-font-heading)' }}>
          {editingId === 'new' ? (lang === 'ar' ? 'كامبين جديد' : 'New campaign') : (lang === 'ar' ? 'تعديل الكامبين' : 'Edit campaign')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title (EN)"><input className="kh-input" value={form.title_en} onChange={set('title_en')} /></Field>
          <Field label="Title (AR)"><input className="kh-input" dir="rtl" value={form.title_ar} onChange={set('title_ar')} /></Field>
          <Field label="Subtitle (EN)"><input className="kh-input" value={form.subtitle_en} onChange={set('subtitle_en')} /></Field>
          <Field label="Subtitle (AR)"><input className="kh-input" dir="rtl" value={form.subtitle_ar} onChange={set('subtitle_ar')} /></Field>
          <Field label="CTA label (EN)"><input className="kh-input" value={form.cta_label_en} onChange={set('cta_label_en')} placeholder="Shop now" /></Field>
          <Field label="CTA label (AR)"><input className="kh-input" dir="rtl" value={form.cta_label_ar} onChange={set('cta_label_ar')} /></Field>
          <Field label={lang === 'ar' ? 'الرابط' : 'Link URL'}><input className="kh-input" value={form.link_url} onChange={set('link_url')} placeholder="/shop" /></Field>
          <Field label={lang === 'ar' ? 'ترتيب العرض' : 'Sort order'}><input type="number" className="kh-input" value={form.sort_order} onChange={set('sort_order')} /></Field>
          <Field label={lang === 'ar' ? 'كود مرتبط (اختياري)' : 'Linked promo code (optional)'}>
            <select className="kh-input" value={form.promo_code_id} onChange={set('promo_code_id')}>
              <option value="">—</option>
              {promoCodes.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
          </Field>
          <Field label={lang === 'ar' ? 'حسم مرتبط (اختياري)' : 'Linked discount (optional)'}>
            <select className="kh-input" value={form.discount_id} onChange={set('discount_id')}>
              <option value="">—</option>
              {discounts.map((d) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
            </select>
          </Field>
          <Field label={lang === 'ar' ? 'يبدأ (اختياري)' : 'Starts at (optional)'}>
            <input type="datetime-local" className="kh-input" value={form.starts_at} onChange={set('starts_at')} />
          </Field>
          <Field label={lang === 'ar' ? 'ينتهي (اختياري)' : 'Expires at (optional)'}>
            <input type="datetime-local" className="kh-input" value={form.expires_at} onChange={set('expires_at')} />
          </Field>
          <label className="flex items-center gap-2 mt-1">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            <span className="text-sm">{lang === 'ar' ? 'فعّال' : 'Active'}</span>
          </label>
        </div>
        {error && <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={save} disabled={saving} className="kh-btn-primary">{saving ? 'Saving…' : (lang === 'ar' ? 'حفظ' : 'Save')}</button>
          <button onClick={cancelEdit} className="kh-btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mt-6"><button onClick={startCreate} className="kh-btn-primary">{lang === 'ar' ? 'كامبين جديد +' : '+ New campaign'}</button></div>
      {loading ? <div className="text-muted-foreground mt-6">Loading…</div> : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-3 pr-3">Title</th><th className="py-3 pr-3">Linked</th><th className="py-3 pr-3">Window</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3"></th>
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border">
                  <td className="py-3 pr-3"><button onClick={() => startEdit(c)} className="hover:underline font-medium">{c.title_en}</button></td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {c.promo_code_id ? promoCodes.find((p) => p.id === c.promo_code_id)?.code : ''}
                    {c.discount_id ? discounts.find((d) => d.id === c.discount_id)?.name_en : ''}
                    {!c.promo_code_id && !c.discount_id && '—'}
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'} → {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : (lang === 'ar' ? 'بلا نهاية' : 'no end')}
                  </td>
                  <td className="py-3 pr-3"><button onClick={() => toggleActive(c)}><StatusBadge active={c.active} lang={lang} /></button></td>
                  <td className="py-3 pr-3 text-right">
                    <button onClick={() => startEdit(c)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تعديل' : 'Edit'}</button>
                    <button onClick={() => remove(c)} className="kh-btn-text text-xs ml-3" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'حذف' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-muted-foreground">No campaigns.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Page shell with tabs ─────────────────────────────────────────────────

const TABS = [
  { key: 'codes', label_en: 'Promo codes', label_ar: 'أكواد الحسم' },
  { key: 'discounts', label_en: 'Automatic discounts', label_ar: 'حسومات تلقائية' },
  { key: 'campaigns', label_en: 'Campaigns', label_ar: 'كامبينات' },
];

export default function AdminPromotions() {
  const { lang } = useI18n();
  const [tab, setTab] = useState('codes');

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'الحسومات' : 'Promotions'} sub={lang === 'ar' ? 'أكواد الحسم، الحسومات التلقائية، والكامبينات — كل شي بمكان واحد' : 'Promo codes, automatic discounts, and homepage campaigns — all in one place.'} />

      <div className="flex gap-2 mt-8 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm -mb-px border-b-2 transition-colors"
            style={{
              borderColor: tab === t.key ? 'var(--brand-accent)' : 'transparent',
              color: tab === t.key ? 'var(--brand-accent)' : 'var(--muted)',
            }}
          >
            {lang === 'ar' ? t.label_ar : t.label_en}
          </button>
        ))}
      </div>

      {tab === 'codes' && <PromoCodesTab lang={lang} />}
      {tab === 'discounts' && <DiscountsTab lang={lang} />}
      {tab === 'campaigns' && <CampaignsTab lang={lang} />}
    </div>
  );
}
