import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { base44 } from '@/api/khClient';
import { useColors } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const PRODUCT_TYPES = ['tee', 'hoodie', 'accessory'];
const STATUSES = ['draft', 'active'];
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];
const DEFAULT_PRICE_BY_TYPE = { tee: 35, hoodie: 35, accessory: 35 };

const CONNECT_ERROR_COPY = {
  access_denied: { en: 'Drive connection was cancelled.', ar: 'تم إلغاء ربط Drive.' },
  not_authorized: { en: "Your account isn't allowed to connect Drive.", ar: 'حسابك غير مخوّل لربط Drive.' },
  no_refresh_token: {
    en: 'Google skipped the consent screen, so no offline access was granted. Remove Kharbesh from your Google account permissions and try again.',
    ar: 'غوغل تخطّى شاشة الموافقة، فما انعطت صلاحية دائمة. شيل Kharbesh من صلاحيات حسابك بغوغل وجرب مرة تانية.',
  },
  server_error: { en: 'Something went wrong connecting Drive. Try again.', ar: 'صار خطأ بربط Drive. جرب مرة تانية.' },
};

function getDriveConnectUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/admin/drive/callback`;
  const state = btoa(JSON.stringify({ redirectUri }));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
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

function ImageThumb({ image, muted, lang }) {
  if (!image) {
    return (
      <div
        className="w-14 h-14 rounded border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0"
        style={{ opacity: muted ? 0.5 : 1 }}
      >
        {lang === 'ar' ? 'فاضي' : 'empty'}
      </div>
    );
  }
  return image.thumbnailDataUrl ? (
    <img
      src={image.thumbnailDataUrl}
      alt={image.name}
      className="w-14 h-14 rounded object-cover border border-border shrink-0"
      style={{ opacity: muted ? 0.5 : 1 }}
    />
  ) : (
    <div className="w-14 h-14 rounded border border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
      {lang === 'ar' ? 'خطأ' : 'err'}
    </div>
  );
}

/** One design card: a color slot per approved garment color, each filled
 * from the auto-detected match (editable via dropdown) or manually
 * assigned from the folder's leftover images. */
function DesignCard({ design, colors, onUpdate, lang }) {
  const photoCount = colors.filter((c) => design.colorFiles[c.name_en]).length;
  const allImagesById = new Map();
  Object.values(design.colorMatches || {}).forEach((img) => allImagesById.set(img.fileId, img));
  (design.extraImages || []).forEach((img) => allImagesById.set(img.fileId, img));

  const set = (patch) => onUpdate(design.folderId, patch);

  const setColorFile = (colorName, fileId) => {
    const next = { ...design.colorFiles };
    if (fileId) next[colorName] = fileId;
    else delete next[colorName];
    set({ colorFiles: next });
  };

  const assignedFileIds = new Set(Object.values(design.colorFiles).filter(Boolean));

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
            const fileId = design.colorFiles[c.name_en];
            const image = fileId ? allImagesById.get(fileId) : null;
            const match = design.colorMatches?.[c.name_en];
            return (
              <div key={c.id} className="border border-border rounded-md p-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ background: c.hex || '#ccc' }} aria-hidden />
                <ImageThumb image={image} lang={lang} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{c.name_en}</div>
                  <select
                    className="kh-input !text-[11px] !py-1 mt-1 w-full"
                    value={fileId || ''}
                    onChange={(e) => setColorFile(c.name_en, e.target.value || null)}
                  >
                    <option value="">{lang === 'ar' ? '— بلا صورة —' : '— no photo —'}</option>
                    {Array.from(allImagesById.values()).map((img) => (
                      <option key={img.fileId} value={img.fileId} disabled={img.fileId !== fileId && assignedFileIds.has(img.fileId)}>
                        {img.name}
                        {match && match.fileId === img.fileId ? (lang === 'ar' ? ' (تلقائي)' : ' (auto)') : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(design.extraImages || []).length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-2">
          {lang === 'ar'
            ? `${design.extraImages.length} صورة زايدة بالمجلد ما انتخبت تلقائياً — فوتها فوق أو خليها.`
            : `${design.extraImages.length} extra file${design.extraImages.length === 1 ? '' : 's'} in this folder weren't auto-matched — assign them above if needed, or leave them out.`}
        </p>
      )}

      {design.error && <p className="text-xs mt-2" style={{ color: 'var(--brand-destructive)' }}>{design.error}</p>}
      {design._error && <p className="text-xs mt-2" style={{ color: 'var(--brand-destructive)' }}>{design._error}</p>}
      {design._result === 'success' && (
        <p className="text-xs mt-2" style={{ color: 'var(--brand-accent)' }}>{lang === 'ar' ? 'تم الإنشاء ✓' : 'Created ✓'}</p>
      )}
    </div>
  );
}

