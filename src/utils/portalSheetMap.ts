export const RESOURCE_SHEET_MAP: Record<string, string> = {
  config: 'CONFIG',
  contacts: 'CONTATOS',
  schedules: 'HORARIOS',
  events: 'CRONOGRAMA',
  users: 'USUARIOS',
  professionals: 'PROFISSIONAIS',
  notices: 'AVISOS',
  documents: 'DOCUMENTOS',
  apps: 'APPS',
};

export const getSheetNameForResource = (resource: string): string => (
  RESOURCE_SHEET_MAP[resource] ?? resource.toUpperCase()
);
