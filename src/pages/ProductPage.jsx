import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { useProducts, useColors, useGarmentStyles, resolveColor } from '@/lib/useCatalog.jsx';
import { useCart } from '@/lib/cart';
import { FIT_OPTIONS, DEFAULT_FIT, productHasFits } from '@/lib/fitSizes';
import { toggleWishlist, isSaved } from '@/lib/wishlist';
import { toast } from '@/components/ui/use-toast';
import { base44 } from '@/api/khClient';
import GarmentMockup, { contrastInk } from '@/components/GarmentMockup';
import { IconHeart, IconShare, IconCotton, IconNoSweat, IconNoWrinkle, IconFit, IconCash, IconTruck, LebanonSeal } from '@/components/Brand';
import { STANDARD_FRONT_BY_COLOR } from '@/lib/standardPhotos';
import { useSiteSettings } from '@/lib/useCatalog.jsx';
import { whatsappLink } from '@/lib/whatsapp';
import { trackViewContent, trackAddToWishlist } from '@/lib/metaPixel';
import { IconWhatsApp } from '@/components/Brand';

export default function ProductPage() {
  const { id } = useParams();
  const { lang, t } = useI18n();
  const { products, loading } = useProducts();
  const colors = useColors();
  const { addItem } = useCart();
  const allStyles = useGarmentStyles();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();

  const product = products.find((p) => p.id === id);

  const [colorName, setColorName] = useState('');
  const [size, setSize] = useState('');
  const [fit, setFit] = useState(DEFAULT_FIT);
  const [styleName, setStyleName] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [colorImages, setColorImages] = useState({});
  const [saved, setSaved] = useState(false);

  // Sync the wishlist heart once the product resolves (products load async).
  useEffect(() => {
    if (product) setSaved(isSaved(product.id));
  }, [product?.id]);

  // Meta ViewContent once the product resolves (deduped browser + CAPI twin).
  useEffect(() => {
    if (product) trackViewContent(product);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    base44.entities.ProductColorImages.list(product.id)
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        for (const r of rows || []) map[r.color_name] = r.images || [];
        setColorImages(map);
      })
      .catch(() => {
        if (!cancelled) setColorImages({});
      });
    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const approvedColors = useMemo(
    () => (product ? (product.approved_colors || []).map((n) => resolveColor(n, colors)).filter(Boolean) : []),
    [product, colors]
  );

  // A hoodie picked on a tee product: show the generic hoodie shot for the
  // chosen color+fit (the design was never photographed on hoodies). The
  // photos module is dynamically imported so its ~300KB only downloads when
  // a hoodie is actually picked; the GarmentMockup SVG renders meanwhile and
  // stays as fallback for colors/fits without a shot.
  // (Hook lives with the other hooks, above the early returns below.)
  const [hoodiePhoto, setHoodiePhoto] = useState(null);
  const selectedColorName = colorName || approvedColors[0]?.name_en;
  useEffect(() => {
    // styleName is only non-empty when a cross-garment hoodie option was
    // picked (the base option's key is ''), and only tee products mock up.
    const needsHoodieShot = Boolean(styleName) && product?.product_type === 'tee';
    if (!needsHoodieShot) { setHoodiePhoto(null); return; }
    let cancelled = false;
    import('@/lib/hoodiePhotos')
      .then((m) => { if (!cancelled) setHoodiePhoto(m.genericHoodiePhoto(selectedColorName, fit)); })
      .catch(() => { if (!cancelled) setHoodiePhoto(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleName, product?.product_type, selectedColorName, fit]);

  const selectedColor = approvedColors.find((c) => c.name_en === colorName) || approvedColors[0];
  const hex = selectedColor?.hex || '#F0E9D6';
  const ink = contrastInk(hex);
  // `is_sold_out` is a server-computed boolean — the public catalog no
  // longer exposes raw units_sold/preorder_capacity (audit M4).
  // Feature flag (Site Settings): when preorders are paused, preorder pieces
  // are filtered out of the catalog — this blocks direct links to them.
  const preorderPaused = settings?.preordersEnabled === false && product?.preorder_type !== 'always_on';
  const canAdd = colorName && size && !product?.is_sold_out && !preorderPaused;
  const activeColorPhotos = colorImages[selectedColor?.name_en] || null;
  // One photo per color — front and back are shot combined into a single
  // image. Prefer the real per-color photo, else fall back to the standard
  // placeholder shot for the selected color, else the product's cover photo.
  const standardPhoto = selectedColor ? STANDARD_FRONT_BY_COLOR[selectedColor.name_en] : null;
  const activePhoto = activeColorPhotos?.[0] || standardPhoto || product?.images?.[0] || null;

  if (loading) return <div className="max-w-[1400px] mx-auto px-6 py-20 text-muted-foreground">{t.common.loading}</div>;
  if (!product) return <div className="max-w-[1400px] mx-auto px-6 py-20"><p>{t.product.notFound}</p><Link to="/shop" className="kh-btn-text mt-4">{t.nav.shop}</Link></div>;

  const name = lang === 'ar' ? (product.name_ar || product.name_en) : product.name_en;
  const desc = lang === 'ar' ? (product.description_ar || product.description_en) : product.description_en;
  const isPreorder = product.preorder_type !== 'always_on';
  const hasFits = productHasFits(product);
  const chosenFit = hasFits ? fit : DEFAULT_FIT;
  // Garment choice — the same design can be bought on the product's own
  // garment (tee/hoodie) or on any hoodie style that carries a fixed price
  // (Autumn / Fleeced Winter / …). The displayed price switches with the
  // selection; the server re-validates and re-prices authoritatively at
  // checkout. Hoodie styles WITHOUT a fixed price are never offered here
  // (fail-safe against undercharging the tee price for a hoodie).
  const isApparel = product.product_type === 'tee' || product.product_type === 'hoodie';
  const hoodieStyles = isApparel ? allStyles.filter((s) => /hoodie|هودي/i.test(s.name_en)) : [];
  const baseLabel = product.product_type === 'hoodie'
    ? (product.garment_style || t.product.garmentHoodie)
    : t.product.garmentTee;
  const garmentOptions = !isApparel ? [] : [
    { key: '', label: baseLabel, styleName: undefined, price: product.price, isHoodie: product.product_type === 'hoodie' },
    ...hoodieStyles
      .filter((s) => s.fixed_price != null && s.name_en !== product.garment_style)
      .map((s) => ({
        key: s.name_en,
        label: lang === 'ar' ? (s.name_ar || s.name_en) : s.name_en,
        styleName: s.name_en,
        price: s.fixed_price,
        isHoodie: true,
      })),
  ];
  const chosenGarment = garmentOptions.find((g) => g.key === styleName) || garmentOptions[0] || null;
  const activePrice = chosenGarment?.price ?? product.price;
  // A hoodie picked on a tee product: show the hoodie mockup instead of the
  // tee photos so the customer sees what they're actually buying.
  const showMockupForGarment = Boolean(chosenGarment?.isHoodie && product.product_type === 'tee');
  const galleryPhoto = showMockupForGarment ? hoodiePhoto : activePhoto;
  // Fit explainer names the garment — tees and hoodies both carry the
  // two-cut choice but the copy shouldn't say "tee" on a hoodie page.
  const fitNote = product.product_type === 'hoodie' ? t.product.fitNoteHoodie : t.product.fitNote;
  // Garment noun for the WhatsApp order message (Arabic only — the EN
  // message is generic). Defaults to the generic "piece" for accessories.
  const garmentNounAr = chosenGarment?.isHoodie ? 'هالهودي' : ({ tee: 'هالتيشيرت' }[product.product_type] || 'هالقطعة');

  const handleAdd = () => {
    if (!canAdd) return;
    addItem({
      productId: product.id,
      productName: name,
      phrase: product.phrase_ar,
      productType: product.product_type,
      image: product.images?.[0],
      color: colorName,
      size,
      fit: chosenFit,
      style: chosenGarment?.styleName,
      quantity: qty,
      unitPrice: activePrice,
    });
    setAdded(true);
    setTimeout(() => navigate('/cart'), 500);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // User dismissed the native sheet or it failed — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (sandboxed preview) — still surface the same toast.
    }
    toast({ title: t.product.shareCopied });
  };

  const handleSave = () => {
    const next = toggleWishlist(product.id);
    const nowSaved = next.includes(product.id);
    setSaved(nowSaved);
    if (nowSaved) trackAddToWishlist(product);
    toast({ title: nowSaved ? t.product.saved : t.product.removedFromWishlist });
  };

  // Raw capacity/units-sold numbers are no longer public (audit M4) — the
  // label carries the same meaning without exposing stock internals.
  const preorderLabel = {
    open_until: `${t.product.closes} ${product.preorder_close_date}`,
    quantity_target: t.product.batchTarget,
    limited_quantity: product.is_sold_out ? t.product.soldOut : t.product.limitedRun,
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
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-card border border-border rounded-md aspect-[4/5] flex items-center justify-center overflow-hidden">
            {galleryPhoto ? (
              <img
                src={galleryPhoto}
                alt={`${name} — ${selectedColor?.name_en}`}
                className="w-full h-full object-cover"
                loading="eager"
                fetchpriority="high"
                decoding="async"
              />
            ) : (
              <GarmentMockup
                type={showMockupForGarment ? 'hoodie' : product.product_type}
                color={hex}
                textColor={ink}
                phrase={product.phrase_ar}
                className="w-[75%] h-[75%]"
              />
            )}
          </div>
        </div>

        {/* Purchase panel */}
        <div className="min-w-0">
          <span className="kh-eyebrow">{product.collection_name}</span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>{name}</h1>
          {product.phrase_ar && (
            <p className="mt-3 text-2xl sm:text-3xl" style={{ fontFamily: "'Rakkas', 'IBM Plex Sans Arabic', sans-serif", color: 'var(--ink)' }}>
              {product.phrase_ar}
            </p>
          )}
          <div className="flex items-baseline gap-3 mt-4">
            <span className="font-heading text-2xl" style={{ fontFamily: 'var(--brand-font-heading)' }}>${activePrice}</span>
            {product.compare_at_price && chosenGarment?.key === '' && <span className="text-muted-foreground line-through">${product.compare_at_price}</span>}
          </div>
          <p className="mt-4 text-muted-foreground">{desc}</p>

          {/* Spec chips — edition-card facts */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[selectedColor && (lang === 'ar' ? selectedColor.name_ar : selectedColor.name_en), chosenGarment?.label || product.garment_style, product.fit_en].filter(Boolean).map((chip) => (
              <span key={chip} className="kh-mono text-[10px] uppercase tracking-[0.14em] px-3 py-[6px]" style={{ border: '1px solid var(--line-strong)', borderRadius: 2, color: 'var(--ink)' }}>
                {chip}
              </span>
            ))}
          </div>

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

          {/* Garment — Tee / Autumn Hoodie / Fleeced Winter Hoodie / … with
              per-garment prices. Only shown when there's a real choice. */}
          {garmentOptions.length > 1 && (
            <fieldset className="mt-6" disabled={!colorName}>
              <legend className="kh-eyebrow mb-3">{t.product.chooseGarment}</legend>
              <div className="flex flex-wrap gap-2">
                {garmentOptions.map((g) => (
                  <button
                    key={g.key || 'base'}
                    onClick={() => setStyleName(g.key)}
                    aria-pressed={chosenGarment?.key === g.key}
                    className={`kh-btn-outline kh-btn-filter !text-[13px] !py-2 !px-4 ${chosenGarment?.key === g.key ? '!bg-primary !text-primary-foreground' : ''}`}
                  >
                    {g.label} · ${g.price}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Fit — tees and hoodies come in two cuts, same price, same sizes */}
          {hasFits && (
            <fieldset className="mt-6" disabled={!colorName}>
              <legend className="kh-eyebrow mb-3">{t.product.chooseFit}</legend>
              <div className="flex flex-wrap gap-2">
                {FIT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFit(f.id)}
                    aria-pressed={fit === f.id}
                    className={`kh-btn-outline kh-btn-filter !text-[13px] !py-2 !px-4 ${fit === f.id ? '!bg-primary !text-primary-foreground' : ''}`}
                  >
                    {lang === 'ar' ? f.ar : f.en}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{fitNote}</p>
            </fieldset>
          )}

          {/* Size */}
          <fieldset className="mt-6" disabled={!colorName}>
            <legend className="kh-eyebrow mb-3">{t.product.chooseSize}</legend>
            <div className="flex flex-wrap gap-2">
              {(product.sizes || []).map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`min-w-[3rem] kh-btn-outline kh-btn-filter !text-[13px] !py-2 !px-3 ${size === s ? '!bg-primary !text-primary-foreground' : ''}`}>{s}</button>
              ))}
            </div>
            <Link to="/sizing-guide" className="kh-btn-text !text-[12px] mt-3 inline-flex">{t.product.sizeGuide} →</Link>
          </fieldset>

          {/* Qty + add */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="shrink-0 flex items-center border border-border rounded-sm">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-12 text-lg" aria-label="Decrease">−</button>
                <span className="w-12 text-center font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="w-11 h-12 text-lg" aria-label="Increase">+</button>
              </div>
              <button onClick={handleAdd} disabled={!canAdd} className="kh-btn-scribble flex-1 !justify-center">
                {added ? t.product.addedToBag : t.product.addToBag}
              </button>
            </div>
            <div className="shrink-0 flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
              <button
                onClick={handleSave}
                className="kh-btn-icon"
                aria-label="Save"
                aria-pressed={saved}
                style={saved ? { color: 'hsl(var(--accent))' } : undefined}
              >
                <IconHeart size={20} filled={saved} />
              </button>
              <button onClick={handleShare} className="kh-btn-icon" aria-label="Share"><IconShare size={20} /></button>
            </div>
          </div>
          {preorderPaused && (
            <p className="text-xs text-muted-foreground mt-3">
              {lang === 'ar'
                ? 'الطلبات المسبقة واقفة هالفترة — راسلنا واتساب ومنخبرك أول ما نرجع.'
                : "Preorders are paused right now — message us on WhatsApp and we'll tell you when we're back."}
            </p>
          )}
          {!canAdd && !preorderPaused && <p className="text-xs text-muted-foreground mt-3">{t.product.preorderNote}</p>}

          <a
            href={whatsappLink(
              settings?.contact?.whatsappNumber,
              (lang === 'ar'
                ? `هاي، بدي ${garmentNounAr}: ${name}${chosenGarment?.styleName ? ` (${chosenGarment.label})` : ''}${selectedColor ? ` — ${selectedColor.name_en}` : ''}${hasFits && chosenFit === 'oversize' ? ' (أوفرسايز)' : ''}${size ? `, size ${size}` : ''} (x${qty}) — $${activePrice * qty}`
                : `Hi! I'd like to order: ${name}${chosenGarment?.styleName ? ` (${chosenGarment.label})` : ''}${selectedColor ? ` — ${selectedColor.name_en}` : ''}${hasFits && chosenFit === 'oversize' ? ' (oversize fit)' : ''}${size ? `, size ${size}` : ''} (x${qty}) — $${activePrice * qty}`),
            )}
            target="_blank"
            rel="noreferrer"
            className="kh-btn-outline mt-3 !justify-center flex w-full items-center gap-2"
          >
            <IconWhatsApp size={18} />
            {t.product.orderWhatsapp}
          </a>

          {/* Feature highlights */}
          <div className="mt-8 border-t border-border pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { Icon: IconCotton, label: t.product.featSoftCotton },
              { Icon: IconNoSweat, label: t.product.featAntiSweat },
              { Icon: IconNoWrinkle, label: t.product.featNoWrinkle },
              { Icon: IconFit, label: t.product.featClassicFit, note: t.product.featClassicFitNote },
              { Icon: IconCash, label: t.product.featCod },
              { Icon: IconTruck, label: `${t.product.featDeliveryLebanon} · ${t.product.featDeliveryTime}`, note: `${t.product.featShipping} · ${t.product.featShippingNote}` },
            ].map(({ Icon, label, note }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5" style={{ color: 'hsl(var(--accent))' }}><Icon size={20} /></span>
                <div>
                  <p className="text-sm leading-tight" style={{ color: 'var(--ink)' }}>{label}</p>
                  {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Product specs */}
          <div className="mt-8 border-t border-border pt-6 grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
            <div>
              <span className="kh-eyebrow block mb-1">{t.product.print}</span>
              <span>{product.placement}</span>
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
            <LebanonSeal size={30} />
            <span className="font-heading tracking-wide" style={{ fontFamily: 'var(--brand-font-heading)' }}>100% Lebanese made</span>
          </div>
        </div>
      </div>
    </div>
  );
}
