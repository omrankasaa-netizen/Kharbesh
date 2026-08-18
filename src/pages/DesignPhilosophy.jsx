import React from 'react';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function DesignPhilosophy() {
  const { lang } = useI18n();
  const blocks = lang === 'ar' ? [
    { h: 'الحرف كلمة', p: 'خربش مش ماركة تيشيرت. هي طريقة لتخلي الحرف يلي بيتقال بالشارع يصير يلبس. كل تصميم جملة كاملة — بداية، نهاية، ونبرة. ما منحط شعار؛ منحط كلام.' },
    { h: 'الشارع المصدر', p: 'الإلهام مش من عروض الأزياء. من الزحمة، من الديكان، من الجلسة، من الرسائل يلي بتيجي على الواتساب. الخط العريض جاي من لافتات المحلات، مش من الكتب.' },
    { h: 'الخط اللبناني', p: 'بنستخدم خط عربي يدوي (رَقّ) لأنه فيه حراك — نفس حراك الكلمة المكتوبة بسرعة على ورقة. الخط النظيف بيكذب؛ الخط المائل بيقول الحقيقة.' },
    { h: 'الصاعقة', p: 'الخط المائل تحت الكلمة هو لحظة ردة الفعل — قبل الضحكة أو اللعنة. خربش بدون الصاعقة بس كلمة؛ معها، قرار.' },
  ] : [
    { h: 'The letter is the sentence', p: 'Kharbesh isn’t a t-shirt brand. It’s a way to let the letter that’s said on the street become something you wear. Every design is a full sentence — a beginning, an end, a tone. We don’t put a logo; we put language.' },
    { h: 'The street is the source', p: 'Inspiration doesn’t come from runway shows. It comes from traffic, from the corner shop, from the hangout, from the WhatsApp messages that land at midnight. The bold type comes from shop signage, not from books.' },
    { h: 'A Lebanese line', p: 'We use a hand-drawn Arabic script (Rakkas) because it has motion — the same motion as a word written fast on paper. Clean type lies; the crooked line tells the truth.' },
    { h: 'The bolt', p: 'The jagged line under the word is the moment of reaction — before the laugh or the cuss. Kharbesh without the bolt is just a word; with it, a decision.' },
  ];
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Philosophy" title={lang === 'ar' ? 'فلسفة التصميم' : 'Design philosophy'} sub={lang === 'ar' ? 'الحرف، الشارع، والخط.' : 'The letter, the street, the line.'} />
      <div className="mt-10 space-y-8">
        {blocks.map((b, i) => (
          <section key={i}>
            <h2 className="font-heading text-2xl mb-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>{b.h}</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">{b.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
