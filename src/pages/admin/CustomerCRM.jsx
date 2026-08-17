import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function CustomerCRM() {
  const { t, lang } = useI18n();
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, o, p] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.Order.list('-created_date', 200),
          base44.entities.CustomProject.list('-created_date', 200),
        ]);
        setUsers(u || []);
        setOrders(o || []);
        setProjects(p || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = users.filter((u) => !q || (u.email||'').toLowerCase().includes(q.toLowerCase()) || (u.full_name||'').toLowerCase().includes(q.toLowerCase()));

  const userOrders = (u) => orders.filter((o) => o.created_by_id === u.id || (u.email && o.email?.toLowerCase() === u.email.toLowerCase()));
  const userProjects = (u) => projects.filter((p) => p.created_by_id === u.id || (u.email && p.email?.toLowerCase() === u.email.toLowerCase()));

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Admin" title={lang === 'ar' ? 'الزبائن' : 'Customers'} />
      <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={lang === 'ar' ? 'بحث بالاسم أو الإيميل' : 'Search name or email'} className="kh-input max-w-sm mt-8" />
      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-3 pr-3">Name</th><th className="py-3 pr-3">Email</th><th className="py-3 pr-3">Role</th><th className="py-3 pr-3">Orders</th><th className="py-3 pr-3">Custom</th>
            </tr></thead>
            <tbody>
              {filtered.map((u) => {
                const uo = userOrders(u);
                const up = userProjects(u);
                const isOpen = open === u.id;
                return (
                  <React.Fragment key={u.id}>
                    <tr className="border-b border-border cursor-pointer hover:bg-muted/40" onClick={() => setOpen(isOpen ? null : u.id)}>
                      <td className="py-3 pr-3">{u.full_name || '—'}</td>
                      <td className="py-3 pr-3">{u.email}</td>
                      <td className="py-3 pr-3"><span className="kh-eyebrow">{u.role}</span></td>
                      <td className="py-3 pr-3">{uo.length}</td>
                      <td className="py-3 pr-3">{up.length}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/30">
                        <td colSpan={5} className="p-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h3 className="font-heading uppercase mb-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>Orders ({uo.length})</h3>
                              <ul className="text-xs space-y-1">
                                {uo.map((o) => <li key={o.id} className="flex justify-between"><span>{o.order_number}</span><span className="text-muted-foreground">${o.total} · {o.status.replace(/_/g,' ')}</span></li>)}
                                {uo.length === 0 && <li className="text-muted-foreground">No orders.</li>}
                              </ul>
                            </div>
                            <div>
                              <h3 className="font-heading uppercase mb-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>Custom requests ({up.length})</h3>
                              <ul className="text-xs space-y-1">
                                {up.map((p) => <li key={p.id} className="flex justify-between"><span>{p.phrase}</span><span className="text-muted-foreground">{p.status.replace(/_/g,' ')}</span></li>)}
                                {up.length === 0 && <li className="text-muted-foreground">No custom requests.</li>}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-muted-foreground">No users.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