export default function AdminDriveImport() {
  const { lang } = useI18n();
  const colors = useColors();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [folderLink, setFolderLink] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  const connectError = params.get('driveError');
  const justConnected = params.get('driveConnected') === '1';

  useEffect(() => {
    base44.driveImport
      .status()
      .then(setStatus)
      .catch((err) => setStatusError(err?.message || 'Could not check Drive connection.'));
  }, [justConnected]);

  const updateDesign = (folderId, patch) => {
    setDesigns((ds) => ds.map((d) => (d.folderId === folderId ? { ...d, ...patch, _result: undefined, _error: undefined } : d)));
  };

  const scan = async () => {
    if (!folderLink.trim()) return;
    setScanning(true);
    setScanError(null);
    setSummary(null);
    try {
      const { designs: scanned } = await base44.driveImport.scan(folderLink.trim());
      const mapped = scanned.map((d) => {
        const colorFiles = {};
        Object.entries(d.colorMatches || {}).forEach(([colorName, img]) => {
          colorFiles[colorName] = img.fileId;
        });
        return {
          ...d,
          nameEn: d.folderName,
          nameAr: '',
          productType: 'tee',
          price: DEFAULT_PRICE_BY_TYPE.tee,
          sizes: [...SIZE_OPTIONS],
          status: 'draft',
          colorFiles,
        };
      });
      setDesigns(mapped);
    } catch (err) {
      setScanError(err?.message || (lang === 'ar' ? 'فشل فحص المجلد.' : 'Could not scan that folder.'));
    } finally {
      setScanning(false);
    }
  };

  const readyDesigns = designs.filter((d) => d.nameEn.trim() && Object.keys(d.colorFiles).length > 0);

  const importAll = async () => {
    if (readyDesigns.length === 0) return;
    setImporting(true);
    setSummary(null);
    try {
      const items = readyDesigns.map((d) => ({
        folderId: d.folderId,
        nameEn: d.nameEn.trim(),
        nameAr: d.nameAr.trim() || null,
        productType: d.productType,
        price: Number(d.price) || 0,
        sizes: d.sizes,
        status: d.status,
        colorFiles: d.colorFiles,
      }));
      const results = await base44.driveImport.commit(items);
      const resultByFolder = new Map(readyDesigns.map((d, i) => [d.folderId, results[i]]));
      setDesigns((ds) =>
        ds.map((d) => {
          const res = resultByFolder.get(d.folderId);
          if (!res) return d;
          return { ...d, _result: res.success ? 'success' : 'error', _error: res.error };
        }),
      );
      const succeeded = results.filter((r) => r.success).length;
      setSummary({ succeeded, failed: results.length - succeeded, total: results.length });
      if (succeeded > 0) {
        setTimeout(() => {
          setDesigns((ds) => ds.filter((d) => d._result !== 'success'));
        }, 2500);
      }
    } catch (err) {
      setSummary({ error: err?.message || (lang === 'ar' ? 'فشل الاستيراد.' : 'Import failed.') });
    } finally {
      setImporting(false);
    }
  };

  const disconnect = async () => {
    try {
      await base44.driveImport.disconnect();
      setStatus({ connected: false });
      setDesigns([]);
    } catch (err) {
      setStatusError(err?.message || 'Could not disconnect Drive.');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'استيراد من Drive' : 'Import from Drive'} />
      <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
        {lang === 'ar'
          ? 'لكل تصميم مجلد فيه 4 صور (أسود، أبيض، غري، رمادي حديدي). لصق رابط المجلد الأم (اللي فيه كل المجلدات الفرعية)، وحنا نحاول نعرف لون كل صورة تلقائياً — وبعدين راجع/صحح قبل الاستيراد.'
          : "Each design lives in its own subfolder with the 4 color mockup photos (Black, White, Grey, Dark Charcoal). Paste the link to the parent folder (the one containing all those subfolders) and we'll guess each photo's color automatically \u2014 review and fix anything wrong before importing."}
      </p>

      {statusError && <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>{statusError}</p>}
      {connectError && (
        <p className="text-sm mt-4" style={{ color: 'var(--brand-destructive)' }}>
          {(CONNECT_ERROR_COPY[connectError] || CONNECT_ERROR_COPY.server_error)[lang === 'ar' ? 'ar' : 'en']}
        </p>
      )}

      {!status ? (
        <p className="text-sm text-muted-foreground mt-6">{lang === 'ar' ? 'عم يفحص الاتصال…' : 'Checking connection…'}</p>
      ) : !status.connected ? (
        <div className="border border-dashed border-border rounded-md p-8 mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {lang === 'ar' ? 'لازم تربط Google Drive أول مرة بس.' : 'Connect Google Drive once to use this tool.'}
          </p>
          <a href={getDriveConnectUrl()} className="kh-btn-primary inline-block">
            {lang === 'ar' ? 'ربط Google Drive' : 'Connect Google Drive'}
          </a>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <span className="text-xs text-muted-foreground">
              {lang === 'ar' ? 'متصل' : 'Connected'}{status.connectedEmail ? ` (${status.connectedEmail})` : ''}
            </span>
            <button onClick={disconnect} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>
              {lang === 'ar' ? 'فصل' : 'Disconnect'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <input
              className="kh-input flex-1 min-w-[280px]"
              placeholder={lang === 'ar' ? 'رابط مجلد Drive (مثال: T-web-ready)' : 'Drive folder link (e.g. your T-web-ready folder)'}
              value={folderLink}
              onChange={(e) => setFolderLink(e.target.value)}
            />
            <button onClick={scan} disabled={scanning || !folderLink.trim()} className="kh-btn-primary">
              {scanning ? (lang === 'ar' ? 'عم يفحص…' : 'Scanning…') : (lang === 'ar' ? 'فحص' : 'Scan folder')}
            </button>
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
                <DesignCard key={d.folderId} design={d} colors={colors} onUpdate={updateDesign} lang={lang} />
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
              {summary?.error && <span className="text-sm" style={{ color: 'var(--brand-destructive)' }}>{summary.error}</span>}
              {summary && !summary.error && (
                <span className="text-sm" style={{ color: summary.failed ? 'var(--brand-destructive)' : 'var(--brand-accent)' }}>
                  {lang === 'ar' ? `${summary.succeeded} نجح، ${summary.failed} فشل` : `${summary.succeeded} succeeded, ${summary.failed} failed`}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
