import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44, hasRole } from '@/api/khClient';
import { useAuth } from '@/lib/AuthContext';
import { useColors, useGarmentStyles, useCatalogRefresh, useCollections } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { STANDARD_FRONT_BY_COLOR, DEFAULT_COVER_FRONT } from '@/lib/standardPhotos';
import QuickAddProduct from './QuickAddProduct.jsx';
import { PRODUCT_TYPES, PRODUCT_STATUSES, PREORDER_TYPES, DEFAULT_PRICE_BY_TYPE } from '@/lib/productFormShared';
import { toast } from '@/components/ui/use-toast';

const STATUSES = PRODUCT_STATUSES;

const emptyForm = {
  name_en: '', name_ar: '', phrase_en: '', phrase_ar: '', payoff_en: '',
  description_en: '', description_ar: '', collection_name: '', mood: '',
  product_type: 'tee', garment_style: '', fit_en: '', care_en: '', care_ar: '',
  measurements_en: '', approved_colors: [], sizes: [], placement: '',
  price: DEFAULT_PRICE_BY_TYPE.tee, compare_at_price: '', images: [DEFAULT_COVER_FRONT], print_file_url: null, status: 'draft',
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

// units_sold is auto-managed by orders (cancelling an order returns its
// units) — edits from this form are ignored, so it's never sent.
function toPayload(f) {
  const { units_sold: _unitsSold, ...rest } = f;
  return {
    ...rest,
    price: Number(f.price) || 0,
    compare_at_price: f.compare_at_price === '' ? null : Number(f.compare_at_price),
    preorder_capacity: f.preorder_capacity === '' ? null : Number(f.preorder_capacity),
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

function Field({ label, help, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">{label}</span>
      {children}
      {help && <span className="block text-[11px] text-muted-foreground mt-1">{help}</span>}
    </label>
  );
}

/** Grouped card with a title — the visual container for each form section. */
function SectionCard({ title, sub, children }) {
  return (
    <section className="bg-card border border-border rounded-md p-5 sm:p-6">
      <h3 className="font-heading text-sm uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-accent)' }}>
        {title}
      </h3>
      {sub && <p className="text-xs text-muted-foreground mb-4">{sub}</p>}
      <div className={sub ? 'grid gap-4' : 'grid gap-4 mt-4'}>{children}</div>
    </section>
  );
}

/** Collapsed-by-default section for rarely-used fields, so the default form
 * a non-technical staffer sees stays short. Native <details> — no extra libs. */
function AdvancedSection({ title, lang, children }) {
  return (
    <details className="bg-card border border-border rounded-md group">
      <summary
        className="cursor-pointer select-none list-none px-5 sm:px-6 py-4 flex items-center justify-between text-sm font-medium"
        style={{ color: 'var(--ink)' }}
      >
        <span>{title}</span>
        <span className="text-xs text-muted-foreground group-open:hidden">{lang === 'ar' ? 'فتح ▾' : 'Show ▾'}</span>
        <span className="text-xs text-muted-foreground hidden group-open:inline">{lang === 'ar' ? 'إغلاق ▴' : 'Hide ▴'}</span>
      </summary>
      <div className="px-5 sm:px-6 pb-6 grid gap-4">{children}</div>
    </details>
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
 * separate from the main product Save button. Exactly one photo per
 * approved color — front and back are shot combined into a single image,
 * so there's no separate back slot to manage.
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
        // Pre-fill the standard front photo for any approved color that
        // doesn't have real photos saved yet. This is local, unsaved state —
        // staff just hits "Save for this color", or swaps the front image
        // out first if this particular design also prints on the front.
        for (const colorName of approvedColors) {
          if (!map[colorName] && STANDARD_FRONT_BY_COLOR[colorName]) {
            map[colorName] = [STANDARD_FRONT_BY_COLOR[colorName]];
          }
        }
        setByColor(map);
      })
      .catch(() => { if (!cancelled) setByColor({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, approvedColors]);

  const onUpload = async (colorName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingColor(colorName);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // One photo per color — a new upload replaces whatever was there.
      setByColor((m) => ({ ...m, [colorName]: [file_url] }));
    } finally { setUploadingColor(null); }
  };

  const removeImage = (colorName) => {
    setByColor((m) => ({ ...m, [colorName]: [] }));
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
          </div>
          <div className="flex flex-wrap gap-3 mb-3">
            {(byColor[colorName] || []).map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(colorName)} className="absolute top-0.5 right-0.5 bg-black/70 text-white text-xs w-5 h-5 rounded-full">×</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
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

/** Cover photo uploader — a single image (index 0 of the top-level `images`
 * array) used as the Shop-grid thumbnail and the gallery fallback before a
 * shopper's per-color photo has loaded. Front and back are shot combined
 * into one photo, so there's only ever one cover slot. */
function CoverPhotosField({ images, onUpload, onRemove, uploading, lang }) {
  const slots = [
    { idx: 0, label: lang === 'ar' ? 'صورة الغلاف' : 'Cover photo' },
  ];
  return (
    <div className="flex flex-wrap gap-4">
      {slots.map((slot) => {
        const url = images[slot.idx];
        return (
          <div key={slot.idx} className="w-32">
            <div className="relative w-32 h-40 rounded-md overflow-hidden border border-border bg-background flex items-center justify-center">
              {url ? (
                <>
                  <img src={url} alt={slot.label} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onRemove(slot.idx)} className="absolute top-1 right-1 bg-black/70 text-white text-xs w-5 h-5 rounded-full">×</button>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground px-2 text-center">{lang === 'ar' ? 'صورة كخربش' : 'Kharbesh placeholder'}</span>
              )}
              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">{slot.label}</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onUpload(slot.idx, e)}
              disabled={uploading === slot.idx}
              className="text-xs mt-2 w-full"
            />
            {uploading === slot.idx && <span className="text-[11px] text-muted-foreground">{lang === 'ar' ? 'عم يرفع…' : 'Uploading…'}</span>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Garment style dropdown with an inline "add new" escape hatch. Staff pick
 * from the seeded list (Oversized Tee, Classic Tee, ...) but can add a style
 * that isn't there yet (Regular Fit, Pique, ...) without leaving the form —
 * it's saved to the shared catalog immediately and selected on this product.
 */
function GarmentStyleField({ value, onChange, styles, lang }) {
  const { refreshStyles } = useCatalogRefresh();
  const [adding, setAdding] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startAdd = () => { setAdding(true); setNameEn(''); setNameAr(''); setError(''); };
  const cancelAdd = () => { setAdding(false); setError(''); };

  const save = async () => {
    if (!nameEn.trim()) { setError(lang === 'ar' ? 'لازم اسم بالإنكليزي.' : 'Name (EN) is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await base44.entities.Styles.create({ name_en: nameEn.trim(), name_ar: nameAr.trim() || null });
      await refreshStyles();
      onChange(created.name_en);
      setAdding(false);
    } catch (err) {
      setError(err?.message || (lang === 'ar' ? 'ما قدرنا نضيف هالستايل.' : 'Could not add this style.'));
    } finally { setSaving(false); }
  };

  if (adding) {
    return (
      <div className="space-y-2 p-3 rounded-md border border-dashed" style={{ borderColor: 'var(--brand-accent)' }}>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            autoFocus
            className="kh-input"
            placeholder={lang === 'ar' ? 'اسم الستايل (EN) — Regular Fit' : 'Style name (EN) — e.g. Regular Fit'}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
          />
          <input
            className="kh-input"
            dir="rtl"
            placeholder={lang === 'ar' ? 'اسم الستايل (AR) — اختياري' : 'Style name (AR) — optional'}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
        </div>
        {error && <p className="text-xs" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}
        <div className="flex gap-2">
          <button type="button" disabled={saving} onClick={save} className="kh-btn-primary text-xs px-3 py-1.5">
            {saving ? '…' : (lang === 'ar' ? 'إضافة وإختيار' : 'Add & select')}
          </button>
          <button type="button" onClick={cancelAdd} className="kh-btn-text text-xs">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  return (
    <select
      className="kh-input"
      value={value || ''}
      onChange={(e) => (e.target.value === '__add_new__' ? startAdd() : onChange(e.target.value))}
    >
      <option value="">—</option>
      {styles.map((s) => <option key={s.id} value={s.name_en}>{s.name_en}</option>)}
      <option value="__add_new__">{lang === 'ar' ? '+ إضافة ستايل جديد…' : '+ Add new style…'}</option>
    </select>
  );
}

export default function AdminProducts() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const isSuperAdmin = hasRole(user, 'super_admin');
  const colors = useColors();
  const styles = useGarmentStyles();
  const { collections } = useCollections();
  // Existing collection names for the datalist/quick-assign dropdown. Includes
  // any free-typed collection names already on products that aren't formal
  // collection records yet, so nothing looks "lost" in the dropdown.
  const collectionNames = useMemo(() => {
    const names = new Set((collections || []).map((c) => c.name_en).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [collections]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // 'new' | id | null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const priceTouched = useRef(false);

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

  const startCreate = () => { setForm(emptyForm); priceTouched.current = false; setEditingId('new'); setError(''); };
  const startEdit = (p) => { setForm(toFormShape(p)); priceTouched.current = true; setEditingId(p.id); setError(''); };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setError(''); };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setPrice = (e) => { priceTouched.current = true; setForm((f) => ({ ...f, price: e.target.value })); };

  // A new product's price auto-fills to a sensible default for the chosen
  // garment type, until the staffer types a price themselves.
  const setProductType = (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, product_type: value };
      if (editingId === 'new' && !priceTouched.current && DEFAULT_PRICE_BY_TYPE[value] != null) {
        next.price = DEFAULT_PRICE_BY_TYPE[value];
      }
      return next;
    });
  };

  const [uploadingPrintFile, setUploadingPrintFile] = useState(false);
  const onPrintFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPrintFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, print_file_url: file_url }));
    } finally { setUploadingPrintFile(false); }
  };
  const removePrintFile = () => setForm((f) => ({ ...f, print_file_url: null }));

  const onCoverUpload = async (slotIdx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slotIdx);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => {
        const next = [...f.images];
        next[slotIdx] = file_url;
        return { ...f, images: next };
      });
    } finally { setUploadingSlot(null); }
  };
  const removeCoverImage = (slotIdx) => setForm((f) => {
    const next = [...f.images];
    next[slotIdx] = undefined;
    // trim trailing empty slots so we don't save a hole-filled array
    while (next.length && next[next.length - 1] === undefined) next.pop();
    return { ...f, images: next };
  });

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
    try {
      await base44.entities.Product.delete(p.id);
      setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, status: 'archived' } : x)));
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نأرشف' : 'Could not archive'), variant: 'destructive' });
    }
  };

  // Super_admin-only permanent delete (test-data cleanup pre-launch). Requires
  // typing the product's exact name back — there's no undo once this hits
  // the server, unlike Archive above.
  const hardDelete = async (p) => {
    const typed = window.prompt(
      lang === 'ar'
        ? `حذف نهائي! ما في تراجع. اكتب اسم المنتج تماماً للتأكيد:\n"${p.name_en}"`
        : `Permanent delete — this cannot be undone. Type the product name exactly to confirm:\n"${p.name_en}"`,
    );
    if (typed !== p.name_en) return;
    try {
      await base44.entities.Product.hardDelete(p.id);
      setProducts((ps) => ps.filter((x) => x.id !== p.id));
    } catch (err) {
      window.alert(err?.message || (lang === 'ar' ? 'ما قدرنا نحذف.' : 'Could not delete.'));
    }
  };

  const quickStatus = async (p, status) => {
    try {
      const updated = await base44.entities.Product.update(p.id, { status });
      setProducts((ps) => ps.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحدّث الحالة' : 'Could not update status'), variant: 'destructive' });
    }
  };

  // Quick collection (category) assignment straight from the products table —
  // no need to open the full editor just to move a tee into a collection.
  const quickCollection = async (p, collectionName) => {
    const next = collectionName || null;
    if ((p.collection_name ?? null) === next) return;
    const prev = p.collection_name;
    setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, collection_name: next } : x)));
    try {
      await base44.entities.Product.update(p.id, { collection_name: next });
    } catch (err) {
      setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, collection_name: prev } : x)));
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحدّث المجموعة' : 'Could not update collection'), variant: 'destructive' });
    }
  };

  // ── Selection + batch actions ─────────────────────────────────────────
  const toggleSelected = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selectedIds.has(p.id));
  const someVisibleSelected = visible.some((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => setSelectedIds((prev) => {
    if (allVisibleSelected) {
      // Unselect only what's currently visible (search may be filtering the list).
      const next = new Set(prev);
      visible.forEach((p) => next.delete(p.id));
      return next;
    }
    const next = new Set(prev);
    visible.forEach((p) => next.add(p.id));
    return next;
  });

  const clearSelection = () => setSelectedIds(new Set());

  const bulkSetStatus = async (status) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await base44.entities.Product.bulkUpdateStatus(ids, status);
      setProducts((ps) => ps.map((p) => (selectedIds.has(p.id) ? { ...p, status } : p)));
      clearSelection();
    } catch (err) {
      window.alert(err?.message || (lang === 'ar' ? 'ما قدرنا نبدّل الحالة.' : 'Could not update status.'));
    } finally { setBulkBusy(false); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const confirmWord = lang === 'ar' ? 'حذف' : 'DELETE';
    const typed = window.prompt(
      lang === 'ar'
        ? `حذف نهائي لـ ${ids.length} منتج! ما في تراجع. اكتب "${confirmWord}" للتأكيد:`
        : `Permanent delete of ${ids.length} product(s) — this cannot be undone. Type "${confirmWord}" to confirm:`,
    );
    if (typed !== confirmWord) return;
    setBulkBusy(true);
    try {
      await base44.entities.Product.bulkHardDelete(ids);
      setProducts((ps) => ps.filter((p) => !selectedIds.has(p.id)));
      clearSelection();
    } catch (err) {
      window.alert(err?.message || (lang === 'ar' ? 'ما قدرنا نحذف.' : 'Could not delete.'));
    } finally { setBulkBusy(false); }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'المنتجات' : 'Products'} />

      {editingId ? (
        <div className="mt-8 max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>
              {editingId === 'new' ? (lang === 'ar' ? 'منتج جديد' : 'New product') : (lang === 'ar' ? 'تعديل المنتج' : 'Edit product')}
            </h2>
            <button onClick={cancelEdit} className="kh-btn-text text-sm">{lang === 'ar' ? '← رجوع للائحة' : '← Back to list'}</button>
          </div>

          {/* 1. Basics — the only fields required to describe the piece */}
          <SectionCard title={lang === 'ar' ? '١. الأساسيات' : '1. Basics'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={lang === 'ar' ? 'اسم المنتج (EN)' : 'Product name (EN)'}>
                <input className="kh-input" value={form.name_en} onChange={set('name_en')} placeholder="Financially Unstable Tee" />
              </Field>
              <Field label={lang === 'ar' ? 'اسم المنتج (AR)' : 'Product name (AR)'}>
                <input className="kh-input" dir="rtl" value={form.name_ar || ''} onChange={set('name_ar')} />
              </Field>
              <Field label={lang === 'ar' ? 'النوع' : 'Product type'}>
                <select className="kh-input" value={form.product_type} onChange={setProductType}>
                  {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={lang === 'ar' ? 'المجموعة' : 'Collection'}>
                <input className="kh-input" list="kh-collection-names" value={form.collection_name || ''} onChange={set('collection_name')} placeholder="Kharbesh Quotes" />
                <datalist id="kh-collection-names">
                  {collectionNames.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label={lang === 'ar' ? 'قصة القطعة' : 'Garment style'} help={lang === 'ar' ? 'مثلاً: أوفرسايز، ريغولر، بيكيه' : 'e.g. Oversized, Regular Fit, Pique'}>
                <GarmentStyleField
                  value={form.garment_style}
                  onChange={(v) => setForm((f) => ({ ...f, garment_style: v }))}
                  styles={styles}
                  lang={lang}
                />
              </Field>
            </div>
          </SectionCard>

          {/* 2. The words — the phrase and copy that carry the joke */}
          <SectionCard title={lang === 'ar' ? '٢. الكلام' : '2. The words'} sub={lang === 'ar' ? 'الجملة الأساسية على القطعة ووصفها' : 'The headline phrase on the piece, and how you describe it.'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={lang === 'ar' ? 'الجملة (EN)' : 'Phrase (EN)'}><input className="kh-input" value={form.phrase_en || ''} onChange={set('phrase_en')} /></Field>
              <Field label={lang === 'ar' ? 'الجملة (AR)' : 'Phrase (AR)'}><input className="kh-input" dir="rtl" value={form.phrase_ar || ''} onChange={set('phrase_ar')} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={lang === 'ar' ? 'الوصف (EN)' : 'Description (EN)'}>
                <textarea className="kh-input" rows={3} value={form.description_en || ''} onChange={set('description_en')} />
              </Field>
              <Field label={lang === 'ar' ? 'الوصف (AR)' : 'Description (AR)'}>
                <textarea className="kh-input" dir="rtl" rows={3} value={form.description_ar || ''} onChange={set('description_ar')} />
              </Field>
            </div>
          </SectionCard>

          {/* 3. Pricing & status — what it costs and whether it's live */}
          <SectionCard title={lang === 'ar' ? '٣. السعر والحالة' : '3. Pricing & status'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={lang === 'ar' ? 'السعر ($)' : 'Price ($)'} help={lang === 'ar' ? 'التيشيرت الافتراضي ٣٥$' : 'Tees default to $35 — override if this piece is different.'}>
                <input type="number" step="0.01" className="kh-input" value={form.price} onChange={setPrice} />
              </Field>
              <Field label={lang === 'ar' ? 'سعر قبل الخصم ($) — اختياري' : 'Compare-at price ($) — optional'}>
                <input type="number" step="0.01" className="kh-input" value={form.compare_at_price} onChange={set('compare_at_price')} />
              </Field>
              <Field label={lang === 'ar' ? 'الحالة' : 'Status'} help={lang === 'ar' ? 'فعّال = ظاهر للزبائن، مسودة = مخفي' : 'Active = visible to shoppers. Draft = hidden while you finish it.'}>
                <select className="kh-input" value={form.status} onChange={set('status')}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>

          {/* 4. Colors & sizes */}
          <SectionCard title={lang === 'ar' ? '٤. الألوان والمقاسات' : '4. Colors & sizes'}>
            <Field label={lang === 'ar' ? 'الألوان المعتمدة' : 'Approved colors'}>
              <TogglePills
                options={colors.map((c) => c.name_en)}
                selected={form.approved_colors}
                onChange={(v) => setForm((f) => ({ ...f, approved_colors: v }))}
              />
            </Field>
            <Field label={lang === 'ar' ? 'المقاسات' : 'Sizes'}>
              <TogglePills
                options={['S', 'M', 'L', 'XL', 'XXL']}
                selected={form.sizes}
                onChange={(v) => setForm((f) => ({ ...f, sizes: v }))}
              />
            </Field>
          </SectionCard>

          {/* 5. Photos — cover photo, plus one photo per approved color once saved */}
          <SectionCard
            title={lang === 'ar' ? '٥. الصور' : '5. Photos'}
            sub={lang === 'ar'
              ? 'صورة المنتج الأساسية. لبيك ما في صورة مرفوعة، بيظهر شعار خربش كصورة مؤقتة.'
              : 'The main product photo. Until you upload a real garment photo, the Kharbesh logo placeholder shows instead.'}
          >
            <CoverPhotosField
              images={form.images}
              onUpload={onCoverUpload}
              onRemove={removeCoverImage}
              uploading={uploadingSlot}
              lang={lang}
            />
            {editingId !== 'new' && (
              <div className="mt-6 border-t border-border pt-6">
                <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                  {lang === 'ar' ? 'صور حسب اللون (اختياري)' : 'Photos by color (optional)'}
                </span>
                <p className="text-xs text-muted-foreground mb-4">
                  {lang === 'ar'
                    ? 'حمّل صورة القميص الحقيقية لكل لون معتمد، ليشوف الزبون شكل التصميم عاللون يلي اختاره.'
                    : 'Upload the real garment photo per approved color, so shoppers see the actual printed design on the color they picked.'}
                </p>
                <ColorImagesSection productId={editingId} approvedColors={form.approved_colors} lang={lang} />
              </div>
            )}
            <div className="mt-6 border-t border-border pt-6">
              <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                {lang === 'ar' ? 'ملف الطباعة (للمصنع)' : 'Print file (for factory)'}
              </span>
              <p className="text-xs text-muted-foreground mb-3">
                {lang === 'ar'
                  ? 'الملف الجاهز للطباعة يلي بيروح عالمصنع مع كل طلبية — منفصل عن صور الموقع.'
                  : 'The print-ready artwork sent to the factory with every order for this design — separate from the storefront photos above.'}
              </p>
              {form.print_file_url ? (
                <div className="flex items-center gap-3 text-sm">
                  <a href={form.print_file_url} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--brand-accent)' }}>
                    {lang === 'ar' ? 'فتح الملف الحالي' : 'View current file'}
                  </a>
                  <button type="button" onClick={removePrintFile} className="kh-btn-text text-xs">{lang === 'ar' ? 'إزالة' : 'Remove'}</button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-2">{lang === 'ar' ? 'ما في ملف طباعة مرفوع بعد.' : 'No print file uploaded yet.'}</p>
              )}
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={onPrintFileUpload}
                disabled={uploadingPrintFile}
                className="text-xs mt-2 w-full"
              />
              {uploadingPrintFile && <span className="text-[11px] text-muted-foreground">{lang === 'ar' ? 'عم يرفع…' : 'Uploading…'}</span>}
            </div>
          </SectionCard>

          {/* 6. Advanced — collapsed by default, rarely touched fields */}
          <AdvancedSection title={lang === 'ar' ? 'إعدادات متقدمة' : 'Advanced settings'} lang={lang}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payoff (EN)"><input className="kh-input" value={form.payoff_en || ''} onChange={set('payoff_en')} /></Field>
              <Field label="Mood"><input className="kh-input" value={form.mood || ''} onChange={set('mood')} /></Field>
              <Field label="Placement"><input className="kh-input" value={form.placement || ''} onChange={set('placement')} placeholder="Front, centered" /></Field>
              <Field label="Fit (EN)"><input className="kh-input" value={form.fit_en || ''} onChange={set('fit_en')} /></Field>
              <Field label="Measurements (EN)"><input className="kh-input" value={form.measurements_en || ''} onChange={set('measurements_en')} /></Field>
              <Field label="Care (EN)"><textarea className="kh-input" rows={2} value={form.care_en || ''} onChange={set('care_en')} /></Field>
              <Field label="Care (AR)"><textarea className="kh-input" dir="rtl" rows={2} value={form.care_ar || ''} onChange={set('care_ar')} /></Field>
              <Field label="Sort order"><input type="number" className="kh-input" value={form.sort_order} onChange={set('sort_order')} /></Field>
              <Field label="Drop name"><input className="kh-input" value={form.drop_name || ''} onChange={set('drop_name')} /></Field>
            </div>

            <div className="border-t border-border pt-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-3">Preorder</span>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preorder type">
                  <select className="kh-input" value={form.preorder_type} onChange={set('preorder_type')}>
                    {PREORDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Preorder capacity">
                  <input type="number" className="kh-input" value={form.preorder_capacity} onChange={set('preorder_capacity')} />
                </Field>
                <Field label="Preorder close date"><input type="date" className="kh-input" value={form.preorder_close_date} onChange={set('preorder_close_date')} /></Field>
                <Field label="Units sold" help={lang === 'ar' ? 'بتتحدّث تلقائياً من الطلبات — إلغاء الطلب بيرجّع القطع هون. التعديل اليدوي بينتجاهَل.' : 'Auto-managed by orders — cancelling an order returns its units here. Edits are ignored.'}>
                  <input type="number" className="kh-input opacity-60" value={form.units_sold} readOnly disabled />
                </Field>
                <Field label="Est. production days"><input type="number" className="kh-input" value={form.estimated_production_days} onChange={set('estimated_production_days')} /></Field>
                <Field label="Est. dispatch window"><input className="kh-input" value={form.estimated_dispatch_window || ''} onChange={set('estimated_dispatch_window')} placeholder="7–10 days" /></Field>
              </div>
            </div>
          </AdvancedSection>

          {error && <p className="text-sm" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}

          <div className="flex gap-3">
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
            <div className="flex gap-3">
              <button onClick={() => setQuickAddOpen((v) => !v)} className="kh-btn-secondary">
                {quickAddOpen
                  ? (lang === 'ar' ? 'إقفال الإضافة السريعة' : 'Close quick add')
                  : (lang === 'ar' ? 'إضافة سريعة بالصور +' : '+ Quick add by photos')}
              </button>
              <button onClick={startCreate} className="kh-btn-primary">{lang === 'ar' ? 'منتج جديد +' : '+ New product'}</button>
            </div>
          </div>

          {quickAddOpen && (
            <div className="mt-6">
              <QuickAddProduct
                lang={lang}
                colors={colors}
                onCreated={(created) => { setProducts((ps) => [created, ...ps]); }}
              />
            </div>
          )}

          {selectedIds.size > 0 && (
            <div
              className="mt-6 flex flex-wrap items-center gap-3 rounded-md border px-4 py-3"
              style={{ borderColor: 'var(--brand-accent)', background: 'color-mix(in srgb, var(--brand-accent) 8%, transparent)' }}
            >
              <span className="text-sm font-medium">
                {lang === 'ar' ? `${selectedIds.size} منتج محدد` : `${selectedIds.size} selected`}
              </span>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => bulkSetStatus('active')}
                className="kh-btn-secondary !text-xs !py-1.5 !px-3"
              >
                {lang === 'ar' ? 'تفعيل' : 'Set active'}
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => bulkSetStatus('draft')}
                className="kh-btn-secondary !text-xs !py-1.5 !px-3"
              >
                {lang === 'ar' ? 'مسودة' : 'Set draft'}
              </button>
              {isSuperAdmin && (
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={bulkDelete}
                  className="kh-btn-secondary !text-xs !py-1.5 !px-3"
                  style={{ color: 'var(--brand-destructive)', fontWeight: 600 }}
                >
                  {lang === 'ar' ? 'حذف نهائي' : 'Delete selected'}
                </button>
              )}
              <button type="button" onClick={clearSelection} className="kh-btn-text text-xs ml-auto">
                {lang === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-muted-foreground mt-8">Loading…</div>
          ) : (
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-3 pr-3 w-8">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
                        onChange={toggleSelectAll}
                        aria-label={lang === 'ar' ? 'تحديد الكل' : 'Select all'}
                      />
                    </th>
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
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelected(p.id)}
                          aria-label={lang === 'ar' ? 'تحديد' : `Select ${p.name_en}`}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <button onClick={() => startEdit(p)} className="text-left hover:underline">{p.name_en}</button>
                        {/* Quick category (collection) assign — inline, no need
                            to open the full editor just to move a tee. */}
                        <select
                          value={p.collection_name || ''}
                          onChange={(e) => quickCollection(p, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 text-xs text-muted-foreground bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5 max-w-[180px] cursor-pointer"
                          title={lang === 'ar' ? 'غيّر المجموعة' : 'Change collection'}
                        >
                          <option value="">{lang === 'ar' ? '— بلا مجموعة —' : '— No collection —'}</option>
                          {p.collection_name && !collectionNames.includes(p.collection_name) && (
                            <option value={p.collection_name}>{p.collection_name}</option>
                          )}
                          {collectionNames.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
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
                        {isSuperAdmin && (
                          <button onClick={() => hardDelete(p)} className="kh-btn-text text-xs ml-3" style={{ color: 'var(--brand-destructive)', fontWeight: 600 }}>
                            {lang === 'ar' ? 'حذف نهائي' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={7} className="py-8 text-muted-foreground">No products.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
