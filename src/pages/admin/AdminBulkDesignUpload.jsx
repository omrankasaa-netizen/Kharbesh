import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

// Bulk-uploads print-ready master design artwork (transparent PNGs the
// factory prints from) and assigns it straight to EXISTING products —
// distinct from Local Import, which creates NEW products from garment
// mockup photos. Each design folder is named exactly like the product it
// belongs to; it holds 1 file, or 2 when the design needs a second,
// colour-inverted version for printing on black garments. Both files (when
// there are two) go to the factory — we don't try to guess which one is
// "for black", the factory sorts that out per order.

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

function normalizeName(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function file_key(file) {
  return `${file.name}_${file.size}`;
}

function FilePreview({ file, lang }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file.type?.startsWith('image/')) return;
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [file]);

  return (
    <div className="flex items-center gap-2 border border-border rounded-md px-2 py-1.5">
      {url ? (
        <img src={url} alt={file.name} className="w-10 h-10 rounded object-contain bg-[repeating-conic-gradient(#0000_0_25%,#8883_0_50%)_0_0/12px_12px] border border-border shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
          {lang === 'ar' ? 'PDF' : 'PDF'}
        </div>
      )}
      <span className="text-xs truncate max-w-[160px]">{file.name}</span>
    </div>
  );
}

function DesignFolderCard({ folder, products, onResolve, lang }) {
  const matchedName = folder.matchedProduct
    ? (lang === 'ar' && folder.matchedProduct.name_ar) || folder.matchedProduct.name_en
    : null;

  return (
    <div
      className="border rounded-md p-4 sm:p-5"
      style={{
        borderColor: folder._result === 'success'
          ? 'var(--brand-accent)'
          : folder._result === 'error'
            ? 'var(--brand-destructive)'
            : folder.matchedProduct
              ? 'var(--border)'
              : 'var(--brand-destructive)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">{folder.folderName}</span>
        {folder.matchedProduct ? (
          <span className="text-sm font-medium" style={{ color: 'var(--brand-accent)' }}>
            → {matchedName}
          </span>
        ) : (
          <select
            className="kh-input !text-xs !py-1 flex-1 max-w-xs"
            value={folder.manualProductId || ''}
            onChange={(e) => onResolve(folder.key, e.target.value || null)}
          >
            <option value="">{lang === 'ar' ? '— ما في تطابق، اختر منتج —' : '— no match, pick a product —'}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name_en}</option>
            ))}
          </select>
        )}
      </div>

      {folder.existingPrintFile && folder._result !== 'success' && (
        <p className="text-[11px] mb-2" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar' ? 'هذا المنتج عندو ملف طباعة مرفوع سابقاً — رح يتبدّل.' : 'This product already has a print file \u2014 it will be replaced.'}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {folder.files.map((f) => (
          <FilePreview key={file_key(f)} file={f} lang={lang} />
        ))}
      </div>
      {folder.files.length > 2 && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar'
            ? `في ${folder.files.length} ملفات بهذا المجلد — لازم ملف أو ملفين بس. عم ناخد أول ملفين وبتجاهل الباقي.`
            : `This folder has ${folder.files.length} files \u2014 expected 1 or 2. Using the first two, ignoring the rest.`}
        </p>
      )}

      {folder._error && <p className="text-xs mt-2" style={{ color: 'var(--brand-destructive)' }}>{folder._error}</p>}
      {folder._uploading && (
        <p className="text-xs mt-2 text-muted-foreground">{lang === 'ar' ? 'عم يرفع…' : 'Uploading\u2026'}</p>
      )}
      {folder._result === 'success' && (
        <p className="text-xs mt-2" style={{ color: 'var(--brand-accent)' }}>{lang === 'ar' ? 'تم الربط ✓' : 'Assigned ✓'}</p>
      )}
    </div>
  );
}

