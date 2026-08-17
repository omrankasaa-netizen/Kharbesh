import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';

export default function DarkCommunityCard() {
  const { t } = useI18n();
  return (
    <div className="kh-d-community">
      <span className="kh-d-badge">{t.home.communityEyebrow.toUpperCase()}</span>
      <h3 className="kh-d-c-h">{t.home.communityTitle}</h3>
      <p className="kh-d-c-p">{t.home.communitySub}</p>
      <Link to="/custom" className="kh-d-cta">{t.home.customCta}</Link>
    </div>
  );
}
