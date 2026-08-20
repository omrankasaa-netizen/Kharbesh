import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { base44 } from '@/api/khClient';
import { useCollections } from '@/lib/useCatalog.jsx';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function Archive() {
  const { t, lang } = useI18n();
  const { collections } = useCollections();
  const [soldOut, setSoldOut] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Product.list('-sort_order', 100);
        setSoldOut((list || []).filter((p) => p.status === 'archived' || (p.preorder_capacity && (p.units_sold||0) >= p.preorder_capacity)));
      } catch { setSoldOut([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Archive" title={lang === 'ar' ? 'الأرشيف' : 'Kharbesh archive'} sub={lang === 'ar' ? 'تصاميم مضت وخلصت.' : 'Past drops, gone for good.'} />
      <h2 className="font-heading text-xl uppercase mt-10 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'مجموعات مضت' : 'Past collections'}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Link to={`/collections/${c.slug}`} key={c.id} className="kh-card-collection">
            <span className="kh-eyebrow">ARCHIVE</span>
            <h3 className="kh-h">{lang === 'ar' ? c.name_ar : c.name_en}</h3>
            <p className="kh-p">{lang === 'ar' ? c.description_ar : c.description_en}</p>
            <span className="kh-link">{lang === 'ar' ? 'تصفح' : 'View'} →</span>
          </Link>
        ))}
      </div>
      <h2 className="font-heading text-xl uppercase mt-12 mb-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'تصاميم خلصت' : 'Sold out'}</h2>
      {loading ? <div className="text-muted-foreground">{t.common.loading}</div> : soldOut.length === 0 ? <p className="text-muted-foreground">Nothing sold out yet.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {soldOut.map((p) => (
            <div key={p.id} className="kh-d-card opacity-70">
              <div className="kh-d-media">
                <span className="kh-d-tag" style={{ background: 'var(--brand-brick)', color: '#fff' }}>SOLD OUT</span>
                {(p.images?.[1] ?? p.images?.[0]) ? <img src={p.images[1] ?? p.images[0]} alt={p.name_en} /> : <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">{p.name_en}</div>}
              </div>
              <div className="kh-d-body"><span className="kh-d-title">{p.name_en}</span><span className="kh-d-cta">${p.price}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
