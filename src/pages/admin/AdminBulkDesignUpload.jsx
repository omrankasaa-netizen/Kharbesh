import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

// Bulk-uploads print-ready master design artwork (transparent PNGs the
// factory prints from) and assigns it straight to EXISTING products —
// distinct from Local Import, which creates NEW products from garment
// mockup photos. Each design folder is named exactly like the product it
// belongs to and holds 1, 2, or up to MAX_DESIGN_FILES design files —
// e.g. front-only (1), front + colour-inverted-for-black (2), or front +
// back each with their own black-garment variant (4). There's no naming
// convention for which file is which, so we sort files alphabetically for
// a deterministic order and forward ALL of them to the factory in that
// order, along with the product's real garment reference photo — the
// factory figures out front/back/colour by eye, we don't try to guess it.

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
// Keep in sync with the server-side cap in api/admin-router.ts.
const MAX_DESIGN_FILES = 6;

// Folder names are typed by hand (or pasted from a spreadsheet/caption doc)
// while product names are typed separately into the admin panel — the two
// often drift apart in ways that are invisible to the eye: a curly quote
// (’) vs a straight one ('), an en-dash (–) vs a plain hyphen, double
// spaces, or Unicode characters that render identically but aren't the
// same code points (NFKC normalization fixes that last one). None of that
// should make an otherwise-correct match fail, so normalize aggressively
// before comparing.
function normalizeName(s) {
  return (s || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ');
}

// Last-resort key once the exact normalized name still doesn't match:
// strip every character that isn't a letter or digit (any script) so
// punctuation style, dash style, and spacing differences between the
// folder name and the product name can't block an otherwise-obvious
// match. Looser, so it's only used as a fallback and flagged for the
// admin to eyeball before they hit Apply.
function looseKey(s) {
  return normalizeName(s).replace(/[^\p{L}\p{N}]+/gu, '');
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
            {folder.looseMatch && (
              <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--brand-destructive)' }}>
                {lang === 'ar' ? '(تطابق تقريبي — تأكد منّو)' : '(loose match — verify)'}
              </span>
            )}
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

      {folder.existingPrintFileCount > 0 && folder._result !== 'success' && (
        <p className="text-[11px] mb-2" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar'
            ? `هذا المنتج عندو ${folder.existingPrintFileCount} ملف/ملفات طباعة مرفوعة سابقاً — رح ينقلبو للملفات الجديدة.`
            : `This product already has ${folder.existingPrintFileCount} print file${folder.existingPrintFileCount === 1 ? '' : 's'} \u2014 they will be replaced by the new ones.`}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {folder.files.map((f) => (
          <FilePreview key={file_key(f)} file={f} lang={lang} />
        ))}
      </div>
      {folder.files.length > MAX_DESIGN_FILES && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar'
            ? `في ${folder.files.length} ملفات بهذا المجلد — أكتر من ${MAX_DESIGN_FILES}. عم ناخد أول ${MAX_DESIGN_FILES} بالترتيب الأبجدي وبتجاهل الباقي.`
            : `This folder has ${folder.files.length} files \u2014 more than the ${MAX_DESIGN_FILES}-file limit. Using the first ${MAX_DESIGN_FILES} in alphabetical order, ignoring the rest.`}
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
  const [productsError, setProductsError] = useState(null);
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
      } catch (err) {
        // Fail loudly instead of leaving allProducts empty and silently
        // matching (and manually assigning) against nothing — that used to
        // look identical to "0 products matched" with no way to tell why.
        setProductsError(
          lang === 'ar'
            ? '⚠️ تعذّر تحميل لائحة المنتجات — التطابق التلقائي وقائمة الاختيار اليدوي رح يكونوا خاليين. حدّث الصفحة أو جرّب لاحقاً.'
            : "⚠️ Couldn't load the product list \u2014 automatic matching and the manual picker will be empty until this loads. Refresh the page or try again.",
        );
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, [lang]);

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
      // Fallback index for the loose match: strip everything except
      // letters/digits so punctuation/dash-style/spacing differences don't
      // block a match that's otherwise obviously correct. Skipped when two
      // products collapse to the same loose key — that's ambiguous, so we
      // require the exact match in that case instead of guessing.
      const looseCounts = new Map();
      for (const p of allProducts) {
        const lk = looseKey(p.name_en);
        if (lk) looseCounts.set(lk, (looseCounts.get(lk) || 0) + 1);
      }
      const byLooseName = new Map();
      for (const p of allProducts) {
        const lk = looseKey(p.name_en);
        if (lk && looseCounts.get(lk) === 1) byLooseName.set(lk, p);
      }

      const built = [];
      let i = 0;
      for (const [folderName, files] of groups) {
        let matchedProduct = byNormalizedName.get(normalizeName(folderName)) || null;
        let looseMatch = false;
        if (!matchedProduct) {
          const lk = looseKey(folderName);
          if (lk && byLooseName.has(lk)) {
            matchedProduct = byLooseName.get(lk);
            looseMatch = true;
          }
        }
        // No naming convention tells us which file is front/back/inverted,
        // so sort alphabetically for a deterministic order — the factory
        // gets all files in that order and figures out front/back/colour
        // by eye, helped by the reference photo sent alongside.
        const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
        built.push({
          key: `${folderName}_${i++}`,
          folderName,
          files: sortedFiles.slice(0, MAX_DESIGN_FILES),
          matchedProduct,
          looseMatch,
          manualProductId: null,
          existingPrintFileCount: matchedProduct?.print_files?.length || 0,
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
      return { ...f, manualProductId: productId, existingPrintFileCount: product?.print_files?.length || 0 };
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
        items.push({ product_id: productId, print_files: uploaded });
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
          ? 'هون منرفع ملفات التصميم الجاهزة للطباعة — منفصلة عن صور المنتج بالموقع. كل مجلد لازم يحمل نفس اسم المنتج بالضبط، وفيه ملف واحد أو أكتر (قدام/خلف، مع أو بدون نسخ معكوسة الألوان للقطع السودا). ما في ترتيب تسمية ثابت للملفات، فمنرتّبهم أبجدياً ومنرسلهم كلهم للمصنع بهذا الترتيب، مع صورة القطعة الحقيقية من المنتج كمرجع — المصنع بيحدد قدام/خلف/لون بالعين.'
          : "This uploads the print-ready artwork the factory prints from \u2014 separate from the storefront photos on the Products page. Each folder must be named exactly like the product it belongs to, and holds one or more design files (e.g. front/back, with or without colour-inverted versions for black garments). There's no fixed naming convention for the files, so we sort them alphabetically and forward all of them to the factory in that order, along with the product's real garment reference photo \u2014 the factory figures out front/back/colour by eye."}
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
      {productsError && <p className="text-sm mt-2" style={{ color: 'var(--brand-destructive)' }}>{productsError}</p>}
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