export default function AdminBulkDesignUpload() {
  const { lang } = useI18n();
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [applying, setApplying] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.Product.list();
        setAllProducts((rows || []).filter((p) => p.status !== 'archived'));
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  const onPickFolder = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same folder later
    if (fileList.length === 0) return;
    setScanning(true);
    setScanError(null);
    setSummary(null);
    try {
      const groups = new Map();
      for (const file of fileList) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        const rel = file.webkitRelativePath || file.name;
        const parts = rel.split('/');
        // parts[0] is the picked root folder itself; a file needs at least
        // one subfolder level (root/Design Name/file.png) to count.
        if (parts.length < 3) continue;
        const folderName = parts[1];
        if (!groups.has(folderName)) groups.set(folderName, []);
        groups.get(folderName).push(file);
      }
      if (groups.size === 0) {
        setScanError(
          lang === 'ar'
            ? 'ما لقينا مجلدات تصاميم — تأكد إنك اخترت المجلد الأم (اللي فيه مجلد لكل تصميم).'
            : "Couldn't find any design subfolders \u2014 make sure you selected the parent folder (the one containing one subfolder per design).",
        );
        return;
      }
      const byNormalizedName = new Map(allProducts.map((p) => [normalizeName(p.name_en), p]));
      const built = [];
      let i = 0;
      for (const [folderName, files] of groups) {
        const matchedProduct = byNormalizedName.get(normalizeName(folderName)) || null;
        built.push({
          key: `${folderName}_${i++}`,
          folderName,
          files: files.slice(0, 2),
          matchedProduct,
          manualProductId: null,
          existingPrintFile: matchedProduct?.print_file_url || null,
        });
      }
      // Design folders first (name found in caption order), unmatched last so they stand out.
      built.sort((a, b) => (a.matchedProduct ? 0 : 1) - (b.matchedProduct ? 0 : 1));
      setFolders(built);
    } catch (err) {
      setScanError(err?.message || (lang === 'ar' ? 'فشل قراءة المجلد.' : 'Could not read the selected folder.'));
    } finally {
      setScanning(false);
    }
  };

  const resolveManualMatch = (key, productId) => {
    setFolders((fs) => fs.map((f) => {
      if (f.key !== key) return f;
      const product = productId ? allProducts.find((p) => String(p.id) === String(productId)) : null;
      return { ...f, manualProductId: productId, existingPrintFile: product?.print_file_url || null };
    }));
  };

  const resolvedFolders = folders.filter((f) => f.matchedProduct || f.manualProductId);
  const unresolvedCount = folders.length - resolvedFolders.length;

  const applyAll = async () => {
    if (resolvedFolders.length === 0) return;
    setApplying(true);
    setSummary(null);
    setFolders((fs) => fs.map((f) => ({ ...f, _uploading: resolvedFolders.some((r) => r.key === f.key), _result: undefined, _error: undefined })));

    const items = [];
    const itemFolderKeys = [];
    for (const folder of resolvedFolders) {
      try {
        const productId = String(folder.matchedProduct ? folder.matchedProduct.id : folder.manualProductId);
        const uploaded = [];
        for (const file of folder.files) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploaded.push(file_url);
        }
        if (uploaded.length === 0) throw new Error(lang === 'ar' ? 'ما في ملفات.' : 'No files found.');
        items.push({ product_id: productId, print_file_url: uploaded[0], print_file_url_2: uploaded[1] || null });
        itemFolderKeys.push(folder.key);
      } catch (err) {
        setFolders((fs) => fs.map((f) => (f.key === folder.key ? { ...f, _uploading: false, _result: 'error', _error: err?.message || String(err) } : f)));
      }
    }

    let succeeded = 0;
    let failed = folders.length - resolvedFolders.length + (resolvedFolders.length - itemFolderKeys.length);
    try {
      const results = await base44.entities.Product.bulkAssignDesignFiles(items);
      const byProductId = new Map(results.map((r) => [r.product_id, r]));
      setFolders((fs) => fs.map((f) => {
        const idx = itemFolderKeys.indexOf(f.key);
        if (idx === -1) return f;
        const productId = String(f.matchedProduct ? f.matchedProduct.id : f.manualProductId);
        const result = byProductId.get(productId);
        if (result?.success) succeeded++; else failed++;
        return { ...f, _uploading: false, _result: result?.success ? 'success' : 'error', _error: result?.error };
      }));
    } catch (err) {
      failed += itemFolderKeys.length;
      setFolders((fs) => fs.map((f) => (itemFolderKeys.includes(f.key) ? { ...f, _uploading: false, _result: 'error', _error: err?.message || String(err) } : f)));
    }

    setSummary({ succeeded, failed, total: folders.length });
    if (succeeded > 0) {
      setTimeout(() => {
        setFolders((fs) => fs.filter((f) => f._result !== 'success'));
      }, 2500);
    }
    setApplying(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'رفع تصاميم الطباعة بالجملة' : 'Bulk Design Upload'} />
      <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
        {lang === 'ar'
          ? 'هون منرفع ملفات التصميم الجاهزة للطباعة (خلفية شفافة) — منفصلة عن صور المنتج بالموقع. كل مجلد لازم يحمل نفس اسم المنتج بالضبط، وفيه ملف أو ملفين (إذا التصميم بحاجة نسخة معكوسة الألوان للطباعة عالقطع السودا). الملفين، إذا في اثنين، بيروحوا عالمصنع سوا وهو بيقرر شو يستخدم حسب لون القطعة.'
          : "This uploads the print-ready artwork (transparent PNGs) the factory prints from \u2014 separate from the storefront photos on the Products page. Each folder must be named exactly like the product it belongs to, and holds 1 file, or 2 when the design needs a colour-inverted version for printing on black garments. When there are two, both go to the factory and it decides which to use per garment colour."}
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <label className={`kh-btn-primary inline-block cursor-pointer ${loadingProducts ? 'opacity-60 pointer-events-none' : ''}`}>
          {scanning ? (lang === 'ar' ? 'عم يقرأ…' : 'Reading…') : (lang === 'ar' ? 'اختر المجلد' : 'Select folder')}
          <input
            type="file"
            webkitdirectory="true"
            directory=""
            multiple
            className="hidden"
            disabled={scanning || loadingProducts}
            onChange={onPickFolder}
          />
        </label>
        {folders.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {lang === 'ar'
              ? `${folders.length} مجلد، ${resolvedFolders.length} متطابق`
              : `${folders.length} folder${folders.length === 1 ? '' : 's'} found, ${resolvedFolders.length} matched`}
          </span>
        )}
      </div>
      {scanError && <p className="text-sm mt-2" style={{ color: 'var(--brand-destructive)' }}>{scanError}</p>}
      {unresolvedCount > 0 && (
        <p className="text-sm mt-2" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar'
            ? `${unresolvedCount} مجلد ما لقيناله منتج مطابق بالاسم — اختر المنتج يدوياً وإلا رح ينضل متجاهل.`
            : `${unresolvedCount} folder${unresolvedCount === 1 ? '' : 's'} had no product matching that exact name \u2014 pick one manually or it'll be skipped.`}
        </p>
      )}

      {folders.length > 0 && (
        <div className="flex flex-col gap-4 mt-6">
          {folders.map((f) => (
            <DesignFolderCard key={f.key} folder={f} products={allProducts} onResolve={resolveManualMatch} lang={lang} />
          ))}
        </div>
      )}

      {folders.length > 0 && (
        <div className="sticky bottom-0 mt-6 py-4 bg-background border-t border-border flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {lang === 'ar' ? `${resolvedFolders.length} من ${folders.length} جاهز` : `${resolvedFolders.length} of ${folders.length} ready`}
          </span>
          <button onClick={applyAll} disabled={applying || resolvedFolders.length === 0} className="kh-btn-primary">
            {applying
              ? (lang === 'ar' ? 'عم يطبّق…' : 'Applying…')
              : (lang === 'ar' ? `طبّق على ${resolvedFolders.length}` : `Apply to ${resolvedFolders.length} product${resolvedFolders.length === 1 ? '' : 's'}`)}
          </button>
          {summary && (
            <span className="text-sm" style={{ color: summary.failed ? 'var(--brand-destructive)' : 'var(--brand-accent)' }}>
              {lang === 'ar' ? `${summary.succeeded} نجح، ${summary.failed} فشل` : `${summary.succeeded} succeeded, ${summary.failed} failed`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
