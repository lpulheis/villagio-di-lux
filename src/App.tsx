import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Bell, CalendarDays, CheckCircle2, FileText, Home, KeyRound, LogOut, Menu, PhoneCall, RefreshCcw, Settings, ShieldCheck, Smartphone, UserRound, Users, Wrench, X } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import { signInWithSupabase } from './services/supabaseAuth';
import { canAccessRoute, getNavigationItems, normalizeRoute, type PortalRole } from './utils/portalAccess';
import type { AppItem, ContactItem, DocumentItem, EventItem, NoticeItem, PortalConfig, PortalData, ProfessionalItem, ScheduleItem } from './types/portal';

type Session = {
  username: string;
  role: PortalRole;
  name: string;
};

type RouteState = {
  path: string;
  openMenu: boolean;
};

type PortalResourceItem = ContactItem | ScheduleItem | EventItem | ProfessionalItem | NoticeItem | DocumentItem | AppItem;

const managementRoles: PortalRole[] = ['admin', 'sindico', 'zelador'];

const defaultConfig: PortalConfig = {
  condominiumName: 'VILLAGIO DI LUX',
  cnpj: '59.271.694/0001-44',
  portariaAddress: 'Rua Chimangos, 70',
  portariaCep: '06740-572',
  internalAddress: 'Rua Uruguaiana, 69',
  internalCep: '06740-560',
  externalAddress: 'Estrada Ribeirão das Lages, 1270',
  externalCep: '06740-000',
  presentation: 'Portal oficial do condomínio com informações, horários, contatos e avisos.',
  phone: '(11) 3333-0000',
  whatsapp: '+55 (11) 99999-0000',
  email: 'contato@villagiodilux.com.br',
  welcomeMessage: 'Bem-vindo ao Portal do Morador.',
  highlightNotice: 'Manutenção da piscina será realizada esta semana.',
  usefulLinks: ['https://www.google.com', 'https://www.example.com'],
  generalInfo: 'Acompanhe informações e serviços do condomínio em um só lugar.',
};

const normalizeConfig = (config?: Partial<PortalConfig>): PortalConfig => ({
  ...defaultConfig,
  ...config,
  usefulLinks: Array.isArray(config?.usefulLinks) ? config.usefulLinks : defaultConfig.usefulLinks,
});

