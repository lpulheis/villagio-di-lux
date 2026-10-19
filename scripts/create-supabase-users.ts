import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase config. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY) before running this script.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
      app_metadata: {
        role: user.role,
        must_change_password: true,
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
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = data?.users.find((candidate) => candidate.email?.toLowerCase() === user.email);
    if (listError || !existingUser) {
      console.error(`FAILED_TO_SYNC_ROLE: ${user.email}`);
      console.error(listError?.message ?? 'Existing user not found in the first 1000 accounts.');
      process.exitCode = 1;
      continue;
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      app_metadata: {
        ...existingUser.app_metadata,
        role: user.role,
      },
    });
    if (updateError) {
      console.error(`FAILED_TO_SYNC_ROLE: ${user.email}`);
      console.error(updateError.message);
      process.exitCode = 1;
      continue;
    }

    console.log(`ROLE_SYNCED: ${user.email} (${user.role})`);
    continue;
  }

  console.error(`FAILED: ${user.email}`);
  console.error(message);
  process.exitCode = 1;
}
