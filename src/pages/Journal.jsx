import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

const ARTICLES = [
  {
    id: 1, date: '2026-08-10', tag: 'Drop 01',
    title_en: 'Why we printed "ما إلي خلق" on a tee',
    title_ar: 'ليش طبعنا "ما إلي خلق" على تيشيرت',
    excerpt_en: 'Because half of Beirut says it before noon, and the other half is thinking it.',
    excerpt_ar: 'لأن نص بيروت بيقولها قبل الظهر، والنص التاني بفكر فيها.',
    body_en: 'We didn’t pick "ما إلي خلق" to be edgy. We picked it because it’s the most honest sentence in Lebanese daily life. You say it at work, at the café, in traffic, to your mother. It’s not a mood — it’s a uniform. So we put it on one. The tee isn’t making a statement; it’s just printing what you already mumbled today.',
    body_ar: 'ما اخترنا "ما إلي خلق" لنكون جريئين. اخترناها لأنها أكثر جملة صادقة بالحياة اللبنانية. بتحكيها بالشغل، بالكافيه، بالزحمة، لإمك. مش مزاج — هي زي. فحطيناها على زي. التيشيرت ما عم بيقول شي؛ عم يطبع يلي أصلاً همستوا اليوم.',
  },
  {
    id: 2, date: '2026-08-03', tag: 'Brand',
    title_en: 'The sticker that says "3A ZAW2AK"',
    title_ar: 'الستيكر يلي بيقول "3A ZAW2AK"',
    excerpt_en: 'A small stamp, a big attitude, and a very Lebanese way of saying "to your taste."',
    excerpt_ar: 'ستيكر صغير، موقف كبير، وطريقة لبنانية لقول "على ذوقك."',
    body_en: '"على ذوقك" is the most Lebanese compliment and insult at once. So we made it a stamp — tilted, dashed, brick-red — like it was slapped on a box at a corner shop. It’s not a label. It’s a dare. Wear it, and let people decide which one you meant.',
    body_ar: '"على ذوقك" هي أكثر مدح وإهانة لبنانية بنفس الوقت. فعملناها ستامب — مائل، متقطع، أحمر طوبي — متل ما بتلزقها على صندوق بدكان الحي. مش لاصقة. هي تحدي. البسها، وخلّي الناس تقرر شو قصدت.',
  },
  {
    id: 3, date: '2026-07-21', tag: 'Production',
    title_en: 'Why we print in Lebanon (and not "somewhere cheaper")',
    title_ar: 'ليش بنطبع بلبنان (مو "بحلة أرخص")',
    excerpt_en: 'Because a phrase born here should be printed here. It’s a principle, not a margin.',
    excerpt_ar: 'لأن جملة ولدت هون لازم تتطبع هون. مبدأ، مش هامش ربح.',
    body_en: 'We could print somewhere cheaper. We don’t. The phrases are Lebanese, the hands are Lebanese, the mistakes are Lebanese. When you print a sentence in the city it was born in, it carries the city’s grain. That’s the whole point of Kharbesh — local ink, local fabric, local sarcasm.',
    body_ar: 'فيك تطبع بحلة أرخص. ما بنعمل. الجمل لبنانية، الإيدين لبنانية، الغلطات لبنانية. لما بتطبع جملة بمدينتها، بتحمل ملمح المدينة. هاد كل فكرة خربش — حبر محلي، قماش محلي، سخرية محلية.',
  },
  {
    id: 4, date: '2026-07-08', tag: 'Design',
    title_en: 'The bolt under the word',
    title_ar: 'الصاعقة تحت الكلمة',
    excerpt_en: 'Every logo needs a heartbeat. Ours is a crooked line.',
    excerpt_ar: 'كل لوقو بدقه قلب. عندنا خط مائل.',
    body_en: 'The lightning bolt under خربش isn’t decoration. It’s the moment a thought becomes a reaction — the split second before you laugh or cuss. We drew it rough on purpose. Clean would’ve lied. The bolt is the punctuation of the whole brand: sharp, fast, a little off.',
    body_ar: 'الصاعقة تحت خربش مش زينة. هي اللحظة يلي الفكرة بتصير ردة فعل — الجزء من الثانية قبل ما تضحك أو تلعن. رسمناها خشنة عمداً. النظيف كان كذب. الصاعقة هي علامة الترقيم لكل الماركة: حادة، سريعة، شوي مالتة.',
  },
];

export default function Journal() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(null);
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Journal" title={lang === 'ar' ? 'يوميات خربش' : 'Kharbesh journal'} sub={lang === 'ar' ? 'مقالات ساخرة عن كل تصميم.' : 'Sarcastic notes behind every drop.'} />
      <div className="mt-10 space-y-6">
        {ARTICLES.map((a) => (
          <article key={a.id} className="bg-card border border-border rounded-md p-6">
            <div className="flex justify-between text-xs text-muted-foreground"><span className="kh-eyebrow">{a.tag}</span><span>{a.date}</span></div>
            <h2 className="font-heading text-2xl uppercase mt-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? a.title_ar : a.title_en}</h2>
            <p className="mt-3 text-muted-foreground">{lang === 'ar' ? a.excerpt_ar : a.excerpt_en}</p>
            <button className="kh-btn-text mt-4" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? (lang === 'ar' ? 'إغلاق' : 'Close') : (lang === 'ar' ? 'اقرأ' : 'Read')}</button>
            {open === a.id && <p className="mt-4 leading-relaxed">{lang === 'ar' ? a.body_ar : a.body_en}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
