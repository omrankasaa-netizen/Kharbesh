import React from 'react';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';

export default function ReturnsPolicy() {
  const { lang } = useI18n();
  const sections = lang === 'ar' ? [
    { h: 'القاعدة', p: 'كل قطعة بنطبعها بعد ما تطلبها. لهيك ما في إرجاع نقدي. بس فيك تبدل — لأن ما حدا بيحب يلبس تيشيرت ما بيليق عليه.' },
    { h: 'الاستبدال', p: 'إذا المقاس ما زبط، فيك تبدله خلال 7 أيام من الاستلام، بشرط يكون القطعة جديدة، ما لبستها، وما غسلتها. يعني ما تعزم عليها قبل ما تقرر.' },
    { h: 'التصاميم المخصصة', p: 'التصاميم يلي طلبناها خصيصاًالك ما في تبديل فيها — لأنها انطبعت عمداًالك. فكر منيح قبل ما تطلب.' },
    { h: 'العيوب', p: 'إذا وصلتك قطعة فيها عيب من الإنتاج، بتوصالنا صورة خلال 3 أيام وبنبدلها. غلطتنا، بنصلحها.' },
    { h: 'كيف تبدل', p: 'راسلنا على صفحة Contact برقم طلبك وصورة القطعة. بنرد خلال يومين وبنرتب الاستبدال.' },
  ] : [
    { h: 'The rule', p: 'Every piece is printed after you order it. So no cash refunds. But you can exchange — because nobody wants to wear a tee that doesn’t fit.' },
    { h: 'Exchanges', p: 'If the size is off, exchange within 7 days of delivery, as long as the piece is unworn and unwashed. Don’t test-drive it before you decide.' },
    { h: 'Custom designs', p: 'Designs made specifically for you can’t be exchanged — they were printed on purpose, for you. Think before you order.' },
    { h: 'Defects', p: 'If a piece arrives with a production defect, send a photo within 3 days and we’ll replace it. Our mistake, we fix it.' },
    { h: 'How to exchange', p: 'Message us on the Contact page with your order number and a photo. We reply within two days and arrange the swap.' },
  ];
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Policy" title={lang === 'ar' ? 'الإرجاع والتبديل' : 'Returns & policy'} sub={lang === 'ar' ? 'بكل صراحة، بدون لف ودوران.' : 'Plain talk, no fine print.'} />
      <div className="mt-10 space-y-6">
        {sections.map((s, i) => (
          <section key={i} className="bg-card border border-border rounded-md p-6">
            <h2 className="font-heading text-xl uppercase mb-2" style={{ fontFamily: 'var(--brand-font-heading)' }}>{s.h}</h2>
            <p className="text-muted-foreground leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