const basePortalData: PortalData = {
  config: defaultConfig,
  contacts: [
    {
      id: 'gcont',
      name: 'Administradora GCONT',
      function: 'Administradora — Villagio Di Lux',
      phone: '(11) 3333-0000',
    },
    {
      id: 'group-com',
      name: 'Administradora Group COM',
      function: 'Administradora — Granja Cristiana',
      phone: '(11) 3333-1111',
    },
    {
      id: 'rui-oliveira',
      name: 'Rui Oliveira',
      function: 'Síndico',
      phone: '(11) 3333-2222',
    },
    {
      id: 'nivea',
      name: 'Nivea',
      function: 'Zeladora',
      phone: '(11) 3333-3333',
    },
    {
      id: 'msiao',
      name: 'MSiao',
      function: 'Manutenção Portões, Câmeras e Cerca Elétrica',
      phone: '(11) 3333-4444',
    },
    {
      id: 'jardineiro',
      name: 'Jardineiro',
      function: 'Jardineiro',
      phone: '(11) 3333-5555',
    },
    {
      id: 'piscineiro',
      name: 'Piscineiro',
      function: 'Piscineiro',
      phone: '(11) 3333-5555',
    },
    {
      id: 'portoes-cameras',
      name: 'Portões e Câmeras',
      function: 'Suporte — Portões e Câmeras',
      phone: '(11) 3333-6666',
    },
    {
      id: 'portaria',
      name: 'Portaria Granja Cristiana',
      function: 'Portaria',
      phone: '(11) 3333-7777',
    },
    {
      id: 'encomendas',
      name: 'Encomendas Granja Cristiana',
      function: 'Encomendas',
      phone: '(11) 3333-8888',
    },
    {
      id: 'ronda',
      name: 'Ronda Granja Cristiana',
      function: 'Ronda',
      phone: '(11) 3333-9999',
    },
  ],
  schedules: [
    {
      id: 's1',
      category: 'Obras, reformas e mudanças',
      title: 'Obras, reformas e mudanças',
      dayType: 'dias-da-semana',
      day: 'Segunda a sexta',
      startTime: '08:00',
      endTime: '19:00',
      allowed: 'SIM',
      description: 'Horário permitido para obras e reformas',
      observation: 'Horário permitido para obras e reformas',
      status: 'ATIVO',
    },
    {
      id: 's2',
      category: 'Obras, reformas e mudanças',
      title: 'Obras, reformas e mudanças',
      dayType: 'sabado',
      day: 'Sábado',
      startTime: '09:00',
      endTime: '14:00',
      allowed: 'SIM',
      description: 'Horário permitido para obras e reformas',
      observation: 'Horário permitido para obras e reformas',
      status: 'ATIVO',
    },
    {
      id: 's3',
      category: 'Obras, reformas e mudanças',
      title: 'Obras, reformas e mudanças',
      dayType: 'domingo-e-feriados',
      day: 'Domingo e feriados',
      startTime: '-',
      endTime: '-',
      allowed: 'NÃO',
      description: 'Não permitido',
      observation: 'Não permitido',
      status: 'ATIVO',
    },
  ],
  events: [
    {
      id: 'e1',
      date: '2026-10-06',
      event: 'Jardinagem',
      description: 'Manutenção dos jardins',
      startTime: '08:00',
      endTime: '16:00',
      status: 'ATIVO',
    },
  ],
  professionals: [
    {
      id: 'p1',
      name: 'Jardineiro',
      service: 'Jardinagem',
      company: 'Villagio Di Lux',
      phone: '(11) 3333-2222',
      whatsapp: '(11) 99999-0003',
      observation: 'Cuidado com área verde',
      status: 'ATIVO',
    },
  ],
  notices: [
    {
      id: 'n1',
      title: 'Aviso importante',
      description: 'A piscina será revisada no próximo fim de semana.',
      category: 'Geral',
      date: '2026-10-06',
      priority: 'ALTA',
      image: '',
      link: '',
      status: 'ATIVO',
    },
  ],
  documents: [
    {
      id: 'd1',
      name: 'Regimento interno',
      category: 'Documentos',
      description: 'Normas e procedimentos do condomínio',
      date: '2026-10-06',
      link: '#',
      status: 'ATIVO',
    },
  ],
  apps: [
    {
      id: 'tuya',
      name: 'Tuya',
      description: 'Automação dos portões do condomínio.',
      androidLink: 'https://play.google.com/store/apps/details?id=com.tuya.smart&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/tuya-smart-life-smart-living/id1034649547',
      icon: '/apps/tuya.png',
    },
    {
      id: 'group-com',
      name: 'Group COM',
      description: 'Aplicativo da Administradora Granja Cristiana.',
      androidLink: 'https://play.google.com/store/apps/details?id=br.com.comunidadesmobile_1&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/group-com/id999528459',
      icon: '/apps/group-com.png',
    },
    {
      id: 'condominio',
      name: 'Condomínio',
      description: 'Aplicativo da Administradora Villagio Di Lux.',
      androidLink: 'https://play.google.com/store/apps/details?id=com.condor.superlogica&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/condom%C3%ADnio-%C3%A1rea-do-cond%C3%B4mino/id1160849001',
      icon: '/apps/condominio.png',
    },
    {
      id: 'condfy',
      name: 'Condfy',
      description: 'Gestão de encomendas e visitantes da Granja Cristiana.',
      androidLink: 'https://play.google.com/store/apps/details?id=br.com.condfy&pcampaignid=web_share',
      iosLink: 'https://apps.apple.com/br/app/condfy/id1459875612',
      icon: '/apps/condfy.png',
    },
  ],
};

const formatLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildCalendarDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const value = new Date(start);
    value.setDate(start.getDate() + i);
    days.push(value);
  }

  return days;
};

const parseLocalIsoDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDate = (value: string) => {
  if (!value) return 'Sem data';
  const date = parseLocalIsoDate(value) ?? new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatDayMonth = (value: string) => {
  if (!value) return 'Sem data';
  const date = parseLocalIsoDate(value) ?? new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

const getTodayIso = () => {
  const today = new Date();
  return formatLocalDateKey(today);
};

const sortPriority = (a: NoticeItem, b: NoticeItem) => {
  const priorityOrder = { ALTA: 3, MEDIA: 2, BAIXA: 1 };
  return (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0);
};

const getSafeJson = <T,>(value: T | null | undefined, fallback: T): T => value ?? fallback;

const normalizeContact = (contact: Partial<ContactItem> & Record<string, unknown>): ContactItem => ({
  id: String(contact.id ?? crypto.randomUUID()),
  name: String(contact.name ?? ''),
  function: String(contact.function ?? contact.funcao ?? contact.role ?? contact.category ?? 'Contato'),
  phone: String(contact.phone ?? ''),
});

const normalizeSchedule = (schedule: Partial<ScheduleItem> & Record<string, unknown>): ScheduleItem => {
  const dayLabel = String(schedule.day ?? 'Segunda a sexta');
  const normalizedAllowed = String(schedule.allowed ?? 'SIM');
  const dayType = String(schedule.dayType ?? (
    /sabado|sábado/i.test(dayLabel)
      ? 'sabado'
      : /domingo|feriado/i.test(dayLabel)
        ? 'domingo-e-feriados'
        : 'dias-da-semana'
  ));

  return {
    id: String(schedule.id ?? crypto.randomUUID()),
    category: String(schedule.category ?? 'Obras, reformas e mudanças'),
    title: String(schedule.title ?? schedule.category ?? 'Obras, reformas e mudanças'),
    dayType,
    day: dayLabel,
    startTime: String(schedule.startTime ?? '08:00'),
    endTime: String(schedule.endTime ?? '19:00'),
    allowed: normalizedAllowed,
    description: String(schedule.description ?? (normalizedAllowed === 'SIM' ? 'Horário permitido' : 'Não permitido')),
    observation: String(schedule.observation ?? (normalizedAllowed === 'SIM' ? 'Horário permitido' : 'Não permitido')),
    status: (String(schedule.status ?? 'ATIVO') as ScheduleItem['status']),
  };
};

const normalizeEvent = (event: Partial<EventItem> & Record<string, unknown>): EventItem => {
  const eventName = String(event.event ?? event.service ?? 'Evento');
  const description = String(event.description ?? event.observation ?? event.service ?? 'Descrição');

  return {
    id: String(event.id ?? crypto.randomUUID()),
    date: String(event.date ?? ''),
    event: eventName,
    description,
    startTime: String(event.startTime ?? ''),
    endTime: String(event.endTime ?? ''),
    status: (String(event.status ?? 'ATIVO') as EventItem['status']),
    service: String(event.service ?? eventName),
    observation: String(event.observation ?? description),
    professional: typeof event.professional === 'string' ? event.professional : undefined,
  };
};

const getDefaultAppIcon = (idOrName?: string): string | undefined => {
  const key = String(idOrName ?? '').toLowerCase();
  const iconMap: Record<string, string> = {
    tuya: 'https://play-lh.googleusercontent.com/BcBhwHxvbgwIpJAtJ-4JQGqUNY815xu6fyDUorqrL_bEPojOeRWuR2g-e_lZMMkRI2Pjdc1qsgSlLeEUctvH',
    'group-com': 'https://play-lh.googleusercontent.com/78xBVctm6ygoD8cRmG-XGmY9msN3Fl7wjKEZazBQAxRwcBzGLyLNSiXFWCZBBXL-yn8kiI-5z4dTAvCGFtxpzw',
    condominio: 'https://play-lh.googleusercontent.com/58ukJHcPlGrD7ESmaJUn3nlQUCHPnfVTppUIKK-DKhXqmc1bfwaWh-a7-Zwb5yUzPP4236EjYMz9CqnzwmHgaw',
    condfy: 'https://play-lh.googleusercontent.com/RPpGW-XmRbqLveLtZsmIysqqBDIFrZ7OoXPI5sRn8kBXg_HB1LEM0wXPuxBKa-d8tBEBI5IXDLrA9maD7wWG',
  };

  return iconMap[key];
};

const normalizeApp = (app: Partial<AppItem> & Record<string, unknown>): AppItem => ({
  id: String(app.id ?? crypto.randomUUID()),
  name: String(app.name ?? ''),
  description: String(app.description ?? ''),
  androidLink: String(app.androidLink ?? ''),
  iosLink: String(app.iosLink ?? ''),
  icon: typeof app.icon === 'string' && app.icon ? app.icon : getDefaultAppIcon(String(app.id ?? app.name ?? '')),
});

const normalizePortalData = (payload: Partial<PortalData> | null | undefined): PortalData => {
  const supplies = getSafeJson(payload, {} as Partial<PortalData>);
  return {
    config: normalizeConfig(getSafeJson(supplies.config, defaultConfig) as Partial<PortalConfig>),
    contacts: Array.isArray(supplies.contacts) ? supplies.contacts.map((contact) => normalizeContact(contact as Partial<ContactItem> & Record<string, unknown>)) : basePortalData.contacts,
    schedules: Array.isArray(supplies.schedules) ? supplies.schedules.map((schedule) => normalizeSchedule(schedule as Partial<ScheduleItem> & Record<string, unknown>)) : basePortalData.schedules,
    events: Array.isArray(supplies.events) ? supplies.events.map((event) => normalizeEvent(event as Partial<EventItem> & Record<string, unknown>)) : basePortalData.events,
    professionals: getSafeJson(supplies.professionals, basePortalData.professionals),
    notices: getSafeJson(supplies.notices, basePortalData.notices),
    documents: getSafeJson(supplies.documents, basePortalData.documents),
    apps: Array.isArray(supplies.apps) ? supplies.apps.map((app) => normalizeApp(app as Partial<AppItem> & Record<string, unknown>)) : basePortalData.apps,
  };
};

const persistPortalData = async (next: PortalData): Promise<void> => {
  if (!hasSupabaseConfig || !supabase) {
    return;
  }

  const { error } = await supabase
    .from('portal_data')
    .upsert({ slug: 'portal', payload: next }, { onConflict: 'slug' });

  if (error) {
    console.warn('Supabase portal persistence failed:', error.message);
  }
};

const fetchPortalData = async (): Promise<PortalData> => {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('portal_data')
      .select('payload')
      .eq('slug', 'portal')
      .maybeSingle();

    if (!error && data?.payload) {
      return normalizePortalData(data.payload as Partial<PortalData>);
    }

    if (error) {
      console.warn('Supabase portal query failed:', error.message);
    }
  }

  try {
    const response = await fetch('/api/portal');
    if (!response.ok) {
      return basePortalData;
    }

    const payload = await response.json();
    return normalizePortalData(payload);
  } catch {
    return basePortalData;
  }
};

const renderStatusBadge = (status: string) => (
  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
    {status}
  </span>
);

const formatLastSync = (value: Date | null) => {
  if (!value) {
    return 'Sem sincronização ainda';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
};

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = sessionStorage.getItem('villagio-session');
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });

  const [routeState, setRouteState] = useState<RouteState>({
    path: normalizeRoute(window.location.hash || '#/login'),
    openMenu: false,
  });

  const [portalData, setPortalData] = useState<PortalData>(basePortalData);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncPortalData = useCallback((data: PortalData) => {
    setPortalData(data);
    setLastSyncedAt(new Date());
  }, []);

  const refreshPortalData = useCallback(async () => {
    const data = await fetchPortalData();
    syncPortalData(data);
    return data;
  }, [syncPortalData]);

  useEffect(() => {
    const client = supabase;

    if (!hasSupabaseConfig || !client) {
      return;
    }

    let isMounted = true;

    const hydrateSupabaseSession = async () => {
      const { data } = await client.auth.getSession();
      if (!isMounted || !data.session?.user) {
        return;
      }

      const user = data.session.user;
      const role = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : 'morador';
      const username = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : (user.email ?? 'usuario');
      const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : (user.email?.split('@')[0] ?? 'Usuário');

      setSession({ username, role: role as PortalRole, name });
    };

    hydrateSupabaseSession();

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession?.user || !isMounted) {
        return;
      }

      const user = nextSession.user;
      const role = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : 'morador';
      const username = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : (user.email ?? 'usuario');
      const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : (user.email?.split('@')[0] ?? 'Usuário');

      setSession({ username, role: role as PortalRole, name });
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const nextPath = normalizeRoute(window.location.hash || '#/login');
      setRouteState((current) => ({ ...current, path: nextPath }));
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!session) {
      if (routeState.path !== '/login') {
        window.location.hash = '#/login';
      }
      return;
    }

    if (!canAccessRoute(session.role, routeState.path)) {
      const redirect = managementRoles.includes(session.role) ? '/admin' : '/inicio';
      window.location.hash = `#${redirect}`;
      setRouteState((current) => ({ ...current, path: redirect }));
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        await refreshPortalData();
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar informações.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [session, routeState.path]);

  const navigate = (path: string) => {
    const nextPath = normalizeRoute(path);
    window.location.hash = `#${nextPath}`;
    setRouteState((current) => ({ ...current, path: nextPath, openMenu: false }));
  };

  const logout = async () => {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut();
    }

    sessionStorage.removeItem('villagio-session');
    setSession(null);
    setRouteState({ path: '/login', openMenu: false });
    window.location.hash = '#/login';
  };

  const authUser = async (credentials: { username: string; password: string }) => {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de entrar.');
    }

    const nextSession = await signInWithSupabase(credentials);
    sessionStorage.setItem('villagio-session', JSON.stringify(nextSession));
    setSession(nextSession);
    navigate(managementRoles.includes(nextSession.role as PortalRole) ? '/admin' : '/inicio');
  };

  if (!session) {
    return <LoginPage onSubmit={authUser} />;
  }

  if (routeState.path === '/login') {
    navigate(managementRoles.includes(session.role) ? '/admin' : '/inicio');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader
        session={session}
        currentRoute={routeState.path}
        onNavigate={navigate}
        onLogout={logout}
        openMenu={false}
        onToggleMenu={() => undefined}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-5 md:px-6 lg:px-8">
        {(isLoading || error) && (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            {isLoading ? <p className="text-sm text-slate-600">Carregando informações...</p> : <p className="text-sm text-rose-600">{error}</p>}
          </div>
        )}

        {session.role === 'morador' ? (
          <ResidentPages route={routeState.path} data={portalData} onNavigate={navigate} />
        ) : (
          <AdminPages route={routeState.path} data={portalData} onNavigate={navigate} onRefresh={refreshPortalData} lastSyncedAt={lastSyncedAt} onDataChange={syncPortalData} />
        )}
      </div>

      {session.role === 'morador' ? (
        <BottomNavigation currentRoute={routeState.path} onNavigate={navigate} />
      ) : (
        <AdminBottomNavigation currentRoute={routeState.path} onNavigate={navigate} />
      )}
    </div>
  );
}

