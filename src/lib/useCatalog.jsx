import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/khClient';

const CatalogContext = createContext({ colors: [], styles: [], collections: [], settings: null, settingsLoading: true, refreshStyles: async () => {}, refreshColors: async () => {}, refreshCollections: async () => {}, refreshSettings: async () => {} });

export const CatalogProvider = ({ children }) => {
  const [colors, setColors] = useState([]);
  const [styles, setStyles] = useState([]);
  const [collections, setCollections] = useState([]);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const refreshSettings = async () => {
    try { setSettings(await base44.entities.Settings.get()); }
    catch { /* keep previous settings on failure — storefront falls back to safe defaults below */ }
    finally { setSettingsLoading(false); }
  };

  const refreshColors = async () => {
    try { setColors((await base44.entities.GarmentColor.list('sort_order', 50)) || []); }
    catch { /* keep previous list on failure */ }
  };
  const refreshStyles = async () => {
    try { setStyles((await base44.entities.GarmentStyle.list('sort_order', 50)) || []); }
    catch { /* keep previous list on failure */ }
  };
  const refreshCollections = async () => {
    try { setCollections((await base44.entities.Collection.list('sort_order', 50)) || []); }
    catch { /* keep previous list on failure */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const [c, s, col] = await Promise.all([
          base44.entities.GarmentColor.list('sort_order', 50),
          base44.entities.GarmentStyle.list('sort_order', 50),
          base44.entities.Collection.list('sort_order', 50),
        ]);
        setColors(c || []);
        setStyles(s || []);
        setCollections(col || []);
      } catch {
        setColors([]); setStyles([]); setCollections([]);
      }
    })();
    refreshSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <CatalogContext.Provider value={{ colors, styles, collections, settings, settingsLoading, refreshColors, refreshStyles, refreshCollections, refreshSettings }}>{children}</CatalogContext.Provider>;
};

export const useColors = () => useContext(CatalogContext).colors;
export const useGarmentStyles = () => useContext(CatalogContext).styles;
export const useCatalogRefresh = () => {
  const { refreshColors, refreshStyles, refreshCollections } = useContext(CatalogContext);
  return { refreshColors, refreshStyles, refreshCollections };
};

/** Store config (banner, feature toggles, payment methods). `settings` is
 * `null` until the first fetch resolves — callers should treat that as
 * "unknown yet", not "disabled", to avoid a loading flash that hides
 * checkout options that are actually enabled. */
export const useSiteSettings = () => {
  const { settings, settingsLoading, refreshSettings } = useContext(CatalogContext);
  return { settings, loading: settingsLoading, refreshSettings };
};

export const resolveColor = (name, colors) => colors.find((c) => c.name_en === name);

export function useProducts({ collectionSlug, search, dropOnly, productType } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { collections } = useContext(CatalogContext);
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
          // Resolve the slug against the live collections list (works for any
          // collection created in Site Settings); the hardcoded map only
          // survives as a fallback for legacy slugs. Before this, a slug not
          // in the map resolved to `undefined` and filtered out EVERYTHING —
          // products assigned to new collections never showed up.
          const legacyMap = { politics: 'Kharbesh Politics', quotes: 'Kharbesh Quotes', rahbaniet: 'Kharbesh Rahbaniet' };
          const resolvedName =
            collections.find((c) => c.slug === collectionSlug)?.name_en ||
            legacyMap[collectionSlug];
          if (resolvedName) {
            list = list.filter((p) => (p.collection_name || '') === resolvedName);
          } else {
            // Unknown collection — nothing can match.
            list = [];
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionSlug, search, dropOnly, productType, collections]);
  return { products, loading };
}

/** Collections live in the shared catalog context so a collection created
 *  in Site Settings (CollectionManager) shows up immediately in the
 *  Products page quick-assign dropdown — no reload needed. */
export function useCollections() {
  const { collections } = useContext(CatalogContext);
  return { collections, loading: false };
}
