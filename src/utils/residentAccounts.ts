export const RESIDENT_ACCOUNT_PASSWORD = 'villagiodilux';
export const RESIDENT_ACCOUNT_EMAIL_DOMAIN = 'villagiodilux.com.br';

export const parseResidentUnit = (value: unknown): number | null => {
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value.trim())) return null;
  } else if (typeof value !== 'number') {
    return null;
  }

  const unit = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(unit) && unit >= 1 && unit <= 48 ? unit : null;
};

export const residentUsername = (unit: number): string => `casa${unit}`;

export const residentEmail = (unit: number): string =>
  `${residentUsername(unit)}@${RESIDENT_ACCOUNT_EMAIL_DOMAIN}`;

export const residentUnitFromEmail = (email: string | undefined): number | null => {
  const match = email?.trim().toLowerCase().match(
    new RegExp(`^casa(\\d+)@${RESIDENT_ACCOUNT_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`),
  );
  return match ? parseResidentUnit(match[1]) : null;
};
