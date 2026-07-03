export const ROLES = ['admin', 'operator', 'supplier', 'buyer'];

export function roleFromSession(session) {
  return session?.user?.app_metadata?.role ?? 'buyer';
}

export const ROUTE_GUARDS = [
  { prefix: '/admin', allowed: ['admin'] },
  { prefix: '/ops', allowed: ['admin', 'operator'] },
  { prefix: '/supplier', allowed: ['supplier', 'admin'] },
];
