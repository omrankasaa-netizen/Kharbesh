import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts, useColors, resolveColor } from '@/lib/useCatalog.jsx';
import { useCart } from '@/lib/cart';
import GarmentMockup, { contrastInk } from '@/components/GarmentMockup';
import { Scribble, IconHeart, IconShare } from '@/components/Brand';

export default function ProductPage() {
  const { id } = useParams();
  const { lang, t } = useI18n();
  const { products, loading } = useProducts();
  const colors = useColors();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const product = products.find((p) => p.id === id);

  const [view, setView] = useState('front');
  const [colorName, setColorName] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const approvedColors = useMemo(
    () => (product ? (product.approved_colors || []).map((n) => resolveColor(n, colors)).filter(Boolean) : []),
    [product, colors]
  );

  const selectedColor = approvedColors.find((c) => c.name_en === colorName) || approvedColors[0];
  const hex = selectedColor?.hex || '#F0E9D6';
  const ink = contrastInk(hex);
  const canAdd = colorName && size;

  if (loading) return <div className="max-w-[1400px] mx-auto px-6 py-20 text-muted-foreground">{t.common.loading}</div>;
  if (!product) return <div className="max-w-[1400px] mx-auto px-6 py-20"><p>Product not found.</p><Link to="/shop" className="kh-btn-text mt-4">{t.nav.shop}</Link></div>;

  const name = lang === 'ar' ? (product.name_ar || product.name_en) : product.name_en;
  const desc = lang === 'ar' ? (product.description_ar || product.description_en) : product.description_en;
  const isPreorder = product.preorder_type !== 'always_on';

  const handleAdd = () => {
    if (!canAdd) return;
    addItem({
      productId: product.id,
      productName: name,
      phrase: product.phrase_ar,
      productType: product.product_type,
      color: colorName,
      size,
      quantity: qty,
      unitPrice: product.price,
    });
    setAdded(true);
    setTimeout(() => navigate('/cart'), 500);
  };

  const preorderLabel = {
    open_until: `${t.product.closes} ${product.preorder_close_date}`,
    quantity_target: `${t.product.target} ${product.preorder_capacity} · ${product.units_sold || 0} ${t.product.sold}`,
    limited_quantity: `${t.product.limited} ${product.preorder_capacity} · ${product.units_sold || 0} ${t.product.sold}`,
    always_on: t.product.alwaysOn,
  }[product.preorder_type];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-xs text-muted-foreground mb-6 flex gap-2" aria-label="Breadcrumb">
        <Link to="/shop" className="hover:text-foreground">{t.nav.shop}</Link>
        <span>/</span>
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="grid gap-8 lg:gap-16 lg:grid-cols-2">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-card border border-border rounded-md aspect-[4/5] flex items-center justify-center overflow-hidden">
            <GarmentMockup
              type={product.product_type}
              color={hex}
              textColor={ink}
              phrase={view === 'front' ? product.phrase_ar : (product.payoff_en || product.phrase_ar)}
              view={view}
              className="w-[75%] h-[75%]"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setView('front')} className={`kh-btn-outline kh-btn-filter !text-[12px] !py-2 !px-3 ${view === 'front' ? '!bg-primary !text-primary-foreground' : ''}`}>{t.product.front}</button>
            <button onClick={() => setView('back')} className={`kh-btn-outline kh-btn-filter !text-[12px] !py-2 !px-3 ${view === 'back' ? '!bg-primary !text-primary-foreground' : ''}`}>{t.product.back}</button>
          </div>
        </div>

        {/* Purchase panel */}
        <div>
          <span className="kh-eyebrow">{product.collection_name}</span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl uppercase" style={{ fontFamily: 'var(--brand-font-heading)' }}>{name}</h1>
          <div className="flex items-baseline gap-3 mt-4">
            <span className="font-heading text-2xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>${product.price}</span>
            {product.compare_at_price && <span className="text-muted-foreground line-through">${product.compare_at_price}</span>}
          </div>
          <p className="mt-4 text-muted-foreground">{desc}</p>

          <div className="mt-5 inline-flex items-center gap-2 bg-muted px-3 py-2 rounded-sm">
            <span className="kh-eyebrow !text-[10px]">{isPreorder ? t.product.preorder : t.product.ready}</span>
            <span className="text-sm">·</span>
            <span className="text-sm">{preorderLabel}</span>
          </div>

          {/* Color */}
          <fieldset className="mt-8">
            <legend className="kh-eyebrow mb-3">{t.product.chooseColor}</legend>
            <div className="flex flex-wrap gap-3">
              {approvedColors.map((c) => (
                <button key={c.id} onClick={() => setColorName(c.name_en)} aria-label={c.name_en} aria-pressed={colorName === c.name_en}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${colorName === c.name_en ? 'border-foreground scale-110' : 'border-border'}`}
                  style={{ background: c.hex }}>
                  <span className="sr-only">{c.name_en}</span>
                </button>
              ))}
            </div>
            {colorName && <p className="text-sm text-muted-foreground mt-2">{lang === 'ar' ? (resolveColor(colorName, colors)?.name_ar) : colorName}</p>}
          </fieldset>

          {/* Size */}
          <fieldset className="mt-6" disabled={!colorName}>
            <legend className="kh-eyebrow mb-3">{t.product.chooseSize}</legend>
            <div className="flex flex-wrap gap-2">
              {(product.sizes || []).map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`min-w-[3rem] kh-btn-outline kh-btn-filter !text-[13px] !py-2 !px-3 ${size === s ? '!bg-primary !text-primary-foreground' : ''}`}>{s}</button>
              ))}
            </div>
          </fieldset>

          {/* Qty + add */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-border rounded-sm">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-12 text-lg" aria-label="Decrease">−</button>
              <span className="w-12 text-center font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-11 h-12 text-lg" aria-label="Increase">+</button>
            </div>
            <button onClick={handleAdd} disabled={!canAdd} className="kh-btn-scribble flex-1 !justify-center">
              {added ? '✓ Added' : t.product.addToCart}
            </button>
            <button className="kh-btn-icon" aria-label="Save"><IconHeart size={20} /></button>
            <button className="kh-btn-icon" aria-label="Share"><IconShare size={20} /></button>
          </div>
          {!canAdd && <p className="text-xs text-muted-foreground mt-3">{t.product.preorderNote}</p>}

          {/* Product specs */}
          <div className="mt-8 border-t border-border pt-6 grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
            <div>
              <span className="kh-eyebrow block mb-1">{t.product.estDispatch}</span>
              <span>{product.estimated_dispatch_window}</span>
            </div>
            <div>
              <span className="kh-eyebrow block mb-1">{t.product.productionTime}</span>
              <span>{product.estimated_production_days} {lang === 'ar' ? 'يوم' : 'days'}</span>
            </div>
            <div>
              <span className="kh-eyebrow block mb-1">{t.product.print}</span>
              <span>{product.placement}</span>
            </div>
            <div>
              <span className="kh-eyebrow block mb-1">{t.product.fit}</span>
              <span>{product.fit_en || product.garment_style}</span>
            </div>
            {product.measurements_en && (
              <div>
                <span className="kh-eyebrow block mb-1">{t.product.measurements}</span>
                <span>{product.measurements_en}</span>
              </div>
            )}
            <div>
              <span className="kh-eyebrow block mb-1">{t.product.care}</span>
              <span>{lang === 'ar' ? (product.care_ar || product.care_en) : product.care_en}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 text-sm">
            <Scribble width={40} />
            <span className="font-heading uppercase tracking-wide" style={{ fontFamily: 'var(--brand-font-heading)' }}>{t.product.madeIn}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
