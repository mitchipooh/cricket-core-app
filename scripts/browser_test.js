
// Add this to the browser console to manually trigger sync
// and see what data comes back:

import { supabase } from './lib/supabase';

async function testSync() {
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase
        .from('app_state')
        .select('payload')
        .eq('id', 'global')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Success! Data:', data);
    console.log('Teams:', data.payload.orgs[0].memberTeams.length);
}

testSync();
