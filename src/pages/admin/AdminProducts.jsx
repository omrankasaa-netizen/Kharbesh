import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/khClient';
import { useColors, useGarmentStyles } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const PRODUCT_TYPES = ['tee', 'hoodie', 'accessory'];
const STATUSES = ['active', 'draft', 'archived'];
const PREORDER_TYPES = ['always_on', 'open_until', 'quantity_target', 'limited_quantity'];

const emptyForm = {
  name_en: '', name_ar: '', phrase_en: '', phrase_ar: '', payoff_en: '',
  description_en: '', description_ar: '', collection_name: '', mood: '',
  product_type: 'tee', garment_style: '', fit_en: '', care_en: '', care_ar: '',
  measurements_en: '', approved_colors: [], sizes: [], placement: '',
  price: 0, compare_at_price: '', images: [], status: 'draft',
  preorder_type: 'always_on', preorder_close_date: '', preorder_capacity: '',
  units_sold: 0, estimated_production_days: 10, estimated_dispatch_window: '',
  drop_name: '', sort_order: 0,
};

function toFormShape(p) {
  return {
    ...emptyForm,
    ...p,
    compare_at_price: p.compare_at_price ?? '',
    preorder_close_date: p.preorder_close_date ?? '',
    preorder_capacity: p.preorder_capacity ?? '',
    approved_colors: p.approved_colors || [],
    sizes: p.sizes || [],
    images: p.images || [],
  };
}

