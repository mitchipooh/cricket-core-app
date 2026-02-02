
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

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function checkUserTables() {
    console.log('🔍 Checking User Tables in Supabase...\n');

    // 1. Check if user_profiles table exists by trying to select from it
    const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.error('❌ Table "user_profiles" DOES NOT EXIST.');
            console.log('⚠️ Please run the "user_profiles_schema.sql" script in Supabase SQL Editor.');
        } else {
            console.error('❌ Error checking table:', error.message);
        }
    } else {
        console.log('✅ Table "user_profiles" exists!');
        console.log('   (RLS policies should be active manually checked)');
    }

    // 2. Check Auth Service (simple ping)
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (!authError) {
        console.log('✅ Auth Service is responding');
    } else {
        console.error('❌ Auth Service Error:', authError.message);
    }
}

checkUserTables();
