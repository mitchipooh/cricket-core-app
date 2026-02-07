
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

async function checkOrgSchema() {
    console.log(`🔍 Fetching org-central-zone data...`);

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', 'org-central-zone')
        .single();

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('✅ Organization DataKeys:');
        console.log(Object.keys(data));
        console.log('✅ Sample Data (truncated):');
        console.log(JSON.stringify(data, (key, value) => {
            if (Array.isArray(value) && value.length > 2) return `Array(${value.length})`;
            if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
            return value;
        }, 2));
    }
}

checkOrgSchema();
