/* localStorage wishlist — product ids only, no backend. Sandboxed preview
   iframes block storage, so all access is wrapped in try/catch and falls
   back to a module-scope list. */
const WISHLIST_KEY = 'kh_wishlist_v1';

let memoryWishlist = [];

function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((id) => typeof id === 'string' && id.length > 0))];
}

export function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (raw) memoryWishlist = sanitize(JSON.parse(raw));
  } catch {
    /* storage blocked or malformed JSON — keep session list */
  }
  return memoryWishlist;
}

function saveWishlist(ids) {
  memoryWishlist = sanitize(ids);
  try {
    if (memoryWishlist.length) localStorage.setItem(WISHLIST_KEY, JSON.stringify(memoryWishlist));
    else localStorage.removeItem(WISHLIST_KEY);
  } catch {
    /* storage blocked — module scope still holds it */
  }
  return memoryWishlist;
}

export function isSaved(id) {
  return loadWishlist().includes(id);
}

/** Toggle `id`; returns the new list. */
export function toggleWishlist(id) {
  const list = loadWishlist();
  return saveWishlist(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
}
