
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- ENV SETUP ---
const envPath = path.resolve(process.cwd(), '.env');
let envVars: any = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envVars = envContent.split('\n').reduce((acc, line) => {
        const [key, val] = line.split('=');
        if (key && val) acc[key.trim()] = val.trim();
        return acc;
    }, {} as any);
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function wipeData() {
    console.log('⚠️  STARTING DATABASE WIPE...');
    console.log('This will permanently delete all organizations, teams, matches, and players.');

    // 1. Delete Junction Tables (avoid FK constraints)
    console.log('Deleting junction tables...');
    // Use columns that definitely exist
    await supabase.from('group_teams').delete().neq('group_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tournament_teams').delete().neq('tournament_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('organization_teams').delete().neq('organization_id', '00000000-0000-0000-0000-000000000000');
    // For organization_affiliations, we assume parent_org_id or similar exists
    await supabase.from('organization_affiliations').delete().neq('parent_org_id', '00000000-0000-0000-0000-000000000000');

    // 2. Delete Dependent Tables
    console.log('Deleting dependent tables...');
    await supabase.from('tournament_groups').delete().neq('id', '0');
    await supabase.from('fixtures').delete().neq('id', '0');
    await supabase.from('roster_players').delete().neq('id', '0');
    await supabase.from('media_posts').delete().neq('id', '0');

    // 3. Delete Core Tables
    console.log('Deleting core tables...');
    await supabase.from('tournaments').delete().neq('id', '0');
    await supabase.from('teams').delete().neq('id', '0');

    // 4. Delete Top-Level Tables
    console.log('Deleting organizations...');
    await supabase.from('organizations').delete().neq('id', '0');

    // 5. Delete Legacy Tables
    console.log('Deleting legacy app_state...');
    await supabase.from('app_state').delete().neq('id', '0');

    console.log('✅ DATABASE WIPED SUCCESSFULLY.');
}

wipeData().catch(err => {
    console.error('❌ Wipe Failed:', err);
    process.exit(1);
});
