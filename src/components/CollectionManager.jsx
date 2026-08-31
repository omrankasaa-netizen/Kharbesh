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
    const confirmMsg = lang === 'ar' ? `\u062d\u0630\u0641 ${c.name_en}\u061f` : `Delete ${c.name_en}?`;
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
        {lang === 'ar' ? '\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a' : 'Collections'}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        {lang === 'ar'
          ? '\u0647\u0648\u0646 \u0628\u062a\u062f\u064a\u0631 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a (Kharbesh Home\u060c Gym\u060c Rahbaniet\u2026). \u0628\u062a\u0637\u0644\u0639 \u0628\u0635\u0641\u062d\u0629 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0639\u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0628\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0625\u0633\u0646\u0627\u062f \u0627\u0644\u0633\u0631\u064a\u0639\u0629 \u0628\u0635\u0641\u062d\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a. \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0633\u0645\u064a\u0629 \u0628\u062a\u062d\u062f\u0651\u062b \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u062a\u0627\u0628\u0639\u0629 \u0625\u0644\u0647\u0627 \u0623\u0648\u062a\u0648\u0645\u0627\u062a\u064a\u0643.'
          : 'Manage your collections here (Kharbesh Home, Gym, Rahbaniet\u2026). They appear on the storefront Collections page and in the quick-assign dropdown on the Products page. Renaming a collection retags its products automatically.'}
      </p>

      <form onSubmit={submit} className="space-y-3 mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 (EN)' : 'Name (EN)'} *</span>
            <input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className="kh-input" placeholder="Kharbesh Home" />
          </label>
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 (AR)' : 'Name (AR)'}</span>
            <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className="kh-input" dir="rtl" placeholder="\u062e\u0631\u0628\u0634 \u0647\u0648\u0645" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? '\u0627\u0644\u0631\u0627\u0628\u0637 (slug)' : 'Slug (URL)'}</span>
            <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="kh-input" placeholder={slugPreview || 'kharbesh-home'} />
            <span className="block text-xs text-muted-foreground mt-1">
              {lang === 'ar' ? '\u0628\u064a\u0638\u0647\u0631 \u0628\u0627\u0644\u0631\u0627\u0628\u0637:' : 'Shows in the URL:'} /collections/{slugPreview || '\u2026'}
            </span>
          </label>
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? '\u0627\u0644\u0644\u0648\u0646' : 'Accent'}</span>
            <input value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} className="kh-input" type="color" style={{ padding: 2, height: 40 }} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? '\u0627\u0644\u0648\u0635\u0641 (EN)' : 'Description (EN)'}</span>
            <textarea rows={2} value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} className="kh-input" />
          </label>
          <label className="block">
            <span className="kh-eyebrow block mb-1">{lang === 'ar' ? '\u0627\u0644\u0648\u0635\u0641 (AR)' : 'Description (AR)'}</span>
            <textarea rows={2} value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} className="kh-input" dir="rtl" />
          </label>
        </div>
        <label className="block">
          <span className="kh-eyebrow block mb-1">{lang === 'ar' ? '\u0635\u0648\u0631\u0629 \u0627\u0644\u063a\u0644\u0627\u0641 (\u0631\u0627\u0628\u0637)' : 'Cover image (URL)'}</span>
          <input value={form.cover_image} onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))} className="kh-input" placeholder="https://\u2026" />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="kh-btn-primary">
            {saving ? '\u2026' : editingId ? (lang === 'ar' ? '\u062d\u0641\u0638' : 'Save') : (lang === 'ar' ? '\u0625\u0636\u0627\u0641\u0629' : 'Add')}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} className="kh-btn-text">{lang === 'ar' ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}</button>}
        </div>
      </form>
      {error && <p className="text-sm mb-4" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">\u2026</p>
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="w-6 h-6 rounded-full border border-border shrink-0" style={{ background: c.accent || 'transparent' }} />
              <span className="flex-1">{c.name_en}{c.name_ar ? ` \u00b7 ${c.name_ar}` : ''}</span>
              <span className="text-xs text-muted-foreground">/collections/{c.slug}</span>
              <button onClick={() => startEdit(c)} className="kh-btn-text text-xs">{lang === 'ar' ? '\u062a\u0639\u062f\u064a\u0644' : 'Edit'}</button>
              <button onClick={() => remove(c)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? '\u062d\u0630\u0641' : 'Delete'}</button>
            </div>
          ))}
          {collections.length === 0 && <p className="text-muted-foreground py-4">{lang === 'ar' ? '\u0645\u0627 \u0641\u064a \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0628\u0639\u062f.' : 'No collections yet.'}</p>}
        </div>
      )}
    </section>
  );
}
