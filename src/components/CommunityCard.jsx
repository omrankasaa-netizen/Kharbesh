import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';

export default function CommunityCard() {
  const { t } = useI18n();
  return (
    <div className="kh-card-community">
      <span className="kh-badge">{t.home.communityEyebrow.toUpperCase()}</span>
      <h3 className="kh-h">{t.home.communityTitle}</h3>
      <p className="kh-p">{t.home.communitySub}</p>
      <Link to="/custom" className="kh-cta">{t.home.customCta}</Link>
    </div>
  );
}
