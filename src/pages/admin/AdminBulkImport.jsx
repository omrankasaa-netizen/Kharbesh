import React, { useState } from 'react';
import { base44 } from '@/api/khClient';
import { useColors } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { PRODUCT_TYPES, SIZE_OPTIONS, DEFAULT_PRICE_BY_TYPE } from '@/lib/productFormShared';

// Bulk import only ever creates drafts or actives — archiving is a
// per-product action in the editor, not something a CSV should do.
const STATUSES = ['draft', 'active'];

const TEMPLATE_HEADER = ['name_en', 'name_ar', 'phrase_en', 'description_en', 'product_type', 'price', 'sizes', 'status'];
const TEMPLATE_ROWS = [
  ['Bala 7ob Bala Batikh', '', '3andi 7ob willa batikh? khayyer.', '', 'tee', '35', 'S;M;L;XL;XXL', 'draft'],
  ['Sha3eb Byeshrab Ahweh Ktir', '', '', '', 'tee', '35', 'S;M;L;XL;XXL', 'draft'],
];

let rowSeq = 0;
const nextKey = () => `row_${Date.now()}_${rowSeq++}`;

function emptyRow() {
  return {
    key: nextKey(),
    name_en: '',
    name_ar: '',
    phrase_en: '',
    description_en: '',
    product_type: 'tee',
    price: DEFAULT_PRICE_BY_TYPE.tee,
    sizes: [...SIZE_OPTIONS],
    status: 'draft',
    colorImages: {},
  };
}

/** Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes, CRLF/LF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function rowsFromCsv(text) {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return [];
  const header = parsed[0].map((h) => h.trim().toLowerCase());
  return parsed.slice(1).map((cells) => {
    const get = (name) => {
      const idx = header.indexOf(name);
      return idx === -1 ? '' : (cells[idx] || '').trim();
    };
    const productType = PRODUCT_TYPES.includes(get('product_type')) ? get('product_type') : 'tee';
    const priceRaw = Number(get('price'));
    const sizesRaw = get('sizes');
    const status = STATUSES.includes(get('status')) ? get('status') : 'draft';
    return {
      key: nextKey(),
      name_en: get('name_en'),
      name_ar: get('name_ar'),
      phrase_en: get('phrase_en'),
      description_en: get('description_en'),
      product_type: productType,
      price: Number.isFinite(priceRaw) && priceRaw > 0 ? priceRaw : DEFAULT_PRICE_BY_TYPE[productType],
      sizes: sizesRaw ? sizesRaw.split(';').map((s) => s.trim()).filter(Boolean) : [...SIZE_OPTIONS],
      status,
      colorImages: {},
    };
  });
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADER, ...TEMPLATE_ROWS].map((r) => r.map((c) => (c.includes(',') ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kharbesh-bulk-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function SizePills({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SIZE_OPTIONS.map((s) => {
        const active = selected.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(active ? selected.filter((x) => x !== s) : [...selected, s])}
            className="px-2 py-1 text-[11px] rounded-full border transition-colors"
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

function ProductCard({ row, index, colors, onUpdate, onRemove, lang }) {
  const [uploadingColor, setUploadingColor] = useState(null);
  const set = (patch) => onUpdate(row.key, patch);
  const photoCount = Object.keys(row.colorImages).filter((c) => row.colorImages[c]).length;

  const onUploadColor = async (colorName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingColor(colorName);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set({ colorImages: { ...row.colorImages, [colorName]: file_url } });
    } catch {
      /* upload helper already falls back to a raw data URL on failure */
    } finally {
      setUploadingColor(null);
    }
  };

  const removeColorImage = (colorName) => {
    const next = { ...row.colorImages };
    delete next[colorName];
    set({ colorImages: next });
  };

  const statusColor =
    row._result === 'success' ? 'var(--brand-accent)' : row._result === 'error' ? 'var(--brand-destructive)' : 'var(--muted)';

  return (
    <div className="border border-border rounded-md p-4 sm:p-5" style={row._result ? { borderColor: statusColor } : undefined}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs text-muted-foreground shrink-0">#{index + 1}</span>
        <input
          className="kh-input flex-1"
          placeholder="Name (EN)*"
          value={row.name_en}
          onChange={(e) => set({ name_en: e.target.value })}
        />
        <button type="button" onClick={() => onRemove(row.key)} className="kh-btn-text text-xs shrink-0" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar' ? 'إزالة' : 'Remove'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
        <input className="kh-input" dir="rtl" placeholder="Name (AR)" value={row.name_ar} onChange={(e) => set({ name_ar: e.target.value })} />
        <input className="kh-input" placeholder="Phrase (EN)" value={row.phrase_en} onChange={(e) => set({ phrase_en: e.target.value })} />
        <select className="kh-input" value={row.product_type} onChange={(e) => set({ product_type: e.target.value })}>
          {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" className="kh-input flex-1" placeholder="Price" value={row.price} onChange={(e) => set({ price: e.target.value })} />
          <select className="kh-input w-28" value={row.status} onChange={(e) => set({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <textarea
        className="kh-input w-full mb-3"
        rows={2}
        placeholder={lang === 'ar' ? 'الوصف — عمود description_en' : 'Description (Arabizi copy) — leave blank if you want to fill it in later'}
        value={row.description_en}
        onChange={(e) => set({ description_en: e.target.value })}
      />

      <div className="mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1.5">
          {lang === 'ar' ? 'المقاسات' : 'Sizes'}
        </span>
        <SizePills selected={row.sizes} onChange={(v) => set({ sizes: v })} />
      </div>

      <div className="mt-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
          {lang === 'ar' ? `صور الألوان (${photoCount}/${colors.length})` : `Color photos (${photoCount}/${colors.length})`}
        </span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {colors.map((c) => (
            <div key={c.id} className="border border-border rounded-md p-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-border shrink-0" style={{ background: c.hex || '#ccc' }} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{c.name_en}</div>
                {row.colorImages[c.name_en] ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <img src={row.colorImages[c.name_en]} alt="" className="w-8 h-8 rounded object-cover border border-border" />
                    <button type="button" onClick={() => removeColorImage(c.name_en)} className="kh-btn-text !text-[11px] !p-0" style={{ color: 'var(--brand-destructive)' }}>
                      {lang === 'ar' ? 'إزالة' : 'x'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onUploadColor(c.name_en, e)}
                    disabled={uploadingColor === c.name_en}
                    className="text-[11px] mt-1 w-full"
                  />
                )}
                {uploadingColor === c.name_en && <span className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'عم يرفع…' : 'Uploading…'}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {row._error && <p className="text-xs mt-2" style={{ color: 'var(--brand-destructive)' }}>{row._error}</p>}
      {row._result === 'success' && (
        <p className="text-xs mt-2" style={{ color: 'var(--brand-accent)' }}>
          {lang === 'ar' ? 'تم الإنشاء ✓' : 'Created ✓'}
        </p>
      )}
    </div>
  );
}

export default function AdminBulkImport() {
  const { lang } = useI18n();
  const colors = useColors();
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const fileInputRef = React.useRef(null);

  const onCsvSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsedRows = rowsFromCsv(text);
    setRows((prev) => [...prev, ...parsedRows]);
    setSummary(null);
    e.target.value = '';
  };

  const updateRow = (key, patch) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, _result: undefined, _error: undefined } : r)));
  };
  const removeRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key));
  const addManualRow = () => setRows((rs) => [...rs, emptyRow()]);
  const clearAll = () => { setRows([]); setSummary(null); };

  const importAll = async () => {
    const ready = rows.filter((r) => r.name_en.trim() && Object.values(r.colorImages).some(Boolean));
    if (ready.length === 0) {
      setSummary({ error: lang === 'ar' ? 'ما في منتج جاهز — لازم اسم وصورة لون واحدة على الأقل.' : 'Nothing ready \u2014 each product needs a name and at least one color photo.' });
      return;
    }
    setImporting(true);
    setSummary(null);
    try {
      const items = ready.map((r) => ({
        product: {
          name_en: r.name_en.trim(),
          name_ar: r.name_ar.trim() || null,
          phrase_en: r.phrase_en.trim() || null,
          description_en: r.description_en.trim() || null,
          product_type: r.product_type,
          price: Number(r.price) || 0,
          approved_colors: Object.keys(r.colorImages).filter((c) => r.colorImages[c]),
          sizes: r.sizes,
          images: [Object.values(r.colorImages).find(Boolean)],
          status: r.status,
        },
        colorImages: Object.fromEntries(Object.entries(r.colorImages).filter(([, v]) => v).map(([k, v]) => [k, [v]])),
      }));
      const results = await base44.entities.Product.bulkCreate(items);
      // The server processes items in the same order it received them, so
      // results[i] corresponds to ready[i] — match by row key, not by name
      // (two designs can share a name while editing, e.g. before a rename).
      const resultByKey = new Map(ready.map((r, i) => [r.key, results[i]]));
      setRows((rs) =>
        rs.map((r) => {
          const res = resultByKey.get(r.key);
          if (!res) return r;
          return { ...r, _result: res.success ? 'success' : 'error', _error: res.error };
        }),
      );
      const succeeded = results.filter((r) => r.success).length;
      setSummary({ succeeded, failed: results.length - succeeded, total: results.length });
      // Drop the successful rows after a beat so the list only keeps what still needs attention.
      if (succeeded > 0) {
        setTimeout(() => {
          setRows((rs) => rs.filter((r) => r._result !== 'success'));
        }, 2500);
      }
    } catch (err) {
      setSummary({ error: err?.message || (lang === 'ar' ? 'فشل الاستيراد.' : 'Import failed.') });
    } finally {
      setImporting(false);
    }
  };

  const readyCount = rows.filter((r) => r.name_en.trim() && Object.values(r.colorImages).some(Boolean)).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'استيراد بالجملة' : 'Bulk Import'} />
      <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
        {lang === 'ar'
          ? 'حمّل قالب CSV وعبّيه بأسماء وأسعار كل التيشرتات، رفعه هون، بعدين لكل منتج رفع صورة لكل لون. بعد ما تجهز، دوس استيراد الكل.'
          : 'Download the CSV template and fill in name/price/etc. for every shirt, upload it here, then upload one photo per color for each product below. Hit Import when ready \u2014 nothing goes live until you flip status to active.'}
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <button onClick={downloadTemplate} className="kh-btn-secondary">
          {lang === 'ar' ? 'تحميل القالب' : 'Download CSV template'}
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="kh-btn-secondary">
          {lang === 'ar' ? 'رفع CSV' : 'Upload CSV'}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={onCsvSelected} className="hidden" />
        <button onClick={addManualRow} className="kh-btn-text text-xs">
          {lang === 'ar' ? '+ منتج يدوي' : '+ Add row manually'}
        </button>
        {rows.length > 0 && (
          <button onClick={clearAll} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>
            {lang === 'ar' ? 'تصفير الكل' : 'Clear all'}
          </button>
        )}
      </div>

      {colors.length === 0 && (
        <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar' ? 'ما في ألوان معتمدة بعد — زيدها من صفحة الألوان أولاً.' : 'No approved colors yet \u2014 add them on the Colors page first.'}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-8 mt-6 text-center text-sm text-muted-foreground">
          {lang === 'ar' ? 'ابدأ برفع CSV أو إضافة منتج يدوياً.' : 'Start by uploading a CSV or adding a row manually.'}
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-6">
          {rows.map((row, i) => (
            <ProductCard key={row.key} row={row} index={i} colors={colors} onUpdate={updateRow} onRemove={removeRow} lang={lang} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="sticky bottom-0 mt-6 py-4 bg-background border-t border-border flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {lang === 'ar' ? `${readyCount} من ${rows.length} جاهز (اسم + صورة لون واحدة)` : `${readyCount} of ${rows.length} ready (name + at least one color photo)`}
          </span>
          <button onClick={importAll} disabled={importing || readyCount === 0} className="kh-btn-primary">
            {importing ? (lang === 'ar' ? 'عم يستورد…' : 'Importing…') : (lang === 'ar' ? `استيراد ${readyCount}` : `Import ${readyCount} product${readyCount === 1 ? '' : 's'}`)}
          </button>
          {summary?.error && <span className="text-sm" style={{ color: 'var(--brand-destructive)' }}>{summary.error}</span>}
          {summary && !summary.error && (
            <span className="text-sm" style={{ color: summary.failed ? 'var(--brand-destructive)' : 'var(--brand-accent)' }}>
              {lang === 'ar' ? `${summary.succeeded} نجح، ${summary.failed} فشل` : `${summary.succeeded} succeeded.failed} failed`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
