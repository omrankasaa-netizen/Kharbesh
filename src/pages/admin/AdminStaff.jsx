import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const ROLES = ['staff', 'admin', 'super_admin'];

export default function AdminStaff() {
  const { t, lang } = useI18n();
  const { user: me } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', role: 'staff' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setStaff((await base44.entities.Staff.list()) || []); }
    catch { setStaff([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!form.email.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await base44.entities.Staff.upsert(form);
      setStaff((s) => {
        const exists = s.some((x) => x.email === updated.email);
        return exists ? s.map((x) => (x.email === updated.email ? updated : x)) : [...s, updated];
      });
      setForm({ email: '', name: '', role: 'staff' });
    } catch (err) {
      setError(err?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const changeRole = async (row, role) => {
    if (row.email === me?.email) return;
    try {
      const updated = await base44.entities.Staff.upsert({ email: row.email, name: row.name, role });
      setStaff((s) => s.map((x) => (x.email === row.email ? updated : x)));
    } catch (err) {
      window.alert(err?.message || 'Could not update role.');
    }
  };

  const remove = async (row) => {
    if (row.email === me?.email) return;
    if (!window.confirm(lang === 'ar' ? `إزالة صلاحيات ${row.email}؟` : `Remove admin access for ${row.email}?`)) return;
    try {
      await base44.entities.Staff.remove(row.email);
      setStaff((s) => s.filter((x) => x.email !== row.email));
    } catch (err) {
      window.alert(err?.message || 'Could not remove staff member.');
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Super Admin" title={lang === 'ar' ? 'إدارة الفريق' : 'Staff Management'} sub={lang === 'ar' ? 'أعطِ صلاحيات الدخول للوحة التحكم عبر إيميل Google' : 'Grant admin-panel access by Google email. Roles apply immediately, or on next login for new accounts.'} />

      <div className="bg-card border border-border rounded-md p-5 mt-8 max-w-2xl">
        <h2 className="font-heading text-lg uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'إضافة عضو' : 'Add staff member'}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="kh-input sm:col-span-2" placeholder="name@gmail.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <select className="kh-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <input className="kh-input sm:col-span-3" placeholder={lang === 'ar' ? 'الاسم (اختياري)' : 'Name (optional)'} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        {error && <p className="text-sm mt-3" style={{ color: 'var(--brand-destructive)' }}>{error}</p>}
        <button onClick={invite} disabled={saving} className="kh-btn-primary mt-4">{saving ? 'Saving…' : (lang === 'ar' ? 'إضافة' : 'Add / update')}</button>
      </div>

      <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'الفريق الحالي' : 'Current staff'}</h2>
      {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-3 pr-3">Email</th><th className="py-3 pr-3">Name</th><th className="py-3 pr-3">Role</th><th className="py-3 pr-3"></th>
            </tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.email} className="border-b border-border">
                  <td className="py-3 pr-3">{s.email}{s.email === me?.email && <span className="text-muted-foreground text-xs ml-2">({lang === 'ar' ? 'حسابك' : 'you'})</span>}</td>
                  <td className="py-3 pr-3">{s.name || '—'}</td>
                  <td className="py-3 pr-3">
                    <select value={s.role} disabled={s.email === me?.email} onChange={(e) => changeRole(s, e.target.value)} className="kh-input !h-9 !py-1 max-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed">
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {s.email === me?.email ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button onClick={() => remove(s)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'إزالة' : 'Remove'}</button>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan={4} className="py-8 text-muted-foreground">No staff added yet — you're admitted via the bootstrap owner list.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
