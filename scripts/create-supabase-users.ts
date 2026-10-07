import process from 'node:process';

const supabaseUrl = process.env.VITE_SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase config. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY) before running this script.');
  process.exit(1);
}

const users = [
  {
    email: 'admin@villagiodilux.com.br',
    password: 'admin123',
    role: 'admin',
    full_name: 'Administrador',
    username: 'admin',
  },
  {
    email: 'sindico@villagiodilux.com.br',
    password: 'villagio-sindico',
    role: 'sindico',
    full_name: 'Síndico',
    username: 'sindico',
  },
  {
    email: 'zelador@villagiodilux.com.br',
    password: 'villagio-zelador',
    role: 'zelador',
    full_name: 'Zelador',
    username: 'zelador',
  },
  {
    email: 'morador@villagiodilux.com.br',
    password: 'villagio-morador',
    role: 'morador',
    full_name: 'Morador',
    username: 'morador',
  },
] as const;

for (const user of users) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        role: user.role,
        full_name: user.full_name,
        username: user.username,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.ok) {
    console.log(`OK: ${user.email} (${user.role})`);
    continue;
  }

  const message = typeof payload?.message === 'string' ? payload.message : 'unknown error';
  if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')) {
    console.log(`ALREADY_EXISTS: ${user.email}`);
    continue;
  }

  console.error(`FAILED: ${user.email}`);
  console.error(message);
  process.exitCode = 1;
}
