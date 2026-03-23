import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iehqjisvzsfocozglikr.supabase.co';
const supabaseAnonKey = 'sb_publishable_MRkbmMypT_H-ICCeA86rPA_TPGfePAb';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log('Test de connexion à la base de données Supabase...');
  
  const { data, error } = await supabase.from('dossiers').select('email').limit(1);

  if (error) {
    if (error.code === '42P01') {
      console.log('ERREUR ATTENDUE : La table "dossiers" n\'a pas encore été créée (relation "public.dossiers" does not exist).');
      console.log('-> Mais **VOTRE CLÉ EST VALIDE** !');
    } else {
      console.error('ERREUR inconnue de Supabase:', error);
    }
  } else {
    console.log('SUCCÈS : La table "dossiers" est bien créée et accessible ! Vos clés fonctionnent parfaitement.');
  }
}

verify();
