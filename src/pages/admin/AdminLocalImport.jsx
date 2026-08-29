import React, { useState } from 'react';
import { base44 } from '@/api/khClient';
import { useColors } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { classifyGarmentColor, GARMENT_COLOR_ANCHORS, REVIEW_SUGGESTED_DISTANCE, bestColorAssignment } from '@/lib/localGarmentColorClassifier';

// Local-folder version of the Drive import tool: same "one subfolder per
// design, up to 4 color mockup photos" workflow and the same min-cost
// color-assignment logic (see `bestColorAssignment`), but everything runs
// against files picked straight from the founder's computer via
// <input webkitdirectory> — no Google OAuth, no sensitive-scope
// verification, no Drive access at all.
// Uploads reuse the exact same client-side downscale + R2 upload
// (`base44.integrations.Core.UploadFile`) and product-creation
// (`base44.entities.Product.bulkCreate`) calls as Bulk Import, so every
// server-side rule already enforced there applies here too.

const PRODUCT_TYPES = ['tee', 'hoodie', 'accessory'];
const STATUSES = ['draft', 'active'];
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];
const DEFAULT_PRICE_BY_TYPE = { tee: 35, hoodie: 35, accessory: 35 };

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

function ImageThumb({ candidate, muted, lang }) {
  if (!candidate) {
    return (
      <div
        className="w-14 h-14 rounded border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0"
        style={{ opacity: muted ? 0.5 : 1 }}
      >
        {lang === 'ar' ? 'فاضي' : 'empty'}
      </div>
    );
  }
  return candidate.thumbUrl ? (
    <img
      src={candidate.thumbUrl}
      alt={candidate.file.name}
      className="w-14 h-14 rounded object-cover border border-border shrink-0"
      style={{ opacity: muted ? 0.5 : 1 }}
    />
  ) : (
    <div className="w-14 h-14 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
      {lang === 'ar' ? 'خطأ' : 'err'}
    </div>
  );
}

const COLOR_NAMES = GARMENT_COLOR_ANCHORS.map((a) => a.name);

/**
 * Reads the garment color of every photo in a folder, then finds the best
 * overall pairing between the (up to 4) approved colors and the photos in
 * that folder.
 *
 * Uses `bestColorAssignment` (a true min-cost bipartite match, brute-forced
 * over every permutation since there are at most 4 colors) rather than a
 * greedy "take the globally smallest single pair first" heuristic. Greedy
 * is provably suboptimal whenever two anchors sit close together — White
 * and Grey are only 35 RGB units apart — so a true-Grey photo that happens
 * to read slightly closer to White than the true-White photo does would
 * steal the White slot first under greedy, leaving the true-White photo
 * mismatched even though swapping the two lowers the TOTAL cost.
 */
async function classifyAndAssign(files) {
  const candidates = [];
  for (const file of files) {
    try {
      const guess = await classifyGarmentColor(file);
      candidates.push({
        file,
        thumbUrl: URL.createObjectURL(file),
        distances: guess.distances,
        bestGuess: guess.colorName,
        confident: guess.confident,
      });
    } catch (err) {
      candidates.push({
        file,
        thumbUrl: '',
        distances: null,
        bestGuess: null,
        confident: false,
      });
    }
  }
  candidates.forEach((c, i) => {
    c.id = `${file_key(c.file)}__${i}`;
  });

  const assignment = bestColorAssignment(
    candidates.map((c) => ({ id: c.id, distances: c.distances })),
    COLOR_NAMES,
  );
  const colorMatches = {};
  const colorDistances = {};
  for (const { id, color, distance } of assignment) {
    colorMatches[color] = candidates.find((c) => c.id === id);
    colorDistances[color] = distance;
  }
  return { candidates, colorMatches, colorDistances };
}

function file_key(file) {
  return `${file.name}_${file.size}`;
}

