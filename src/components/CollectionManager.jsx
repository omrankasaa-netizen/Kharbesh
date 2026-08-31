import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/khClient';
import { useCatalogRefresh } from '@/lib/useCatalog.jsx';

const EMPTY = { name_en: '', name_ar: '', slug: '', description_en: '', description_ar: '', accent: '#000000', cover_image: '' };

/** Slug preview — must stay in sync with slugifyCollection() in
 *  api/queries/catalog.ts (the server re-derives it authoritatively). */
const slugify = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Master list of collections — drives the storefront Collections page, the
 * /collections/:slug pages, and the quick-assign dropdown on the admin
 * Products page. Renaming a collection retags its products automatically;
 * deleting is blocked while products still carry the name (server-enforced,
 * see api/queries/catalog.ts#deleteCollection).
 */
export default function CollectionManager({ lang }) {
  const { refreshCollections } = useCatalogRefresh();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setCollections((await base44.entities.Collection.list('sort_order', 50)) || []); }
    catch { setCollections([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name_en: c.name_en,
      name_ar: c.name_ar || '',
      slug: c.slug || '',
      description_en: c.description_en || '',
      description_ar: c.description_ar || '',
      accent: c.accent || '#000000',
      cover_image: c.cover_image || '',
    });
    setError('');
  };
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name_en.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      name_en: form.name_en.trim(),
      name_ar: form.name_ar.trim() || null,
      slug: form.slug.trim() || undefined,
      description_en: form.description_en.trim() || null,
      description_ar: form.description_ar.trim() || null,
      accent: form.accent || null,
      cover_image: form.cover_image.trim() || null,
    };
    try {
      if (editingId) {
        await base44.entities.Collection.update(editingId, payload);
      } else {
        await base44.entities.Collection.create(payload);
      }
      cancelEdit();
      await load();
      // Push the fresh list into the shared context so the Products page
      // quick-assign dropdown sees the new/renamed collection right away.
      await refreshCollections();
    } catch (err) {
      setError(err?.message || 'Could not save collection.');
    } finally { setSaving(false); }
  };

  const remove = async (c) => {
    const confirmMsg = lang === 'ar' ? `حذف ${c.name_en}؟` : `Delete ${c.name_en}?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await base44.entities.Collection.remove(c.id);
      await load();
      await refreshCollections();
    } catch (err) {
      window.alert(err?.message || 'Could not delete this collection.');
    }
  };

  const slugPreview = slugify(form.slug || form.name_en);

  return (
    <section className="bg-card border border-border rounded-md p-6 mt-8">
      <h2 className="font-heading text-xl uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>
        {lang === 'ar' ? 'المجموعات' : 'Collections'}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        {lang === 'ar'
          ? 'هون بتدير المجموعات (Kharbesh Home، Gym، Rahbaniet…). بتطلع بصفحة المجموعات عالموقع وبقائمة الإسناد السريعة بصفحة المنتجات. إعادة التسمية بتحدّث المنتجات التابعة إلها أوتوماتيك.'
          : 'Manage your collections here (Kharbesh Home, Gym, Rahbaniet…). They appear on the storefront Collections page and in the quick-assign dropdown on the Products page. Renaming a collection retags its products automatically.'}
      </p>

      <form onSubmit={submit} className="space-y-3 mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} *</span>
            <input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className="kh-input" placeholder="Kharbesh Home" />
          </label>
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'الاسم (AR)' : 'Name (AR)'}</span>
            <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className="kh-input" dir="rtl" placeholder="خربش هوم" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'الرابط (slug)' : 'Slug (URL)'}</span>
            <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="kh-input" placeholder={slugPreview || 'kharbesh-home'} />
            <span className="block text-xs text-muted-foreground mt-1">
              {lang === 'ar' ? 'بيظهر بالرابط:' : 'Shows in the URL:'} /collections/{slugPreview || '…'}
            </span>
          </label>
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'اللون' : 'Accent'}</span>
            <input value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} className="kh-input" type="color" style={{ padding: 2, height: 40 }} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'الوصف (EN)' : 'Description (EN)'}</span>
            <textarea rows={2} value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} className="kh-input" />
          </label>
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'الوصف (AR)' : 'Description (AR)'}</span>
            <textarea rows={2} value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} className="kh-input" dir="rtl" />
          </label>
        </div>
        <label className="block">
          <span className="kh-eyebrow block mb-1">{lang === 'ar' ? 'صورة الغلاف (رابط)' : 'Cover image (URL)'}</span>
          <input value={form.cover_image} onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))} className="kh-input" placeholder="https://…" />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="kh-btn-primary">
            {saving ? '…' : editingId ? (lang === 'ar' ? 'حفظ' : 'Save') : (lang === 'ar' ? 'إضافة' : 'Add')}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} className="kh-btn-text">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>}
        </div>
      </form>
      {error && <p className="text-sm mb-4" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">…</p>
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="w-6 h-6 rounded-full border border-border shrink-0" style={{ background: c.accent || 'transparent' }} />
              <span className="flex-1">{c.name_en}{c.name_ar ? ` · ${c.name_ar}` : ''}</span>
              <span className="text-xs text-muted-foreground">/collections/{c.slug}</span>
              <button onClick={() => startEdit(c)} className="kh-btn-text text-xs">{lang === 'ar' ? 'تعديل' : 'Edit'}</button>
              <button onClick={() => remove(c)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'حذف' : 'Delete'}</button>
            </div>
          ))}
          {collections.length === 0 && <p className="text-muted-foreground py-4">{lang === 'ar' ? 'ما في مجموعات بعد.' : 'No collections yet.'}</p>}
        </div>
      )}
    </section>
  );
}
