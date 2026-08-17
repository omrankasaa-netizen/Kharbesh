import React from 'react';
import PageHeader from '@/components/PageHeader';
import GarmentMockup from '@/components/GarmentMockup';
import { useI18n } from '@/lib/i18n';

export default function SizingGuide() {
  const { lang } = useI18n();
  const rows = [
    { size: 'S', chest: 50, length: 68 },
    { size: 'M', chest: 53, length: 70 },
    { size: 'L', chest: 56, length: 72 },
    { size: 'XL', chest: 59, length: 74 },
    { size: 'XXL', chest: 62, length: 76 },
  ];
  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12">
      <PageHeader eyebrow="Sizing" title={lang === 'ar' ? 'دليل المقاسات' : 'Size & fit'} sub={lang === 'ar' ? 'كل قصة كيف بتمشي.' : 'How each fit actually fits.'} />
      <div className="grid sm:grid-cols-2 gap-6 mt-10">
        <div className="bg-card border border-border rounded-md p-6 flex flex-col items-center">
          <GarmentMockup type="tee" color="#F0E9D6" phrase="مقاس M" className="w-48" />
          <h3 className="font-heading text-lg uppercase mt-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'تيشيرت واسع' : 'Oversized tee'}</h3>
          <p className="text-muted-foreground text-sm text-center mt-1">{lang === 'ar' ? 'بمشي واسع — حط مقاسك المعتاد.' : 'Runs loose — order your usual size.'}</p>
        </div>
        <div className="bg-card border border-border rounded-md p-6 flex flex-col items-center">
          <GarmentMockup type="hoodie" color="#F0E9D6" phrase="مقاس L" className="w-48" />
          <h3 className="font-heading text-lg uppercase mt-4" style={{ fontFamily: 'var(--brand-font-heading)' }}>{lang === 'ar' ? 'هودي ثقيل' : 'Heavy hoodie'}</h3>
          <p className="text-muted-foreground text-sm text-center mt-1">{lang === 'ar' ? 'على المقاس — لو تحب واسع اطلب أكبر.' : 'True to size — size up for oversized.'}</p>
        </div>
      </div>
      <div className="overflow-x-auto mt-10">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-3 pr-3">Size</th><th className="py-3 pr-3">Chest (cm)</th><th className="py-3 pr-3">Length (cm)</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.size} className="border-b border-border"><td className="py-3 pr-3 font-heading" style={{ fontFamily: 'var(--brand-font-heading)' }}>{r.size}</td><td className="py-3 pr-3">{r.chest}</td><td className="py-3 pr-3">{r.length}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">{lang === 'ar' ? 'القياسات تقريبية، بتفاوت 1-2 سم. كل قماش بيتقل شوي بعد أول غسلة.' : 'Measurements are approximate, ±1–2 cm. Fabric relaxes slightly after the first wash.'}</p>
    </div>
  );
}