function DesignCard({ design, colors, onUpdate, lang }) {
  const photoCount = colors.filter((c) => design.colorFiles[c.name_en]).length;
  const byId = new Map(design.allCandidates.map((c) => [c.id, c]));
  const set = (patch) => onUpdate(design.key, patch);

  const setColorFile = (colorName, id) => {
    const next = { ...design.colorFiles };
    if (id) next[colorName] = id;
    else delete next[colorName];
    set({ colorFiles: next });
  };

  const assignedIds = new Set(Object.values(design.colorFiles).filter(Boolean));

  return (
    <div
      className="border border-border rounded-md p-4 sm:p-5"
      style={design._result ? { borderColor: design._result === 'success' ? 'var(--brand-accent)' : 'var(--brand-destructive)' } : undefined}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs text-muted-foreground shrink-0">{design.folderName}</span>
        <input
          className="kh-input flex-1"
          placeholder="Name (EN)*"
          value={design.nameEn}
          onChange={(e) => set({ nameEn: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
        <input className="kh-input" dir="rtl" placeholder="Name (AR)" value={design.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
        <select className="kh-input" value={design.productType} onChange={(e) => set({ productType: e.target.value, price: DEFAULT_PRICE_BY_TYPE[e.target.value] })}>
          {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" className="kh-input flex-1" placeholder="Price" value={design.price} onChange={(e) => set({ price: e.target.value })} />
          <select className="kh-input w-28" value={design.status} onChange={(e) => set({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <SizePills selected={design.sizes} onChange={(v) => set({ sizes: v })} />
        </div>
      </div>

      <div className="mt-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
          {lang === 'ar' ? `صور الألوان (${photoCount}/${colors.length})` : `Color photos (${photoCount}/${colors.length})`}
        </span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {colors.map((c) => {
            const id = design.colorFiles[c.name_en];
            const candidate = id ? byId.get(id) : null;
            const autoId = design.autoColorFiles?.[c.name_en];
            const isAutoStill = autoId && autoId === id;
            const needsReview = isAutoStill && (design.colorDistances?.[c.name_en] ?? 0) > REVIEW_SUGGESTED_DISTANCE;
            return (
              <div
                key={c.id}
                className="border rounded-md p-2 flex items-center gap-2"
                style={{ borderColor: needsReview ? 'var(--brand-destructive)' : 'var(--border)' }}
              >
                <span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ background: c.hex || '#ccc' }} aria-hidden />
                <ImageThumb candidate={candidate} lang={lang} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate flex items-center gap-1">
                    {c.name_en}
                    {needsReview && (
                      <span title={lang === 'ar' ? 'راجع هالصورة — التخمين مش أكيد' : "Double-check this one \u2014 the guess isn't confident"} style={{ color: 'var(--brand-destructive)' }}>
                        ⚠
                      </span>
                    )}
                  </div>
                  <select
                    className="kh-input !text-[11px] !py-1 mt-1 w-full"
                    value={id || ''}
                    onChange={(e) => setColorFile(c.name_en, e.target.value || null)}
                  >
                    <option value="">{lang === 'ar' ? '— بلا صورة —' : '— no photo —'}</option>
                    {design.allCandidates.map((cand) => (
                      <option key={cand.id} value={cand.id} disabled={cand.id !== id && assignedIds.has(cand.id)}>
                        {cand.file.name}
                        {autoId === cand.id ? (lang === 'ar' ? ' (تلقائي)' : ' (auto)') : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {design._error && <p className="text-xs mt-2" style={{ color: 'var(--brand-destructive)' }}>{design._error}</p>}
      {design._uploading && (
        <p className="text-xs mt-2 text-muted-foreground">{lang === 'ar' ? 'عم يرفع الصور…' : 'Uploading photos…'}</p>
      )}
      {design._result === 'success' && (
        <p className="text-xs mt-2" style={{ color: 'var(--brand-accent)' }}>{lang === 'ar' ? 'تم الإنشاء ✓' : 'Created ✓'}</p>
      )}
    </div>
  );
}

export default function AdminLocalImport() {
  const { lang } = useI18n();
  const colors = useColors();
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  const updateDesign = (key, patch) => {
    setDesigns((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch, _result: undefined, _error: undefined } : d)));
  };

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
        if (!file.type?.startsWith('image/')) continue;
        const rel = file.webkitRelativePath || file.name;
        const parts = rel.split('/');
        // parts[0] is the picked root folder itself; a file needs at least
        // one subfolder level (root/Design Name/photo.jpg) to count as a
        // design — anything sitting loose in the root is skipped.
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
      const built = [];
      let i = 0;
      for (const [folderName, files] of groups) {
        const { candidates, colorMatches, colorDistances } = await classifyAndAssign(files);
        const colorFiles = {};
        Object.entries(colorMatches).forEach(([color, c]) => { colorFiles[color] = c.id; });
        built.push({
          key: `${folderName}_${i++}`,
          folderName,
          nameEn: folderName,
          nameAr: '',
          productType: 'tee',
          price: DEFAULT_PRICE_BY_TYPE.tee,
          sizes: [...SIZE_OPTIONS],
          status: 'draft',
          allCandidates: candidates,
          colorFiles,
          autoColorFiles: { ...colorFiles },
          colorDistances,
        });
      }
      setDesigns(built);
    } catch (err) {
      setScanError(err?.message || (lang === 'ar' ? 'فشل قراءة المجلد.' : 'Could not read the selected folder.'));
    } finally {
      setScanning(false);
    }
  };

  const readyDesigns = designs.filter((d) => d.nameEn.trim() && Object.keys(d.colorFiles).length > 0);

  const importAll = async () => {
    if (readyDesigns.length === 0) return;
    setImporting(true);
    setSummary(null);
    let succeeded = 0;
    let failed = 0;
    for (const d of readyDesigns) {
      setDesigns((ds) => ds.map((x) => (x.key === d.key ? { ...x, _uploading: true, _result: undefined, _error: undefined } : x)));
      try {
        const byId = new Map(d.allCandidates.map((c) => [c.id, c]));
        const colorImages = {};
        let firstUrl = null;
        for (const [colorName, id] of Object.entries(d.colorFiles)) {
          const candidate = byId.get(id);
          if (!candidate) continue;
          const { file_url } = await base44.integrations.Core.UploadFile({ file: candidate.file });
          colorImages[colorName] = [file_url];
          if (!firstUrl) firstUrl = file_url;
        }
        if (!firstUrl) throw new Error(lang === 'ar' ? 'ما في صور مربوطة.' : 'No photos assigned.');
        const item = {
          product: {
            name_en: d.nameEn.trim(),
            name_ar: d.nameAr.trim() || null,
            product_type: d.productType,
            price: Number(d.price) || 0,
            approved_colors: Object.keys(colorImages),
            sizes: d.sizes,
            images: [firstUrl],
            status: d.status,
          },
          colorImages,
        };
        const [result] = await base44.entities.Product.bulkCreate([item]);
        if (result?.success) succeeded++; else failed++;
        setDesigns((ds) =>
          ds.map((x) => (x.key === d.key ? { ...x, _uploading: false, _result: result?.success ? 'success' : 'error', _error: result?.error } : x)),
        );
      } catch (err) {
        failed++;
        setDesigns((ds) =>
          ds.map((x) => (x.key === d.key ? { ...x, _uploading: false, _result: 'error', _error: err?.message || String(err) } : x)),
        );
      }
    }
    setSummary({ succeeded, failed, total: readyDesigns.length });
    if (succeeded > 0) {
      setTimeout(() => {
        setDesigns((ds) => ds.filter((d) => d._result !== 'success'));
      }, 2500);
    }
    setImporting(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'استيراد من مجلد محلي' : 'Import from Local Folder'} />
      <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
        {lang === 'ar'
          ? 'كل تصميم بمجلده الخاص فيه لـ 4 صور (أسود، أبيض، غري، أنتراسيد). اختار المجلد الأم من جهازك (اللي فيه كل مجلدات التصاميم)، وحنا منحاول نعرف لون كل صورة تلقائياً — راجع/صحح قبل الاستيراد. ما في ولا خطوة ربط أو صلاحيات، كل شي عم يصير محلياً بالمتصفح.'
          : "Each design lives in its own subfolder with the 4 color mockup photos (Black, White, Grey, Antracid). Pick the parent folder on your computer (the one containing all the design subfolders) and we'll guess each photo's color automatically \u2014 review and fix anything wrong before importing. No connection step, no permissions \u2014 everything runs locally in your browser."}
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <label className="kh-btn-primary inline-block cursor-pointer">
          {scanning ? (lang === 'ar' ? 'عم يقرأ…' : 'Reading…') : (lang === 'ar' ? 'اختر المجلد' : 'Select folder')}
          <input
            type="file"
            webkitdirectory="true"
            directory=""
            multiple
            accept="image/*"
            className="hidden"
            disabled={scanning}
            onChange={onPickFolder}
          />
        </label>
        {designs.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {lang === 'ar' ? `${designs.length} تصميم لقيناه` : `${designs.length} design${designs.length === 1 ? '' : 's'} found`}
          </span>
        )}
      </div>
      {scanError && <p className="text-sm mt-2" style={{ color: 'var(--brand-destructive)' }}>{scanError}</p>}

      {colors.length === 0 && (
        <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>
          {lang === 'ar' ? 'ما في ألوان معتمدة بعد — زيدها من صفحة الألوان أولاً.' : 'No approved colors yet \u2014 add them on the Colors page first.'}
        </p>
      )}

      {designs.length > 0 && (
        <div className="flex flex-col gap-4 mt-6">
          {designs.map((d) => (
            <DesignCard key={d.key} design={d} colors={colors} onUpdate={updateDesign} lang={lang} />
          ))}
        </div>
      )}

      {designs.length > 0 && (
        <div className="sticky bottom-0 mt-6 py-4 bg-background border-t border-border flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {lang === 'ar' ? `${readyDesigns.length} من ${designs.length} جاهز` : `${readyDesigns.length} of ${designs.length} ready`}
          </span>
          <button onClick={importAll} disabled={importing || readyDesigns.length === 0} className="kh-btn-primary">
            {importing ? (lang === 'ar' ? 'عم يستورد…' : 'Importing…') : (lang === 'ar' ? `استيراد ${readyDesigns.length}` : `Import ${readyDesigns.length} design${readyDesigns.length === 1 ? '' : 's'}`)}
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
