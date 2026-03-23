import pkg from 'pg';
const { Client } = pkg;

// Use the password 'Hunter469@2025#' with URL encoding: %40 for @, %23 for #
const connectionString = 'postgresql://postgres:Hunter469%402025%23@db.iehqjisvzsfocozglikr.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function setup() {
  try {
    await client.connect();
    console.log('Connecté à Supabase Postgres.');

    const sql = `
      create table if not exists public.dossiers (
        id uuid default gen_random_uuid() primary key,
        email text unique not null,
        data jsonb,
        created_at timestamp with time zone default timezone('utc'::text, now()) not null
      );
    `;

    await client.query(sql);
    console.log('SUCCÈS : Table "dossiers" créée avec succès dans la base de données !');
  } catch (err) {
    console.error('Erreur SQL :', err);
  } finally {
    await client.end();
  }
}

setup();
