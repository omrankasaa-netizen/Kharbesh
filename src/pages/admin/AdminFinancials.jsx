import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/khClient';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/use-toast';

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
  const [margins, setMargins] = useState([]);
  const [costDrafts, setCostDrafts] = useState({});
  const [savingCostId, setSavingCostId] = useState(null);
  const [garmentCosts, setGarmentCosts] = useState([]);
  const [garmentDrafts, setGarmentDrafts] = useState({}); // { [product_type]: { cost, label } }
  const [savingGarmentType, setSavingGarmentType] = useState(null);
  const [newGarment, setNewGarment] = useState({ product_type: '', label: '', cost: '' });
  const [codByCourier, setCodByCourier] = useState([]);
  const [shares, setShares] = useState([]); // draft rows: { name, percent } (percent as string while typing)
  const [savedShares, setSavedShares] = useState([]);
  const [savingShares, setSavingShares] = useState(false);
  const [payable, setPayable] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), note: '' });
  const [savingPayment, setSavingPayment] = useState(false);

  const loadAll = async (from, to) => {
    setLoading(true);
    try {
      const [uc, exp, sum, marg, gc, cod, ps, pay, fp] = await Promise.all([
        base44.entities.Financials.getUnitCosts(),
        base44.entities.Financials.listExpenses(from || undefined, to || undefined),
        base44.entities.Financials.getSummary(from || undefined, to || undefined),
        base44.entities.Financials.listMargins(),
        base44.entities.Financials.getGarmentCosts(),
        base44.entities.Financials.codOutstandingByCourier(from || undefined, to || undefined),
        base44.entities.Financials.getProfitShares(),
        base44.entities.Financials.getFactoryPayable(),
        base44.entities.Financials.listFactoryPayments(from || undefined, to || undefined),
      ]);
      setUnitCosts(uc);
      setUnitForm({ blank_tee_cost: uc.blank_tee_cost, print_fee: uc.print_fee, packaging_cost: uc.packaging_cost });
      setExpenses(exp || []);
      setSummary(sum);
      setMargins(marg || []);
      setGarmentCosts(gc || []);
      setCodByCourier(cod || []);
      setSavedShares(ps?.shares || []);
      setShares((ps?.shares || []).map((s) => ({ name: s.name, percent: String(s.percent) })));
      setPayable(pay || null);
      setPayments(fp || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const saveCost = async (productId) => {
    const draft = costDrafts[productId];
    const cost_price = draft === '' || draft == null ? null : Number(draft);
    setSavingCostId(productId);
    try {
      await base44.entities.Financials.updateProductCost(productId, cost_price);
      const marg = await base44.entities.Financials.listMargins();
      setMargins(marg || []);
      setCostDrafts((d) => { const next = { ...d }; delete next[productId]; return next; });
    } finally { setSavingCostId(null); }
  };

  const saveGarmentCost = async (productType) => {
    const draft = garmentDrafts[productType];
    if (!draft) return;
    const cost = Number(draft.cost);
    if (Number.isNaN(cost) || cost < 0) return;
    setSavingGarmentType(productType);
    try {
      const updated = await base44.entities.Financials.updateGarmentCost({ product_type: productType, cost, label: draft.label?.trim() || undefined });
      setGarmentCosts(updated || []);
      setGarmentDrafts((d) => { const next = { ...d }; delete next[productType]; return next; });
      toast({ title: lang === 'ar' ? 'انحفظت الكلفة ✓' : 'Garment cost saved ✓' });
      loadAll(range.from, range.to);
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحفظ' : 'Could not save'), variant: 'destructive' });
    } finally { setSavingGarmentType(null); }
  };

  const addGarmentType = async () => {
    const product_type = newGarment.product_type.trim().toLowerCase();
    const cost = Number(newGarment.cost);
    if (!product_type || Number.isNaN(cost) || cost < 0) return;
    setSavingGarmentType('__new__');
    try {
      const updated = await base44.entities.Financials.updateGarmentCost({ product_type, cost, label: newGarment.label.trim() || undefined });
      setGarmentCosts(updated || []);
      setNewGarment({ product_type: '', label: '', cost: '' });
      toast({ title: lang === 'ar' ? 'انضاف نوع جديد ✓' : 'Garment type added ✓' });
      loadAll(range.from, range.to);
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نضيف' : 'Could not add garment type'), variant: 'destructive' });
    } finally { setSavingGarmentType(null); }
  };

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

  // ── Partner profit split ─────────────────────────────────────────────────
  const shareRowsValid = (rows) =>
    rows.length >= 1 && rows.length <= 4 &&
    rows.every((r) => r.name.trim().length >= 1 && r.name.length <= 60 && r.percent !== '' && Number(r.percent) >= 0 && Number(r.percent) <= 100);
  const sharesTotal = shares.reduce((sum, r) => sum + (Number(r.percent) || 0), 0);
  const sharesCanSave = shareRowsValid(shares) && Math.abs(sharesTotal - 100) < 0.005;

  const saveShares = async () => {
    if (!sharesCanSave) return;
    setSavingShares(true);
    try {
      const updated = await base44.entities.Financials.updateProfitShares(
        shares.map((r) => ({ name: r.name.trim(), percent: Number(r.percent) })),
      );
      setSavedShares(updated?.shares || []);
      setShares((updated?.shares || []).map((s) => ({ name: s.name, percent: String(s.percent) })));
      toast({ title: lang === 'ar' ? 'انحفظ التقسيم ✓' : 'Split saved ✓' });
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحفظ التقسيم' : 'Could not save the split'), variant: 'destructive' });
    } finally { setSavingShares(false); }
  };

  // ── Factory payments ─────────────────────────────────────────────────────
  const addPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    setSavingPayment(true);
    try {
      await base44.entities.Financials.addFactoryPayment({ ...paymentForm, amount: Number(paymentForm.amount), note: paymentForm.note.trim() || undefined });
      setPaymentForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), note: '' });
      toast({ title: lang === 'ar' ? 'انحفظ الدفع ✓' : 'Payment logged ✓' });
      loadAll(range.from, range.to);
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحفظ الدفعة' : 'Could not log the payment'), variant: 'destructive' });
    } finally { setSavingPayment(false); }
  };

  const deletePayment = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'متأكد تحذف هالدفعة؟' : 'Delete this payment?')) return;
    try {
      await base44.entities.Financials.deleteFactoryPayment(id);
      setPayments((p) => p.filter((x) => x.id !== id));
      loadAll(range.from, range.to);
    } catch (err) {
      toast({ title: err?.message || (lang === 'ar' ? 'ما قدرنا نحذف' : 'Could not delete'), variant: 'destructive' });
    }
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
              <h2 className="font-heading text-lg uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'كلفة القطع السادة' : 'Blank garment costs'}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {lang === 'ar'
                  ? 'شو بندفع للمصنع عالقطعة السادة، حسب نوعها. النوع يلي مالو كلفة بينحسب بسعر التيشيرت.'
                  : 'What the factory charges per blank, per garment type. Types without a cost row are priced as tees in COGS.'}
              </p>
              <div className="space-y-3">
                {garmentCosts.map((g) => {
                  const draft = garmentDrafts[g.product_type];
                  const costValue = draft?.cost ?? g.cost;
                  const labelValue = draft?.label ?? (g.label ?? '');
                  return (
                    <div key={g.product_type} className="flex flex-wrap items-end gap-2">
                      <div className="text-xs uppercase text-muted-foreground min-w-[90px]">
                        {g.product_type}
                        <div className="normal-case text-[11px] opacity-70">{g.label || '—'}</div>
                      </div>
                      <input
                        type="text" placeholder={lang === 'ar' ? 'الاسم' : 'Label'} className="kh-input !h-9 !py-1 max-w-[120px]"
                        value={labelValue}
                        onChange={(e) => setGarmentDrafts((d) => ({ ...d, [g.product_type]: { cost: String(d[g.product_type]?.cost ?? g.cost), label: e.target.value } }))}
                      />
                      <input
                        type="number" step="0.01" className="kh-input !h-9 !py-1 max-w-[100px]"
                        value={costValue}
                        onChange={(e) => setGarmentDrafts((d) => ({ ...d, [g.product_type]: { cost: e.target.value, label: d[g.product_type]?.label ?? (g.label ?? '') } }))}
                      />
                      <button
                        onClick={() => saveGarmentCost(g.product_type)}
                        disabled={!draft || savingGarmentType === g.product_type}
                        className="kh-btn-text text-xs disabled:opacity-50"
                      >
                        {savingGarmentType === g.product_type ? 'Saving…' : (lang === 'ar' ? 'حفظ' : 'Save')}
                      </button>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-border">
                  <div className="text-xs uppercase text-muted-foreground mb-2">{lang === 'ar' ? 'إضافة نوع قطعة' : 'Add garment type'}</div>
                  <div className="flex flex-wrap items-end gap-2">
                    <input
                      type="text" placeholder="slug (e.g. tank)" className="kh-input !h-9 !py-1 max-w-[130px]"
                      value={newGarment.product_type}
                      onChange={(e) => setNewGarment((v) => ({ ...v, product_type: e.target.value }))}
                    />
                    <input
                      type="text" placeholder={lang === 'ar' ? 'الاسم' : 'Label'} className="kh-input !h-9 !py-1 max-w-[120px]"
                      value={newGarment.label}
                      onChange={(e) => setNewGarment((v) => ({ ...v, label: e.target.value }))}
                    />
                    <input
                      type="number" step="0.01" placeholder="Cost ($)" className="kh-input !h-9 !py-1 max-w-[100px]"
                      value={newGarment.cost}
                      onChange={(e) => setNewGarment((v) => ({ ...v, cost: e.target.value }))}
                    />
                    <button onClick={addGarmentType} disabled={savingGarmentType === '__new__'} className="kh-btn-secondary !py-2 !px-4 text-sm">
                      {savingGarmentType === '__new__' ? 'Saving…' : (lang === 'ar' ? 'إضافة' : 'Add')}
                    </button>
                  </div>
                </div>
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

            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-lg uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'تحصيل الكاش' : 'Cash collection'}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {lang === 'ar'
                  ? 'التوصيل عند الاستلام (COD): الكاش بيبقى مع شركة التوصيل لحد ما تسلّمنا ياه — "وصلت" ما تعني "قبضنا".'
                  : 'Cash on delivery: the courier holds the cash until they settle with us — "delivered" does not mean "paid".'}
              </p>
              {summary && (
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  {[
                    [lang === 'ar' ? 'منقبض' : 'Collected', money(summary.cod_collected), 'var(--brand-accent)'],
                    [lang === 'ar' ? 'لسا ما انقبض' : 'Outstanding', money(summary.cod_outstanding), 'var(--brand-destructive)'],
                    [lang === 'ar' ? 'مدفوع أونلاين (Whish)' : 'Paid online (Whish)', money(summary.online_revenue), undefined],
                  ].map(([label, val, color]) => (
                    <div key={label} className="border border-border rounded-md p-3">
                      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
                      <div className="font-heading text-xl mt-0.5" style={{ fontFamily: 'var(--brand-font-heading)', color: color || 'inherit' }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
              {summary && summary.cod_outstanding > 0 && (
                <div className="text-xs text-muted-foreground mb-4">
                  {lang === 'ar' ? 'منها عند شركة التوصيل' : 'Of which already with a courier'}: <span className="text-foreground">{money(summary.cod_outstanding_with_courier)}</span>
                </div>
              )}
              <div className="text-xs uppercase text-muted-foreground mb-2">{lang === 'ar' ? 'اللي لسا ما انقبض، حسب الشركة' : 'Outstanding by courier'}</div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">{lang === 'ar' ? 'الشركة' : 'Courier'}</th>
                  <th className="py-2 pr-3">{lang === 'ar' ? 'طلبات' : 'Orders'}</th>
                  <th className="py-2 pr-3">{lang === 'ar' ? 'المبلغ' : 'Total'}</th>
                </tr></thead>
                <tbody>
                  {codByCourier.map((c) => (
                    <tr key={c.courier_name} className="border-b border-border">
                      <td className="py-2 pr-3">{c.courier_name}</td>
                      <td className="py-2 pr-3">{c.order_count}</td>
                      <td className="py-2 pr-3">{money(c.total)}</td>
                    </tr>
                  ))}
                  {codByCourier.length === 0 && <tr><td colSpan={3} className="py-6 text-muted-foreground">{lang === 'ar' ? 'ما في مبالغ مع شركات التوصيل.' : 'Nothing outstanding with couriers.'}</td></tr>}
                </tbody>
              </table>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-lg uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'تقسيم الأرباح' : 'Partner split'}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {lang === 'ar' ? 'حصص الشركاء من صافي الربح — لازم يكون المجموع ١٠٠٪.' : 'Partner shares of net profit — the percents must total exactly 100%.'}
              </p>
              <div className="space-y-2">
                {shares.map((row, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <input
                      type="text" placeholder={lang === 'ar' ? 'اسم الشريك' : 'Partner name'} className="kh-input !h-9 !py-1 flex-1"
                      value={row.name}
                      onChange={(e) => setShares((rows) => rows.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                    />
                    <input
                      type="number" step="0.01" min="0" max="100" placeholder="%" className="kh-input !h-9 !py-1 max-w-[90px]"
                      value={row.percent}
                      onChange={(e) => setShares((rows) => rows.map((r, i) => i === idx ? { ...r, percent: e.target.value } : r))}
                    />
                    <button
                      type="button"
                      onClick={() => setShares((rows) => rows.filter((_, i) => i !== idx))}
                      className="kh-btn-text text-xs"
                      style={{ color: 'var(--brand-destructive)' }}
                      title={lang === 'ar' ? 'شيل الشريك' : 'Remove partner'}
                    >✕</button>
                  </div>
                ))}
                {shares.length === 0 && <div className="text-sm text-muted-foreground">{lang === 'ar' ? 'لسا ما في شركاء — ضيف تحت.' : 'No partners yet — add one below.'}</div>}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => shares.length < 4 && setShares((rows) => [...rows, { name: '', percent: '' }])}
                    disabled={shares.length >= 4}
                    className="kh-btn-text text-xs disabled:opacity-50"
                  >
                    {lang === 'ar' ? '+ إضافة شريك' : '+ Add partner'}
                  </button>
                  <span className="text-sm" style={{ color: Math.abs(sharesTotal - 100) < 0.005 ? 'var(--brand-accent)' : 'var(--brand-destructive)' }}>
                    {lang === 'ar' ? 'المجموع' : 'Total'}: {Math.round(sharesTotal * 100) / 100}%
                  </span>
                </div>
                <button onClick={saveShares} disabled={!sharesCanSave || savingShares} className="kh-btn-primary disabled:opacity-50">
                  {savingShares ? 'Saving…' : (lang === 'ar' ? 'حفظ التقسيم' : 'Save split')}
                </button>
              </div>
              {savedShares.length > 0 && summary && (
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="text-xs uppercase text-muted-foreground mb-2">
                    {lang === 'ar' ? 'توزيع صافي الربح للفترة المحددة' : 'Split of this range\u2019s net profit'} ({money(summary.net_profit)})
                  </div>
                  <div className="space-y-1 text-sm">
                    {savedShares.map((s) => (
                      <div key={s.name} className="flex justify-between">
                        <span>{s.name} <span className="text-muted-foreground text-xs">({s.percent}%)</span></span>
                        <span>{money((summary.net_profit * s.percent) / 100)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="bg-card border border-border rounded-md p-5">
              <h2 className="font-heading text-lg uppercase mb-1" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'المصنع' : 'Factory'}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {lang === 'ar'
                  ? 'شو لازمنا للمصنع: قيمة السادة المستهلكة + أجور الطباعة، ناقص اللي دفعناه.'
                  : 'What we owe the factory: consumed blanks + fulfilled print fees, minus payments made.'}
              </p>
              {payable && (
                <div className="space-y-1.5 text-sm mb-5">
                  <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? 'قيمة السادة المستهلكة' : 'Consumed blanks'}</span><span>{money(payable.blanks_value)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? 'أجور الطباعة (طلبات منفذة)' : 'Print fees (fulfilled jobs)'}</span><span>{money(payable.print_fees_value)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? 'المدفوع للمصنع' : 'Paid to factory'}</span><span>-{money(payable.payments_total)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-border font-medium">
                    <span>{lang === 'ar' ? 'الباقي للمصنع' : 'Payable'}</span>
                    <span className="font-heading text-lg" style={{ fontFamily: 'var(--brand-font-heading)', color: payable.payable > 0 ? 'var(--brand-destructive)' : 'var(--brand-accent)' }}>{money(payable.payable)}</span>
                  </div>
                </div>
              )}
              <div className="text-xs uppercase text-muted-foreground mb-2">{lang === 'ar' ? 'دفعة جديدة' : 'Log a payment'}</div>
              <div className="grid gap-3 sm:grid-cols-3 mb-5">
                <input type="number" step="0.01" min="0" placeholder="Amount ($)" className="kh-input" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} />
                <input type="date" className="kh-input" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))} />
                <input placeholder={lang === 'ar' ? 'ملاحظة (اختياري)' : 'Note (optional)'} className="kh-input" value={paymentForm.note} onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
              <button onClick={addPayment} disabled={savingPayment || !paymentForm.amount} className="kh-btn-primary disabled:opacity-50 mb-5">
                {savingPayment ? 'Saving…' : (lang === 'ar' ? 'إضافة دفعة' : 'Add payment')}
              </button>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2 pr-3">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="py-2 pr-3">{lang === 'ar' ? 'ملاحظة' : 'Note'}</th>
                  <th className="py-2 pr-3"></th>
                </tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="py-2 pr-3">{p.payment_date}</td>
                      <td className="py-2 pr-3">{money(p.amount)}</td>
                      <td className="py-2 pr-3">{p.note || '—'}</td>
                      <td className="py-2 pr-3 text-right"><button onClick={() => deletePayment(p.id)} className="kh-btn-text text-xs" style={{ color: 'var(--brand-destructive)' }}>{lang === 'ar' ? 'حذف' : 'Delete'}</button></td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={4} className="py-6 text-muted-foreground">{lang === 'ar' ? 'ما في دفعات بهالفترة.' : 'No payments in this range.'}</td></tr>}
                </tbody>
              </table>
            </section>
          </div>

          <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'التكلفة والهامش لكل منتج' : 'Product costs & margins'}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {lang === 'ar'
              ? 'الكلفة المقدرة تستعمل تكلفة الوحدة العامة لحد ما بتحدد كلفة خاصة بالمنتج — مرئي لل super admin فقط.'
              : 'Estimated costs use the flat unit-cost setting until a specific cost is set here — visible to super admins only.'}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-3">{lang === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'الكلفة (COGS)' : 'Cost (COGS)'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'الهامش' : 'Margin'}</th>
                <th className="py-3 pr-3">%</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'المبيوع' : 'Sold'}</th>
                <th className="py-3 pr-3">{lang === 'ar' ? 'الربح الإجمالي' : 'Total profit'}</th>
                <th className="py-3 pr-3"></th>
              </tr></thead>
              <tbody>
                {margins.map((m) => {
                  const draft = costDrafts[m.id];
                  const value = draft !== undefined ? draft : m.cost;
                  return (
                    <tr key={m.id} className="border-b border-border">
                      <td className="py-3 pr-3">{m.name}<div className="text-xs text-muted-foreground">{m.status}</div></td>
                      <td className="py-3 pr-3">{money(m.price)}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number" step="0.01" className="kh-input !h-9 !py-1 max-w-[100px]"
                            value={value}
                            onChange={(e) => setCostDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                          />
                          {m.cost_is_estimated && draft === undefined && <span className="text-[10px] text-muted-foreground">est.</span>}
                        </div>
                      </td>
                      <td className="py-3 pr-3" style={{ color: m.margin >= 0 ? 'var(--brand-accent)' : 'var(--brand-destructive)' }}>{money(m.margin)}</td>
                      <td className="py-3 pr-3">{m.margin_pct}%</td>
                      <td className="py-3 pr-3">{m.units_sold}</td>
                      <td className="py-3 pr-3">{money(m.total_profit)}</td>
                      <td className="py-3 pr-3 text-right">
                        {draft !== undefined && (
                          <button onClick={() => saveCost(m.id)} disabled={savingCostId === m.id} className="kh-btn-text text-xs">
                            {savingCostId === m.id ? 'Saving…' : (lang === 'ar' ? 'حفظ' : 'Save')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {margins.length === 0 && <tr><td colSpan={8} className="py-8 text-muted-foreground">No products.</td></tr>}
              </tbody>
            </table>
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
