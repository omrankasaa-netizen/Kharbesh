import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/khClient';

const CatalogContext = createContext({ colors: [], styles: [], refreshStyles: async () => {}, refreshColors: async () => {} });

export const CatalogProvider = ({ children }) => {
  const [colors, setColors] = useState([]);
  const [styles, setStyles] = useState([]);

  const refreshColors = async () => {
    try { setColors((await base44.entities.GarmentColor.list('sort_order', 50)) || []); }
    catch { /* keep previous list on failure */ }
  };
  const refreshStyles = async () => {
    try { setStyles((await base44.entities.GarmentStyle.list('sort_order', 50)) || []); }
    catch { /* keep previous list on failure */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([
          base44.entities.GarmentColor.list('sort_order', 50),
          base44.entities.GarmentStyle.list('sort_order', 50),
        ]);
        setColors(c || []);
        setStyles(s || []);
      } catch {
        setColors([]); setStyles([]);
      }
    })();
  }, []);
  return <CatalogContext.Provider value={{ colors, styles, refreshColors, refreshStyles }}>{children}</CatalogContext.Provider>;
};

export const useColors = () => useContext(CatalogContext).colors;
export const useGarmentStyles = () => useContext(CatalogContext).styles;
export const useCatalogRefresh = () => {
  const { refreshColors, refreshStyles } = useContext(CatalogContext);
  return { refreshColors, refreshStyles };
};

export const resolveColor = (name, colors) => colors.find((c) => c.name_en === name);

export function useProducts({ collectionSlug, search, dropOnly, productType } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const all = await base44.entities.Product.list('-sort_order', 100);
        if (!active) return;
        let list = (all || []).filter((p) => p.status === 'active');
        if (dropOnly) list = list.filter((p) => p.preorder_type !== 'always_on' && p.drop_name && p.drop_name !== 'Always-on');
        if (productType) list = list.filter((p) => p.product_type === productType);
        if (collectionSlug) {
          const nameMap = { politics: 'Kharbesh Politics', quotes: 'Kharbesh Quotes', rahbaniet: 'Kharbesh Rahbaniet' };
          list = list.filter((p) => (p.collection_name || '') === nameMap[collectionSlug]);
        }
        if (search) {
          const s = search.toLowerCase();
          list = list.filter((p) =>
            (p.name_en || '').toLowerCase().includes(s) ||
            (p.name_ar || '').toLowerCase().includes(s) ||
            (p.phrase_ar || '').toLowerCase().includes(s) ||
            (p.phrase_en || '').toLowerCase().includes(s) ||
            (p.collection_name || '').toLowerCase().includes(s)
          );
        }
        setProducts(list);
      } catch { if (active) setProducts([]); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [collectionSlug, search, dropOnly, productType]);
  return { products, loading };
}

export function useCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.Collection.list('sort_order', 50);
        if (active) setCollections(list || []);
      } catch { if (active) setCollections([]); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  return { collections, loading };
}
