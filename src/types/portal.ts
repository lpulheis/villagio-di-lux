export type PortalRole = 'morador' | 'zelador' | 'sindico' | 'admin';

export type ContactItem = {
  id: string;
  name: string;
  function: string;
  phone: string;
};

export type ScheduleItem = {
  id: string;
  category: string;
  title?: string;
  dayType?: 'dias-da-semana' | 'sabado' | 'domingo' | 'feriado' | string;
  day?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  observation?: string;
  allowed?: boolean | 'SIM' | 'NÃO' | string;
  status: 'ATIVO' | 'INATIVO';
};

export type EventItem = {
  id: string;
  date: string;
  event: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'ATIVO' | 'INATIVO';
  service?: string;
  professional?: string;
  observation?: string;
};

export type ProfessionalItem = {
  id: string;
  name: string;
  service: string;
  company: string;
  phone: string;
  whatsapp: string;
  observation: string;
  status: 'ATIVO' | 'INATIVO';
};

export type NoticeItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  priority: 'ALTA' | 'MEDIA' | 'BAIXA';
  image?: string;
  link?: string;
  status: 'ATIVO' | 'INATIVO';
};

export type DocumentItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  date: string;
  link: string;
  status: 'ATIVO' | 'INATIVO';
};

export type PortalConfig = {
  condominiumName: string;
  cnpj: string;
  portariaAddress: string;
  portariaCep: string;
  internalAddress: string;
  internalCep: string;
  externalAddress: string;
  externalCep: string;
  presentation: string;
  phone: string;
  whatsapp: string;
  email: string;
  welcomeMessage: string;
  highlightNotice: string;
  usefulLinks: string[];
  generalInfo: string;
};

export type AppItem = {
  id: string;
  name: string;
  description: string;
  androidLink: string;
  iosLink: string;
  icon?: string;
};

export type PortalData = {
  config: PortalConfig;
  contacts: ContactItem[];
  schedules: ScheduleItem[];
  events: EventItem[];
  professionals: ProfessionalItem[];
  notices: NoticeItem[];
  documents: DocumentItem[];
  apps: AppItem[];
};