function toPayload(f) {
  return {
    ...f,
    price: Number(f.price) || 0,
    compare_at_price: f.compare_at_price === '' ? null : Number(f.compare_at_price),
    preorder_capacity: f.preorder_capacity === '' ? null : Number(f.preorder_capacity),
    units_sold: Number(f.units_sold) || 0,
    estimated_production_days: Number(f.estimated_production_days) || 0,
    sort_order: Number(f.sort_order) || 0,
    name_ar: f.name_ar || null,
    phrase_en: f.phrase_en || null,
    phrase_ar: f.phrase_ar || null,
    payoff_en: f.payoff_en || null,
    description_en: f.description_en || null,
    description_ar: f.description_ar || null,
    collection_name: f.collection_name || null,
    mood: f.mood || null,
    garment_style: f.garment_style || null,
    fit_en: f.fit_en || null,
    care_en: f.care_en || null,
    care_ar: f.care_ar || null,
    measurements_en: f.measurements_en || null,
    placement: f.placement || null,
    preorder_close_date: f.preorder_close_date || null,
    estimated_dispatch_window: f.estimated_dispatch_window || null,
    drop_name: f.drop_name || null,
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function TogglePills({ options, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? selected.filter((s) => s !== o) : [...selected, o])}
            className="px-3 py-1.5 text-xs rounded-full border transition-colors"
            style={{
              borderColor: active ? 'var(--brand-accent)' : 'var(--border)',
              color: active ? 'var(--brand-accent)' : 'var(--muted)',
              background: active ? 'color-mix(in srgb, var(--brand-accent) 10%, transparent)' : 'transparent',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Per-color garment photos: uploads are saved immediately against the real
 * product id (color images are keyed by DB id, not the draft form state),
 * separate from the main product Save button. Front/back thumbnails let a
 * shopper preview the actual printed shirt in the color they picked.
 */
function ColorImagesSection({ productId, approvedColors, lang }) {
  const [byColor, setByColor] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingColor, setUploadingColor] = useState(null);
  const [savingColor, setSavingColor] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    base44.entities.ProductColorImages.list(productId)
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        for (const r of rows || []) map[r.color_name] = r.images || [];
        setByColor(map);
      })
      .catch(() => { if (!cancelled) setByColor({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  const onUpload = async (colorName, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingColor(colorName);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setByColor((m) => ({ ...m, [colorName]: [...(m[colorName] || []), ...urls] }));
    } finally { setUploadingColor(null); }
  };

  const removeImage = (colorName, idx) => {
    setByColor((m) => ({ ...m, [colorName]: (m[colorName] || []).filter((_, i) => i !== idx) }));
  };

  const saveColor = async (colorName) => {
    setSavingColor(colorName);
    try {
      const images = byColor[colorName] || [];
      if (images.length) {
        await base44.entities.ProductColorImages.upsert(productId, colorName, images);
      } else {
        await base44.entities.ProductColorImages.remove(productId, colorName);
      }
    } finally { setSavingColor(null); }
  };

  if (!approvedColors.length) {
    return <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'اختار الألوان المعتمدة فوق أولاً.' : 'Pick approved colors above first.'}</p>;
  }
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-5">
      {approvedColors.map((colorName) => (
        <div key={colorName} className="border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">{colorName}</span>
            <span className="text-[11px] text-muted-foreground">{lang === 'ar' ? '(الأولى = أمام، الثانية = خلف)' : '(1st = front, 2nd = back)'}</span>
          </div>
          <div className="flex flex-wrap gap-3 mb-3">
            {(byColor[colorName] || []).map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[10px] px-1 rounded">{i === 0 ? 'Front' : i === 1 ? 'Back' : i + 1}</span>
                <button type="button" onClick={() => removeImage(colorName, i)} className="absolute top-0.5 right-0.5 bg-black/70 text-white text-xs w-5 h-5 rounded-full">×</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onUpload(colorName, e)}
              disabled={uploadingColor === colorName}
              className="text-sm"
            />
            {uploadingColor === colorName && <span className="text-xs text-muted-foreground">Uploading…</span>}
            <button
              type="button"
              onClick={() => saveColor(colorName)}
              disabled={savingColor === colorName}
              className="kh-btn-secondary !text-xs !py-1.5 !px-3 ml-auto"
            >
              {savingColor === colorName ? 'Saving…' : (lang === 'ar' ? 'حفظ لهاللون' : 'Save for this color')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminProducts() {
  const { lang } = useI18n();
  const colors = useColors();
  const styles = useGarmentStyles();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // 'new' | id | null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Product.list();
      setProducts(list || []);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) =>
      (p.name_en || '').toLowerCase().includes(s) ||
      (p.name_ar || '').toLowerCase().includes(s) ||
      (p.collection_name || '').toLowerCase().includes(s));
  }, [products, search]);

  const startCreate = () => { setForm(emptyForm); setEditingId('new'); setError(''); };
  const startEdit = (p) => { setForm(toFormShape(p)); setEditingId(p.id); setError(''); };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setError(''); };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } finally { setUploading(false); }
  };
  const removeImage = (idx) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.name_en.trim()) { setError(lang === 'ar' ? 'الاسم مطلوب' : 'Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = toPayload(form);
      if (editingId === 'new') {
        const created = await base44.entities.Product.create(payload);
        setProducts((ps) => [created, ...ps]);
      } else {
        const updated = await base44.entities.Product.update(editingId, payload);
        setProducts((ps) => ps.map((p) => (p.id === editingId ? updated : p)));
      }
      cancelEdit();
    } catch (err) {
      setError(err?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const archive = async (p) => {
    if (!window.confirm(lang === 'ar' ? 'أرشفة هالمنتج؟' : `Archive "${p.name_en}"?`)) return;
    await base44.entities.Product.delete(p.id);
    setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, status: 'archived' } : x)));
  };

  const quickStatus = async (p, status) => {
    const updated = await base44.entities.Product.update(p.id, { status });
    setProducts((ps) => ps.map((x) => (x.id === p.id ? updated : x)));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'المنتجات' : 'Products'} />

      {editingId ? (
        <div className="mt-8 bg-card border border-border rounded-md p-6 max-w-4xl">
          <h2 className="font-heading text-xl uppercase mb-6" style={{ fontFamily: 'var(--brand-font-heading)' }}>
            {editingId === 'new' ? (lang === 'ar' ? 'منتج جديد' : 'New product') : (lang === 'ar' ? 'تعديل المنتج' : 'Edit product')}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (EN)"><input className="kh-input" value={form.name_en} onChange={set('name_en')} /></Field>
            <Field label="Name (AR)"><input className="kh-input" dir="rtl" value={form.name_ar || ''} onChange={set('name_ar')} /></Field>
            <Field label="Phrase (EN)"><input className="kh-input" value={form.phrase_en || ''} onChange={set('phrase_en')} /></Field>
            <Field label="Phrase (AR)"><input className="kh-input" dir="rtl" value={form.phrase_ar || ''} onChange={set('phrase_ar')} /></Field>
            <Field label="Payoff (EN)"><input className="kh-input" value={form.payoff_en || ''} onChange={set('payoff_en')} /></Field>
            <Field label="Collection">
              <input className="kh-input" value={form.collection_name || ''} onChange={set('collection_name')} placeholder="Kharbesh Quotes" />
            </Field>
            <Field label="Description (EN)">
              <textarea className="kh-input" rows={3} value={form.description_en || ''} onChange={set('description_en')} />
            </Field>
            <Field label="Description (AR)">
              <textarea className="kh-input" dir="rtl" rows={3} value={form.description_ar || ''} onChange={set('description_ar')} />
            </Field>

            <Field label="Product type">
              <select className="kh-input" value={form.product_type} onChange={set('product_type')}>
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Garment style">
              <select className="kh-input" value={form.garment_style || ''} onChange={set('garment_style')}>
                <option value="">—</option>
                {styles.map((s) => <option key={s.id} value={s.name_en}>{s.name_en}</option>)}
              </select>
            </Field>
            <Field label="Mood"><input className="kh-input" value={form.mood || ''} onChange={set('mood')} /></Field>
            <Field label="Placement"><input className="kh-input" value={form.placement || ''} onChange={set('placement')} placeholder="Front, centered" /></Field>
            <Field label="Fit (EN)"><input className="kh-input" value={form.fit_en || ''} onChange={set('fit_en')} /></Field>
            <Field label="Measurements (EN)"><input className="kh-input" value={form.measurements_en || ''} onChange={set('measurements_en')} /></Field>
            <Field label="Care (EN)"><textarea className="kh-input" rows={2} value={form.care_en || ''} onChange={set('care_en')} /></Field>
            <Field label="Care (AR)"><textarea className="kh-input" dir="rtl" rows={2} value={form.care_ar || ''} onChange={set('care_ar')} /></Field>

            <Field label="Approved colors">
              <TogglePills
                options={colors.map((c) => c.name_en)}
                selected={form.approved_colors}
                onChange={(v) => setForm((f) => ({ ...f, approved_colors: v }))}
              />
            </Field>
            <Field label="Sizes">
              <TogglePills
                options={['XS', 'S', 'M', 'L', 'XL', 'XXL']}
                selected={form.sizes}
                onChange={(v) => setForm((f) => ({ ...f, sizes: v }))}
              />
            </Field>

            <Field label="Price ($)"><input type="number" step="0.01" className="kh-input" value={form.price} onChange={set('price')} /></Field>
            <Field label="Compare-at price ($)"><input type="number" step="0.01" className="kh-input" value={form.compare_at_price} onChange={set('compare_at_price')} /></Field>

            <Field label="Status">
              <select className="kh-input" value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Sort order"><input type="number" className="kh-input" value={form.sort_order} onChange={set('sort_order')} /></Field>

            <Field label="Preorder type">
              <select className="kh-input" value={form.preorder_type} onChange={set('preorder_type')}>
                {PREORDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Preorder capacity">
              <input type="number" className="kh-input" value={form.preorder_capacity} onChange={set('preorder_capacity')} />
            </Field>
            <Field label="Preorder close date"><input type="date" className="kh-input" value={form.preorder_close_date} onChange={set('preorder_close_date')} /></Field>
            <Field label="Units sold"><input type="number" className="kh-input" value={form.units_sold} onChange={set('units_sold')} /></Field>
            <Field label="Est. production days"><input type="number" className="kh-input" value={form.estimated_production_days} onChange={set('estimated_production_days')} /></Field>
            <Field label="Est. dispatch window"><input className="kh-input" value={form.estimated_dispatch_window || ''} onChange={set('estimated_dispatch_window')} placeholder="7–10 days" /></Field>
            <Field label="Drop name"><input className="kh-input" value={form.drop_name || ''} onChange={set('drop_name')} /></Field>
          </div>

          <div className="mt-6">
            <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">Images</span>
            <div className="flex flex-wrap gap-3 mb-3">
              {form.images.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/70 text-white text-xs w-5 h-5 rounded-full">×</button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" multiple onChange={onImages} disabled={uploading} className="text-sm" />
            {uploading && <span className="text-xs text-muted-foreground ml-2">Uploading…</span>}
          </div>

          {editingId !== 'new' && (
            <div className="mt-8 border-t border-border pt-6">
              <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                {lang === 'ar' ? 'صور حسب اللون' : 'Photos by color'}
              </span>
              <p className="text-xs text-muted-foreground mb-4">
                {lang === 'ar'
                  ? 'حمّل صورة القميص الحقيقية لكل لون معتمد، ليشوف الزبون شكل التصميم عاللون يلي اختاره.'
                  : 'Upload real garment photos per approved color, so shoppers see the actual printed design on the color they picked.'}
              </p>
              <ColorImagesSection productId={editingId} approvedColors={form.approved_colors} lang={lang} />
            </div>
          )}

          {error && <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}

          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="kh-btn-primary">
              {saving ? 'Saving…' : (lang === 'ar' ? 'حفظ' : 'Save')}
            </button>
            <button onClick={cancelEdit} className="kh-btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
            <input
              className="kh-input max-w-xs"
              placeholder={lang === 'ar' ? 'بحث...' : 'Search products…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={startCreate} className="kh-btn-primary">{lang === 'ar' ? 'منتج جديد +' : '+ New product'}</button>
          </div>

          {loading ? (
            <div className="text-muted-foreground mt-8">Loading…</div>
          ) : (
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-3 pr-3">Product</th>
                    <th className="py-3 pr-3">Type</th>
                    <th className="py-3 pr-3">Price</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Sold</th>
                    <th className="py-3 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="py-3 pr-3">
                        <button onClick={() => startEdit(p)} className="text-left hover:underline">{p.name_en}</button>
                        <div className="text-xs text-muted-foreground">{p.collection_name}</div>
                      </td>
                      <td className="py-3 pr-3">{p.product_type}</td>
                      <td className="py-3 pr-3">${p.price}</td>
                      <td className="py-3 pr-3">
                        <select value={p.status} onChange={(e) => quickStatus(p, e.target.value)} className="kh-input !h-9 !py-1 max-w-[130px]">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-3">{p.units_sold || 0}</td>
                      <td className="py-3 pr-3 text-right">
                        <button onClick={() => startEdit(p)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تعديل' : 'Edit'}</button>
                        {p.status !== 'archived' && (
                          <button onClick={() => archive(p)} className="kh-btn-text text-xs ml-3" style={{ color: 'var(--brand-destructive)' }}>
                            {lang === 'ar' ? 'أرشفة' : 'Archive'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={6} className="py-8 text-muted-foreground">No products.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
