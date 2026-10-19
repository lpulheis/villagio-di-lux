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

export const residentEmailForName = (name: string): string | null => {
  const username = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 64)
    .replace(/\.$/, '');

  return username ? `${username}@${RESIDENT_ACCOUNT_EMAIL_DOMAIN}` : null;
};

export const residentUnitFromEmail = (email: string | undefined): number | null => {
  const match = email?.trim().toLowerCase().match(
    new RegExp(`^casa(\\d+)@${RESIDENT_ACCOUNT_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`),
  );
  return match ? parseResidentUnit(match[1]) : null;
};

export const residentUnitFromUser = (user: {
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): number | null => {
  const metadataUnit = parseResidentUnit(user.app_metadata?.unit)
    ?? parseResidentUnit(user.user_metadata?.unit);

  return metadataUnit ?? residentUnitFromEmail(user.email);
};
