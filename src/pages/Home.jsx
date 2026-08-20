import React from 'react';
import Hero from '@/components/home/Hero';
import CampaignBanner from '@/components/home/CampaignBanner';
import DesignShowcase from '@/components/home/DesignShowcase';
import ReadItTwice from '@/components/home/ReadItTwice';
import Worlds from '@/components/home/Worlds';
import Zaw2akBand from '@/components/home/Zaw2akBand';

export default function Home() {
  return (
    <div style={{ background: 'var(--paper)' }}>
      <Hero />
      <CampaignBanner />
      <DesignShowcase />
      <ReadItTwice />
      <Worlds />
      <Zaw2akBand />
    </div>
  );
}
