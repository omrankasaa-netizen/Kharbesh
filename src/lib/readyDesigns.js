// Ready designs shown on the homepage — real Kharbesh graphics, not drafts.
// Prices are PLACEHOLDERS — confirm with the Kharbesh team before going live.
// Images live in src/assets/designs and are imported through Vite so the
// bundler rewrites paths correctly for every route and every deploy target.

const files = import.meta.glob('../assets/designs/*.{jpg,jpeg,png}', { eager: true, import: 'default' });

function img(name) {
  const key = Object.keys(files).find((k) => k.endsWith('/' + name));
  return files[key];
}

export const READY_DESIGNS = [
  {
    id: 'financially-unstable',
    img: img('financially-unstable.jpg'),
    title_en: "I'm Fine(ancially Unstable)",
    title_ar: 'تمام... بس مالياً منهار',
    world_en: 'Kharbesh Jomal',
    world_ar: 'خربش جمل',
    code: 'KH-001',
    price: 24,
  },
  {
    id: 'jeyeh-3a-beli',
    img: img('jeyeh-3a-beli.jpg'),
    title_en: 'Jeyeh 3a Beli',
    title_ar: 'جاي عبالي',
    world_en: 'Kharbesh Rahbaniyyat',
    world_ar: 'خربش رحبانيّات',
    code: 'KH-002',
    price: 26,
  },
  {
    id: 'masari-be-amen',
    img: img('masari-be-amen.jpg'),
    title_en: "Money's Safe (Just Not With Us)",
    title_ar: 'المصاري بأمان بس مش معنا',
    world_en: 'Kharbesh Siyeseh',
    world_ar: 'خربش سياسة',
    code: 'KH-003',
    price: 24,
  },
  {
    id: 'greatest-weapon',
    img: img('greatest-weapon.jpg'),
    title_en: 'Your Greatest Weapon',
    title_ar: 'أقوى سلاحك عقلك',
    world_en: 'Kharbesh Jomal',
    world_ar: 'خربش جمل',
    code: 'KH-004',
    price: 24,
  },
  {
    id: 'bala-hob-bala-batikh',
    img: img('bala-hob-bala-batikh.jpg'),
    title_en: 'No Love, No Watermelon',
    title_ar: 'بلا حب بلا بطّيخ',
    world_en: 'Kharbesh Jomal',
    world_ar: 'خربش جمل',
    code: 'KH-005',
    price: 24,
  },
  {
    id: 'ceo-of-everything',
    img: img('ceo-of-everything.jpg'),
    title_en: 'CEO of Everything',
    title_ar: 'رئيس مجلس إدارة كل شي',
    world_en: 'Kharbesh Jomal',
    world_ar: 'خربش جمل',
    code: 'KH-006',
    price: 24,
  },
];
