import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const OVERHEAD_CATEGORIES = ['ads', 'courier', 'packaging', 'misc'];

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function AdminFinancials() {
  const { t, lang } = useI18n();
  const [unitCosts, setUnitCosts] = useState(null);
  const [unitForm, setUnitForm] = useState({ blank_tee_cost: 0, print_fee: 0, packaging_cost: 0 });
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ category: 'ads', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) });
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [savingCosts, setSavingCosts] = useState(false);

  const loadAll = async (from, to) => {
    setLoading(true);
    try {
      const [uc, exp, sum] = await Promise.all([
        base44.entities.Financials.getUnitCosts(),
        base44.entities.Financials.listExpenses(from || undefined, to || undefined),
        base44.entities.Financials.getSummary(from || undefined, to || undefined),
      ]);
      setUnitCosts(uc);
      setUnitForm({ blank_tee_cost: uc.blank_tee_cost, print_fee: uc.print_fee, packaging_cost: uc.packaging_cost });
      setExpenses(exp || []);
      setSummary(sum);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const applyRange = () => loadAll(range.from, range.to);

  const saveUnitCosts = async () => {
    setSavingCosts(true);
    try {
      const updated = await base44.entities.Financials.updateUnitCosts({
        blank_tee_cost: Number(unitForm.blank_tee_cost) || 0,
        print_fee: Number(unitForm.print_fee) || 0,
        packaging_cost: Number(unitForm.packaging_cost) || 0,
      });
      setUnitCosts(updated);
      loadAll(range.from, range.to);
    } finally { setSavingCosts(false); }
  };

  const addExpense = async () => {
    if (!expenseForm.amount) return;
    const created = await base44.entities.Financials.addExpense({
      ...expenseForm,
      amount: Number(expenseForm.amount),
    });
    setExpenses((e) => [created, ...e]);
    setExpenseForm({ category: 'ads', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) });
    loadAll(range.from, range.to);
  };

  const deleteExpense = async (id) => {
    await base44.entities.Financials.deleteExpense(id);
    setExpenses((e) => e.filter((x) => x.id !== id));
    loadAll(range.from, range.to);
  };

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Super Admin" title={lang === 'ar' ? 'المالية' : 'Financials'} sub={lang === 'ar' ? 'التكاليف، المصاريف، وصافي الربح — مرئي فقط لل super admin' : 'Unit costs, overhead expenses, and net profit — visible to super admins only.'} />

      <div className="flex flex-wrap items-end gap-3 mt-8">
        <label className="block"><span className="text-xs uppercase text-muted-foreground block mb-1">From</span><input type="date" className="kh-input" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></label>
        <label className="block"><span className="text-xs uppercase text-muted-foreground block mb-1">To</span><input type="date" className="kh-input" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></label>
        <button onClick={applyRange} className="kh-btn-secondary !py-2 !px-4 text-sm">{lang === 'ar' ? 'تطبيق' : 'Apply'}</button>
      </div>

      {loading ? <div className="text-muted-foreground mt-8">{t.common.loading}</div> : (
        <>
          {summary && (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5 mt-8">
              {[
                [lang === 'ar' ? 'الإيرادات' : 'Revenue', money(summary.revenue)],
                [lang === 'ar' ? 'كلفة البضاعة' : 'COGS', money(summary.cogs)],
                [lang === 'ar' ? 'مصاريف عامة' : 'Overhead', money(summary.overhead)],
                [lang === 'ar' ? 'صافي الربح' : 'Net profit', money(summary.net_profit)],
                [lang === 'ar' ? 'هامش الربح' : 'Margin', `${summary.margin_pct}%`],
              ].map(([label, val]) => (
                <div key={label} className="bg-card border border-border rounded-md p-4">
                  <div className="text-xs uppercase text-muted-foreground">{label}</div>
                  <div className="font-heading text-2xl mt-1" style={{ fontFamily: 'var(--brand-font-heading)', color: 'var(--brand-accent)' }}>{val}</div>
                </div>
              ))}
              <div className="bg-card border border-border rounded-md p-4 sm:col-span-3 lg:col-span-5 flex gap-8 text-sm text-muted-foreground">
                <span>{lang === 'ar' ? 'عدد الطلبات' : 'Orders'}: {summary.order_count}</span>
                <span>{lang === 'ar' ? 'الوحدات المباعة' : 'Units sold'}: {summary.units_sold}</span>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2 mt-10">
            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-lg uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'تكلفة الوحدة' : 'Unit cost settings'}</h2>
              <div className="space-y-3">
                <label className="block"><span className="text-xs uppercase text-muted-foreground block mb-1">Blank tee cost ($)</span><input type="number" step="0.01" className="kh-input" value={unitForm.blank_tee_cost} onChange={(e) => setUnitForm((f) => ({ ...f, blank_tee_cost: e.target.value }))} /></label>
                <label className="block"><span className="text-xs uppercase text-muted-foreground block mb-1">Print / iron / pack fee ($)</span><input type="number" step="0.01" className="kh-input" value={unitForm.print_fee} onChange={(e) => setUnitForm((f) => ({ ...f, print_fee: e.target.value }))} /></label>
                <label className="block"><span className="text-xs uppercase text-muted-foreground block mb-1">Packaging cost ($)</span><input type="number" step="0.01" className="kh-input" value={unitForm.packaging_cost} onChange={(e) => setUnitForm((f) => ({ ...f, packaging_cost: e.target.value }))} /></label>
                <div className="text-sm text-muted-foreground">Total per unit: <span style={{ color: 'var(--brand-accent)' }}>{money((Number(unitForm.blank_tee_cost) || 0) + (Number(unitForm.print_fee) || 0) + (Number(unitForm.packaging_cost) || 0))}</span></div>
                <button onClick={saveUnitCosts} disabled={savingCosts} className="kh-btn-primary">{savingCosts ? 'Saving…' : 'Save'}</button>
              </div>
            </section>

            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-lg uppercase mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'إضافة مصروف' : 'Log an overhead expense'}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="kh-input" value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}>
                  {OVERHEAD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="date" className="kh-input" value={expenseForm.expense_date} onChange={(e) => setExpenseForm((f) => ({ ...f, expense_date: e.target.value }))} />
                <input type="number" step="0.01" placeholder="Amount ($)" className="kh-input" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
                <input placeholder="Description (optional)" className="kh-input" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <button onClick={addExpense} className="kh-btn-primary mt-3">{lang === 'ar' ? 'إضافة' : 'Add expense'}</button>
            </section>
          </div>

          <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'سجل المصاريف' : 'Expense log'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-3">Date</th><th className="py-3 pr-3">Category</th><th className="py-3 pr-3">Description</th><th className="py-3 pr-3">Amount</th><th className="py-3 pr-3"></th>
              </tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border">
                    <td className="py-3 pr-3">{e.expense_date}</td>
                    <td className="py-3 pr-3">{e.category}</td>
                    <td className="py-3 pr-3">{e.description || '—'}</td>
                    <td className="py-3 pr-3">{money(e.amount)}</td>
                    <td className="py-3 pr-3 text-right"><button onClick={() => deleteExpense(e.id)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'حذف' : 'Delete'}</button></td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={5} className="py-8 text-muted-foreground">No expenses logged in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
