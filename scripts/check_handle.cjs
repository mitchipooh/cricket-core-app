
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkHandle() {
    const handle = '@admin_balmainunited';
    console.log(`🔍 Searching for handle: ${handle}`);

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('handle', handle);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('✅ Found:', data);
    }
}

checkHandle();
