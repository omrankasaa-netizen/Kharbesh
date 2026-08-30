import React from 'react';
import { COUNTRIES, getCountry, countryOptionLabel, splitInternational } from '@/lib/phoneCountries';

/**
 * Two-part international phone control: country picker (dial code) +
 * national-number input. Value shape: { iso, national } — parents normalize
 * to E.164 with toE164() and validate with validatePhone() from
 * src/lib/phoneCountries.js.
 *
 * Pasting a full international number (+97150…, 00971…) into the national
 * input auto-switches the country and keeps only the national part.
 */
export default function PhoneInput({ value, onChange, onBlur, required = false, invalid = false, id }) {
  const country = getCountry(value?.iso);

  const handleNational = (raw) => {
    const detected = splitInternational(raw);
    if (detected) {
      onChange({ iso: detected.iso, national: detected.national });
    } else {
      onChange({ iso: country.iso, national: raw });
    }
  };

  return (
    <div className="flex gap-2" dir="ltr">
      <select
        aria-label="Country code"
        value={country.iso}
        onChange={(e) => onChange({ iso: e.target.value, national: value?.national || '' })}
        className="kh-input !w-auto shrink-0 max-w-[45%]"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>{countryOptionLabel(c)}</option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        dir="ltr"
        required={required}
        aria-invalid={invalid || undefined}
        value={value?.national || ''}
        onChange={(e) => handleNational(e.target.value)}
        onBlur={onBlur}
        className="kh-input flex-1 min-w-0"
        placeholder={country.iso === 'LB' ? '70 123 456' : undefined}
      />
    </div>
  );
}
