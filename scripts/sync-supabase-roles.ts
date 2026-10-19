import process from 'node:process';
import { createClient, type User } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Supabase config is missing. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const profiles = [
  { email: 'admin@villagiodilux.com.br', role: 'admin' },
  { email: 'sindico@villagiodilux.com.br', role: 'sindico' },
  { email: 'zelador@villagiodilux.com.br', role: 'zelador' },
  { email: 'morador@villagiodilux.com.br', role: 'morador' },
] as const;

const listUsers = async () => {
  const users: User[] = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
};

try {
  const users = await listUsers();

  for (const profile of profiles) {
    const user = users.find((candidate) => candidate.email?.toLowerCase() === profile.email);
    if (!user) {
      console.log(`SKIPPED: ${profile.email} does not exist; no account was created.`);
      continue;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        role: profile.role,
      },
    });
    if (error) {
      console.error(`FAILED: Could not synchronize ${profile.email}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    console.log(`ROLE_SYNCED: ${profile.email} (${profile.role}); password unchanged.`);
  }
} catch (error) {
  console.error('Failed to synchronize Supabase roles:', error);
  process.exitCode = 1;
}