function LoginPage({ onSubmit }: { onSubmit: (credentials: { username: string; password: string }) => Promise<void> }) {
  const [username, setUsername] = useState('morador');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({ username, password });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro ao entrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f4fdf8_0%,_#edf7f2_25%,_#f8fafc_60%,_#f1f5f9_100%)] px-4 py-8">
      <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm md:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_10px_30px_rgba(16,185,129,0.12)]">
            <img
              src="https://www.construtoraelecon.com.br/wp-content/uploads/2022/08/villagio-di-lux-2.jpg"
              alt="Villagio Di Lux"
              className="h-full w-full object-cover"
            />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.38em] text-emerald-700">Portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">VILLAGIO DI LUX</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Usuário" value={username} onChange={(event) => setUsername(event.target.value)} />
          <Input label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'ENTRAR'}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AppHeader({
  session,
  currentRoute,
  onNavigate,
  onLogout,
  openMenu,
  onToggleMenu,
}: {
  session: Session;
  currentRoute: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  openMenu: boolean;
  onToggleMenu: () => void;
}) {
  const isManagementRole = managementRoles.includes(session.role);
  const pageTitle = isManagementRole ? 'Painel Administrativo' : 'Condomínio';

  return (
    <header className="border-b border-slate-200 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <img
              src="https://www.construtoraelecon.com.br/wp-content/uploads/2022/08/villagio-di-lux-2.jpg"
              alt="Villagio Di Lux"
              className="h-11 w-11 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
            />
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">VILLAGIO DI LUX</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Bem-vindo ao Portal</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {isManagementRole ? (
            <AdminNav currentRoute={currentRoute} onNavigate={onNavigate} compact />
          ) : (
            <ResidentNav currentRoute={currentRoute} onNavigate={onNavigate} compact />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 sm:block">
            {session.name}
          </div>
          <Button variant="secondary" onClick={onLogout} className="gap-2 px-4 py-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ResidentNav({ currentRoute, onNavigate, compact = false }: { currentRoute: string; onNavigate: (path: string) => void; compact?: boolean }) {
  const items = [
    { label: 'Início', path: '/inicio' },
    { label: 'Horários', path: '/horarios' },
    { label: 'Cronograma', path: '/cronograma' },
    { label: 'Contatos', path: '/contatos' },
    { label: 'Avisos', path: '/avisos' },
    { label: 'Apps', path: '/apps' },
  ];

  return (
    <nav className={compact ? 'flex items-center gap-2' : 'grid gap-2 p-3'}>
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => onNavigate(item.path)}
          className={`rounded-full px-3 py-2 text-sm font-medium transition ${
            currentRoute === item.path ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function AdminNav({ currentRoute, onNavigate, compact = false }: { currentRoute: string; onNavigate: (path: string) => void; compact?: boolean }) {
  const items = [
    { label: 'Dashboard', path: '/admin' },
    { label: 'Contatos', path: '/admin/contatos' },
    { label: 'Horários', path: '/admin/horarios' },
    { label: 'Cronograma', path: '/admin/cronograma' },
    { label: 'Avisos', path: '/admin/avisos' },
    { label: 'Apps', path: '/admin/apps' },
    { label: 'Configurações', path: '/admin/configuracoes' },
  ];

  return (
    <nav className={compact ? 'flex flex-wrap items-center gap-2' : 'grid gap-2 p-3'}>
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => onNavigate(item.path)}
          className={`rounded-full px-3 py-2 text-sm font-medium transition ${
            currentRoute === item.path ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function BottomNavigation({ currentRoute, onNavigate }: { currentRoute: string; onNavigate: (path: string) => void }) {
  const items = [
    { label: 'Início', icon: Home, path: '/inicio' },
    { label: 'Horários', icon: CalendarDays, path: '/horarios' },
    { label: 'Cronograma', icon: Bell, path: '/cronograma' },
    { label: 'Contatos', icon: PhoneCall, path: '/contatos' },
    { label: 'Apps', icon: Smartphone, path: '/apps' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-2">
        {items.map(({ label, icon: Icon, path }) => (
          <button key={path} onClick={() => onNavigate(path)} className={`flex flex-col items-center justify-center rounded-2xl gap-1 px-2 py-2 text-[10px] font-medium ${currentRoute === path ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function AdminBottomNavigation({ currentRoute, onNavigate }: { currentRoute: string; onNavigate: (path: string) => void }) {
  const items = [
    { label: 'Dashboard', icon: ShieldCheck, path: '/admin' },
    { label: 'Contatos', icon: PhoneCall, path: '/admin/contatos' },
    { label: 'Horários', icon: CalendarDays, path: '/admin/horarios' },
    { label: 'Cronograma', icon: Bell, path: '/admin/cronograma' },
    { label: 'Avisos', icon: FileText, path: '/admin/avisos' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-2">
        {items.map(({ label, icon: Icon, path }) => (
          <button key={path} onClick={() => onNavigate(path)} className={`flex flex-col items-center justify-center rounded-2xl gap-1 px-2 py-2 text-[10px] font-medium ${currentRoute === path ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function AppIcon({ app }: { app: AppItem }) {
  if (app.icon && (app.icon.startsWith('http') || app.icon.startsWith('/'))) {
    return (
      <img
        src={app.icon}
        alt={app.name}
        className="h-12 w-12 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
      />
    );
  }

  const initials = app.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AP';

  const themeMap: Record<string, { bg: string; text: string; accent: string }> = {
    tuya: { bg: 'from-orange-500 to-amber-400', text: 'text-white', accent: 'bg-orange-200/40' },
    'group-com': { bg: 'from-emerald-600 to-teal-500', text: 'text-white', accent: 'bg-emerald-200/40' },
    condominio: { bg: 'from-sky-600 to-indigo-500', text: 'text-white', accent: 'bg-sky-200/40' },
    condfy: { bg: 'from-violet-600 to-purple-500', text: 'text-white', accent: 'bg-violet-200/40' },
  };

  const theme = themeMap[app.icon ?? app.id] ?? { bg: 'from-emerald-500 to-emerald-600', text: 'text-white', accent: 'bg-emerald-200/40' };

  return (
    <div className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${theme.bg} shadow-sm`}>
      <span className={`relative z-10 text-sm font-black tracking-tight ${theme.text}`}>{initials}</span>
      <span className={`absolute inset-2 rounded-xl ${theme.accent}`} />
    </div>
  );
}

function ResidentPages({ route, data, onNavigate }: { route: string; data: PortalData; onNavigate: (path: string) => void }) {
  const todayIso = getTodayIso();
  const todayEvents = data.events.filter((event) => event.status === 'ATIVO' && event.date === todayIso);
  const nextEvents = [...data.events.filter((event) => event.status === 'ATIVO' && event.date >= todayIso)].sort((a, b) => a.date.localeCompare(b.date));

  switch (route) {
    case '/inicio':
      return (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Condomínio</p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{data.config.condominiumName}</p>
              <p className="mt-4 text-sm text-slate-600">CNPJ: {data.config.cnpj}</p>
              <p className="mt-3 text-base text-slate-700">{data.config.internalAddress} - CEP {data.config.internalCep}</p>
              <p className="mt-2 text-base text-slate-700">{data.config.externalAddress} - CEP {data.config.externalCep}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">RESIDENCIAL</p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">GRANJA CRISTIANA</p>
              <p className="mt-4 text-sm text-slate-600">CNPJ: 65.705.733/0001-77</p>
              <p className="mt-3 text-base text-slate-700">Rua Chimangos, 70 - CEP 06740-572</p>
            </div>
          </div>

        </div>
      );

    case '/horarios':
      return (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">HORÁRIOS</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Obras e mudanças</h2>
          </div>
          {data.schedules.filter((entry) => entry.status === 'ATIVO').length ? (
            <div className="space-y-4">
              {[
                { key: 'dias-da-semana', label: 'Segunda a sexta', fallback: '08:00 às 19:00' },
                { key: 'sabado', label: 'Sábado', fallback: '09:00 às 14:00' },
                { key: 'domingo-e-feriados', label: 'Domingo e feriados', fallback: 'Não permitidos' },
              ].map(({ key, label, fallback }) => {
                const item = data.schedules.find((entry) => entry.status === 'ATIVO' && entry.dayType === key) ?? data.schedules.find((entry) => entry.status === 'ATIVO' && entry.day === label);
                const displayText = !item || item.allowed === 'NÃO' || item.startTime === '-' || item.endTime === '-'
                  ? 'Não permitidos'
                  : `${item.startTime} às ${item.endTime}`;

                return (
                  <div key={key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">{label}</p>
                    <p className="mt-3 text-base font-semibold leading-6 text-slate-900">{displayText || fallback}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState label="Nenhum horário cadastrado." />
          )}
        </div>
      );

    case '/cronograma':
      return <CalendarPage data={data} />;

    case '/contatos':
      return (
        <div className="space-y-6">
          <SectionHeader title="CONTATOS" subtitle="Cadastros úteis do condomínio" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.contacts.map((contact) => (
              <div key={contact.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{contact.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{contact.function}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {contact.phone && (
                    <>
                      <a href={`tel:${contact.phone}`} className="rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white">
                        Ligar
                      </a>
                      <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium text-white">
                        WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case '/avisos':
      return (
        <div className="space-y-6">
          <SectionHeader title="AVISOS" subtitle="Comunicados e alertas do condomínio" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.notices.length ? data.notices.map((notice) => (
              <div key={notice.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">{notice.priority}</span>
                  <span className="text-xs text-slate-500">{notice.date}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{notice.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{notice.description}</p>
                {notice.link && (
                  <a href={notice.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium text-white">
                    Ver detalhes
                  </a>
                )}
              </div>
            )) : <EmptyState label="Nenhum aviso cadastrado." />}
          </div>
        </div>
      );

    case '/apps':
      return (
        <div className="space-y-6">
          <SectionHeader title="APPS" subtitle="Aplicativos do condomínio" />
          <div className="grid gap-4 md:grid-cols-2">
            {data.apps.map((app) => (
              <div key={app.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <AppIcon app={app} />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{app.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{app.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {app.androidLink && (
                    <a href={app.androidLink} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium text-white">Android</a>
                  )}
                  {app.iosLink && (
                    <a href={app.iosLink} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">iOS</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return <div />;
  }
}

function AdminPages({ route, data, onNavigate, onRefresh, lastSyncedAt, onDataChange }: { route: string; data: PortalData; onNavigate: (path: string) => void; onRefresh: () => Promise<PortalData>; lastSyncedAt: Date | null; onDataChange: (next: PortalData) => void; }) {
  const [resourceData, setResourceData] = useState(data);

  useEffect(() => {
    setResourceData(data);
  }, [data]);

  const updateResource = async (resource: keyof PortalData, entities: PortalResourceItem[]) => {
    const next = { ...resourceData, [resource]: entities } as PortalData;
    setResourceData(next);
    onDataChange(next);

    await persistPortalData(next);

    await fetch(`/api/portal/${resource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entities),
    });

    const fresh = await onRefresh();
    setResourceData(fresh);
    onDataChange(fresh);
  };

  switch (route) {
    case '/admin':
      return (
        <div className="space-y-6">
          <SectionHeader title="PAINEL ADMINISTRATIVO" subtitle="Resumo da operação do condomínio" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard icon={<Users className="h-5 w-5" />} title="Contatos" value={String(resourceData.contacts.length)} description="cadastros ativos" />
            <InfoCard icon={<CalendarDays className="h-5 w-5" />} title="Cronograma" value={String(resourceData.events.length)} description="eventos cadastrados" />
            <InfoCard icon={<Smartphone className="h-5 w-5" />} title="Apps" value={String(resourceData.apps.length)} description="links disponíveis" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Status do portal">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <RefreshCcw className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Última sincronização</p>
                  <p className="truncate text-xs text-slate-500">{formatLastSync(lastSyncedAt)}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      );

    case '/admin/contatos':
      return <AdminCrudPage resource="contacts" title="Contatos" data={resourceData.contacts as ContactItem[]} onSave={async (items) => updateResource('contacts', items)} />;
    case '/admin/horarios':
      return <AdminCrudPage resource="schedules" title="Horários" data={resourceData.schedules as ScheduleItem[]} onSave={async (items) => updateResource('schedules', items)} />;
    case '/admin/cronograma':
      return <AdminCrudPage resource="events" title="Cronograma" data={resourceData.events as EventItem[]} onSave={async (items) => updateResource('events', items)} />;
    case '/admin/avisos':
      return <AdminCrudPage resource="notices" title="Avisos" data={resourceData.notices as NoticeItem[]} onSave={async (items) => updateResource('notices', items)} />;
    case '/admin/apps':
      return <AdminCrudPage resource="apps" title="Apps" data={resourceData.apps as AppItem[]} onSave={async (items) => updateResource('apps', items)} />;
    case '/admin/documentos':
      return <AdminCrudPage resource="documents" title="Documentos" data={resourceData.documents as DocumentItem[]} onSave={async (items) => updateResource('documents', items)} />;
    case '/admin/configuracoes':
      return <ConfigPage config={resourceData.config} onSave={async (config) => {
        const next = { ...resourceData, config };
        setResourceData(next);
        await persistPortalData(next);
        await fetch('/api/portal/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        await onRefresh();
      }} />;
    default:
      return <div />;
  }
}

function AdminCrudPage<T extends { id: string; status?: string }>({
  resource,
  title,
  data,
  onSave,
}: {
  resource: string;
  title: string;
  data: T[];
  onSave: (items: T[]) => Promise<void>;
}) {
  const [items, setItems] = useState<T[]>(data);
  const [draft, setDraft] = useState<Partial<T>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(data);
  }, [data]);

  const fieldLabels: Record<string, string> = resource === 'contacts'
    ? { name: 'Nome', function: 'Função', phone: 'Telefone' }
    : resource === 'schedules'
      ? { day: 'Dia', startTime: 'Hora de início', endTime: 'Hora de fim', allowed: 'Permissão', status: 'Status' }
      : resource === 'events'
        ? { date: 'Data', event: 'Evento', description: 'Descrição', startTime: 'Hora início', endTime: 'Hora fim' }
        : {};

  const excludedKeys = resource === 'schedules'
    ? new Set(['id', 'category', 'title', 'dayType', 'description', 'observation'])
    : resource === 'events'
      ? new Set(['id', 'status', 'service', 'professional', 'observation'])
      : new Set(['id']);

  const fields = Object.keys(data[0] ?? {}).filter((key) => !excludedKeys.has(key)).map((key) => ({
    key,
    label: fieldLabels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()),
  }));
  const tableFields = resource === 'schedules'
    ? fields.filter((field) => field.key !== 'status')
    : fields;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? { ...item, ...(draft as Partial<T>) } : item))
      : [...items, { ...(draft as object), id: crypto.randomUUID() } as T];

    setItems(nextItems);
    setDraft({});
    setEditingId(null);
    await onSave(nextItems);
  };

  const handleDelete = async (id: string) => {
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    await onSave(nextItems);
  };

  const handleEdit = (item: T) => {
    setEditingId(item.id);
    setDraft(item);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={title} subtitle="Gerenciamento de informações" />
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <Button variant="secondary" onClick={() => { setDraft({}); setEditingId(null); }}>Novo</Button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => {
            const fieldType = field.key === 'date' ? 'date' : field.key === 'startTime' || field.key === 'endTime' ? 'time' : 'text';

            return (
              <Input
                key={field.key}
                label={field.label}
                type={fieldType}
                value={String((draft as Record<string, unknown>)[field.key] ?? '')}
                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value } as Partial<T>))}
              />
            );
          })}
          <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setDraft({}); setEditingId(null); }}>Cancelar</Button>
            <Button type="submit">{editingId ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                {tableFields.map((field) => <th key={field.key} className="px-4 py-3 font-medium">{field.label}</th>)}
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 align-top">
                  {tableFields.map((field) => (
                    <td key={`${item.id}-${field.key}`} className="px-4 py-3 text-slate-700">{String((item as Record<string, unknown>)[field.key] ?? '')}</td>
                  ))}
                  <td className="px-4 py-3">{renderStatusBadge((item as Record<string, string>).status ?? 'ATIVO')}</td>
                  <td className="space-x-2 px-4 py-3">
                    <button onClick={() => handleEdit(item)} className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">Editar</button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfigPage({ config, onSave }: { config: PortalConfig; onSave: (config: PortalConfig) => Promise<void> }) {
  const [draft, setDraft] = useState<PortalConfig>(config);

  return (
    <div className="space-y-6">
      <SectionHeader title="Configurações do Portal" subtitle="Informações institucionais" />
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome do condomínio" value={draft.condominiumName} onChange={(event) => setDraft({ ...draft, condominiumName: event.target.value })} />
          <Input label="CNPJ" value={draft.cnpj ?? ''} onChange={(event) => setDraft({ ...draft, cnpj: event.target.value })} />
          <Input label="Endereço da Portaria" value={draft.portariaAddress ?? ''} onChange={(event) => setDraft({ ...draft, portariaAddress: event.target.value })} />
          <Input label="CEP da Portaria" value={draft.portariaCep ?? ''} onChange={(event) => setDraft({ ...draft, portariaCep: event.target.value })} />
          <Input label="Endereço interno" value={draft.internalAddress ?? ''} onChange={(event) => setDraft({ ...draft, internalAddress: event.target.value })} />
          <Input label="CEP interno" value={draft.internalCep ?? ''} onChange={(event) => setDraft({ ...draft, internalCep: event.target.value })} />
          <Input label="Endereço externo" value={draft.externalAddress ?? ''} onChange={(event) => setDraft({ ...draft, externalAddress: event.target.value })} />
          <Input label="CEP externo" value={draft.externalCep ?? ''} onChange={(event) => setDraft({ ...draft, externalCep: event.target.value })} />
          <Input label="Aviso de destaque" value={draft.highlightNotice} onChange={(event) => setDraft({ ...draft, highlightNotice: event.target.value })} className="md:col-span-2" />
          <Input label="Informações gerais" value={draft.generalInfo} onChange={(event) => setDraft({ ...draft, generalInfo: event.target.value })} className="md:col-span-2" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => onSave(draft)}>Salvar configurações</Button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">{title}</p>
      {subtitle && <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{subtitle}</h1>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function InfoCard({ icon, title, value, description }: { icon: ReactNode; title: string; value: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">{icon}</div>
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50">
      {label}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{label}</div>;
}

function CalendarPage({ data }: { data: PortalData }) {
  const [month, setMonth] = useState(new Date(2026, 9, 1));
  const [selectedDate, setSelectedDate] = useState('2026-10-06');
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of data.events.filter((entry) => entry.status === 'ATIVO')) {
      const key = event.date;
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [data.events]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader title="CRONOGRAMA" subtitle="Calendário e atividades do condomínio" />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">Anterior</button>
            <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-slate-900">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">Próximo</button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((day) => {
              const isoDate = formatLocalDateKey(day);
              const hasEvent = eventsByDate.has(isoDate);
              const isSelected = selectedDate === isoDate;
              return (
                <button
                  key={isoDate}
                  onClick={() => setSelectedDate(isoDate)}
                  className={`aspect-square rounded-xl border p-1.5 text-left transition-all ${
                    day.getMonth() === month.getMonth() ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 text-slate-400'
                  } ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]' : ''}`}
                >
                  <div className="flex h-full flex-col items-start justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-emerald-700' : ''}`}>{day.getDate()}</span>
                    {hasEvent && <span className={`ml-auto flex h-2 w-2 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-500'}`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{formatDate(selectedDate)}</p>
          <div className="mt-3 space-y-2">
            {selectedEvents.length ? (
              selectedEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{event.event}</p>
                  <p className="mt-2 text-xs font-medium text-emerald-700">{event.startTime} — {event.endTime}</p>
                  <p className="mt-1 text-xs text-slate-600">{event.description}</p>
                </div>
              ))
            ) : (
              <EmptyState label="Nenhum evento neste dia." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function groupContactsByCategory(contacts: ContactItem[]) {
  return contacts.reduce<Record<string, ContactItem[]>>((accumulator, contact) => {
    const key = contact.function || 'Outros';
    accumulator[key] = [...(accumulator[key] ?? []), contact];
    return accumulator;
  }, {});
}

export default App;
