
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load ENV
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {} as any);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
    console.log('🔍 Checking Supabase connection...\n');

    // Check if table exists and get data
    const { data, error } = await supabase
        .from('app_state')
        .select('*')
        .eq('id', 'global');

    if (error) {
        console.error('❌ Database Error:', error.message);
        console.log('\n⚠️  Make sure you ran the SQL schema in Supabase SQL Editor!');
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️  Table exists but no data found');
        console.log('Running seed script to add data...\n');
        return;
    }

    const payload = data[0].payload;
    console.log('✅ Connection successful!');
    console.log('\n📊 Database Contents:');
    console.log(`   Organizations: ${payload.orgs?.length || 0}`);

    if (payload.orgs && payload.orgs.length > 0) {
        const centralZone = payload.orgs[0];
        console.log(`   Org Name: ${centralZone.name}`);
        console.log(`   Teams: ${centralZone.memberTeams?.length || 0}`);
        console.log(`   Fixtures: ${centralZone.fixtures?.length || 0}`);
        console.log(`   Tournaments: ${centralZone.tournaments?.length || 0}`);

        if (centralZone.memberTeams && centralZone.memberTeams.length > 0) {
            console.log('\n📋 Teams in database:');
            centralZone.memberTeams.slice(0, 5).forEach((team: any, i: number) => {
                console.log(`   ${i + 1}. ${team.name} (${team.players?.length || 0} players)`);
            });
            if (centralZone.memberTeams.length > 5) {
                console.log(`   ... and ${centralZone.memberTeams.length - 5} more teams`);
            }
        }
    }

    console.log('\n✅ Database is working correctly!');
}

checkDatabase();
