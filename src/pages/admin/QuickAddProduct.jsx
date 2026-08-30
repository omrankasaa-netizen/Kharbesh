import React, { useState } from 'react';
import { base44 } from '@/api/khClient';
import { PRODUCT_TYPES, SIZE_OPTIONS, DEFAULT_PRICE_BY_TYPE } from '@/lib/productFormShared';

function SizePills({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SIZE_OPTIONS.map((s) => {
        const active = selected.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(active ? selected.filter((x) => x !== s) : [...selected, s])}
            className="px-3 py-1.5 text-xs rounded-full border transition-colors"
            style={{
              borderColor: active ? 'var(--brand-accent)' : 'var(--border)',
              color: active ? 'var(--brand-accent)' : 'var(--muted)',
              background: active ? 'color-mix(in srgb, var(--brand-accent) 10%, transparent)' : 'transparent',
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

const emptyDraft = { name_en: '', name_ar: '', phrase_en: '', product_type: 'tee', price: DEFAULT_PRICE_BY_TYPE.tee, sizes: SIZE_OPTIONS, status: 'draft' };

/**
 * Fast path for the pre-launch catalog build-out: one design, one photo per
 * color, one submit. Skips every field the full product editor exposes
 * (garment style, preorder rules, care instructions, etc.) — those still
 * default sensibly and can be filled in later via "Edit" if a design needs
 * them. Reuses the same `Product.create` + `ProductColorImages.upsert`
 * endpoints the full editor uses, so there's no new backend surface here.
 */
export default function QuickAddProduct({ lang, colors, onCreated }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [colorImages, setColorImages] = useState({}); // { [colorNameEn]: url }
  const [uploadingColor, setUploadingColor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const priceTouchedRef = React.useRef(false);

  const setProductType = (value) => {
    setDraft((d) => {
      const next = { ...d, product_type: value };
      if (!priceTouchedRef.current && DEFAULT_PRICE_BY_TYPE[value] != null) next.price = DEFAULT_PRICE_BY_TYPE[value];
      return next;
    });
  };

  const onUploadColor = async (colorName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingColor(colorName);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setColorImages((m) => ({ ...m, [colorName]: file_url }));
    } catch {
      setError(lang === 'ar' ? 'ما قدرنا نرفع هالصورة.' : 'Could not upload that photo.');
    } finally {
      setUploadingColor(null);
    }
  };

  const removeColorImage = (colorName) => {
    setColorImages((m) => {
      const next = { ...m };
      delete next[colorName];
      return next;
    });
  };

  const reset = () => {
    setDraft(emptyDraft);
    setColorImages({});
    priceTouchedRef.current = false;
    setError('');
  };

  const submit = async () => {
    setError('');
    if (!draft.name_en.trim()) {
      setError(lang === 'ar' ? 'الاسم (EN) مطلوب.' : 'Name (EN) is required.');
      return;
    }
    const approvedColors = Object.keys(colorImages).filter((c) => colorImages[c]);
    if (approvedColors.length === 0) {
      setError(lang === 'ar' ? 'رفع صورة لون واحد على الأقل.' : 'Upload at least one color photo.');
      return;
    }
    if (!draft.sizes.length) {
      setError(lang === 'ar' ? 'اختار مقاس واحد على الأقل.' : 'Pick at least one size.');
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.Product.create({
        name_en: draft.name_en.trim(),
        name_ar: draft.name_ar.trim() || null,
        phrase_en: draft.phrase_en.trim() || null,
        product_type: draft.product_type,
        price: Number(draft.price) || 0,
        approved_colors: approvedColors,
        sizes: draft.sizes,
        images: [colorImages[approvedColors[0]]],
        status: draft.status,
      });
      // Attach each uploaded photo as that color's real product photo.
      for (const colorName of approvedColors) {
        await base44.entities.ProductColorImages.upsert(created.id, colorName, [colorImages[colorName]]);
      }
      onCreated?.(created);
      reset();
    } catch (err) {
      setError(err?.message || (lang === 'ar' ? 'ما قدرنا ننشئ المنتج.' : 'Could not create the product.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card border border-dashed rounded-md p-5 sm:p-6" style={{ borderColor: 'var(--brand-accent)' }}>
      <h3
        className="font-heading text-sm uppercase tracking-wide mb-1"
        style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-accent)' }}
      >
        {lang === 'ar' ? 'إضافة سريعة — صورة لكل لون' : 'Quick add — one photo per color'}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {lang === 'ar'
          ? 'لتصميم واحد بألوان متعددة: عبّي الاسم والسعر مرة واحدة، رفع صورة لكل لون، وبيعمل المنتج + صور الألوان دفعة واحدة.'
          : 'For one design across several colors: fill name & price once, upload one photo per color, and it creates the product plus every color\u2019s photo in one shot.'}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">Name (EN)*</span>
          <input
            className="kh-input"
            value={draft.name_en}
            onChange={(e) => setDraft((d) => ({ ...d, name_en: e.target.value }))}
            placeholder="Bala 7ob Bala Batikh"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{lang === 'ar' ? 'الاسم (AR) — اختياري' : 'Name (AR) — optional'}</span>
          <input className="kh-input" dir="rtl" value={draft.name_ar} onChange={(e) => setDraft((d) => ({ ...d, name_ar: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{lang === 'ar' ? 'الجملة (EN) — اختياري' : 'Phrase (EN) — optional'}</span>
          <input className="kh-input" value={draft.phrase_en} onChange={(e) => setDraft((d) => ({ ...d, phrase_en: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{lang === 'ar' ? 'النوع' : 'Type'}</span>
          <select className="kh-input" value={draft.product_type} onChange={(e) => setProductType(e.target.value)}>
            {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{lang === 'ar' ? 'السعر' : 'Price'}</span>
          <input
            type="number"
            className="kh-input"
            value={draft.price}
            onChange={(e) => { priceTouchedRef.current = true; setDraft((d) => ({ ...d, price: e.target.value })); }}
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
          <select className="kh-input" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
            <option value="draft">draft</option>
            <option value="active">active</option>
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{lang === 'ar' ? 'المقاسات' : 'Sizes'}</span>
        <SizePills selected={draft.sizes} onChange={(v) => setDraft((d) => ({ ...d, sizes: v }))} />
      </div>

      <div className="mt-5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
          {lang === 'ar' ? 'صورة كل لون — اللون بدون صورة ما بينضاف للمنتج' : 'Photo per color — a color with no photo isn\u2019t added to the product'}
        </span>
        {colors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === 'ar' ? 'زيد ألوان معتمدة من صفحة الألوان أولاً.' : 'Add approved colors from the Colors page first.'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colors.map((c) => (
              <div key={c.id} className="border border-border rounded-md p-3 flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full border border-border shrink-0"
                  style={{ background: c.hex || '#ccc' }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name_en}</div>
                  {colorImages[c.name_en] ? (
                    <div className="flex items-center gap-2 mt-1">
                      <img src={colorImages[c.name_en]} alt="" className="w-10 h-10 rounded object-cover border border-border" />
                      <button type="button" onClick={() => removeColorImage(c.name_en)} className="kh-btn-text !text-xs !p-0" style={{ color: 'var(--brand-destructive)' }}>
                        {lang === 'ar' ? 'إزالة' : 'Remove'}
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onUploadColor(c.name_en, e)}
                      disabled={uploadingColor === c.name_en}
                      className="text-xs mt-1 w-full"
                    />
                  )}
                  {uploadingColor === c.name_en && <span className="text-[11px] text-muted-foreground">{lang === 'ar' ? 'عم يرفع…' : 'Uploading…'}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}

      <div className="flex gap-3 mt-5">
        <button onClick={submit} disabled={saving} className="kh-btn-primary">
          {saving ? (lang === 'ar' ? 'عم ينشئ…' : 'Creating…') : (lang === 'ar' ? 'إنشاء المنتج' : 'Create product')}
        </button>
        <button type="button" onClick={reset} className="kh-btn-secondary">{lang === 'ar' ? 'تصفير' : 'Reset'}</button>
      </div>
    </section>
  );
}
