export type PortalRole = 'morador' | 'zelador' | 'sindico' | 'admin';

export const residentRoutes = [
  '/login',
  '/inicio',
  '/horarios',
  '/cronograma',
  '/contatos',
  '/avisos',
  '/apps',
];

export const adminRoutes = [
  '/admin',
  '/admin/dashboard',
  '/admin/contatos',
  '/admin/horarios',
  '/admin/cronograma',
  '/admin/avisos',
  '/admin/apps',
  '/admin/configuracoes',
];

const managementRoles: PortalRole[] = ['admin', 'sindico', 'zelador'];

export const getNavigationItems = (role: PortalRole | null | undefined): string[] => {
  if (role === 'admin' || role === 'sindico' || role === 'zelador') {
    return ['/admin', '/admin/contatos', '/admin/horarios', '/admin/cronograma', '/admin/avisos', '/admin/apps'];
  }

  return residentRoutes;
};

export const normalizeRoute = (value: string): string => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '/login';

  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const path = withoutHash.split('?')[0] || '/login';
  return path.startsWith('/') ? path : `/${path}`;
};

export const canAccessRoute = (role: PortalRole | null | undefined, route: string): boolean => {
  const normalized = normalizeRoute(route);

  if (normalized === '/login') {
    return false;
  }

  if (role === 'admin') {
    return [...residentRoutes, ...adminRoutes].includes(normalized) || normalized.startsWith('/admin');
  }

  if (managementRoles.includes(role as PortalRole)) {
    if (normalized === '/admin/configuracoes') {
      return false;
    }

    const allowedManagementRoutes = ['/admin', '/admin/dashboard', '/admin/contatos', '/admin/horarios', '/admin/cronograma', '/admin/avisos', '/admin/apps'];
    if (normalized.startsWith('/admin')) {
      return allowedManagementRoutes.includes(normalized);
    }

    return residentRoutes.includes(normalized) && !normalized.startsWith('/admin');
  }

  if (role === 'morador') {
    return residentRoutes.includes(normalized) && !normalized.startsWith('/admin');
  }

  return false;
};
