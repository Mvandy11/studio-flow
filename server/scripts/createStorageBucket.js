import { supabase } from '../supabase/client.js';

async function setup() {
  const { error } = await supabase.storage.createBucket('identities', { public: true });
  if (error && !error.message.includes('already exists')) {
    console.error('Bucket error:', error.message);
  } else {
    console.log('✅ identities bucket ready');
  }
}
setup();
