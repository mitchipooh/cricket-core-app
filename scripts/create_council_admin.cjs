
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

async function createCouncilAdmin() {
    const adminId = 'cz-official-admin';
    const adminHandle = '@cz_admin';
    const adminPassword = 'password123';

    console.log(`🚀 Creating Official Council Admin: ${adminHandle}`);

    // 1. Upsert Profile
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            id: adminId,
            name: 'Central Zone Council Admin',
            handle: adminHandle,
            role: 'Administrator',
            password: adminPassword,
            created_at: new Date().toISOString()
        });

    if (profileError) {
        console.error('❌ Profile Error:', profileError);
        return;
    }

    // 2. Ensure Membership in Central Zone
    const orgId = 'org-central-zone';
    const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('members')
        .eq('id', orgId)
        .single();

    if (fetchError || !orgData) {
        console.error('❌ Fetch Org Error:', fetchError);
        return;
    }

    let members = orgData.members || [];
    if (!members.some(m => m.handle === adminHandle)) {
        members.push({
            userId: adminId,
            name: 'Central Zone Council Admin',
            handle: adminHandle,
            role: 'Administrator',
            addedAt: Date.now(),
            permissions: {
                canEditSquad: true,
                canSubmitReport: true,
                canScoreMatch: true,
                canViewReports: true,
                canEditScorecard: true,
                canManageAffiliations: true, // Special permission for them
                isSuperAdmin: true // Tag for UI checks
            }
        });

        const { error: updateError } = await supabase
            .from('organizations')
            .update({ members })
            .eq('id', orgId);

        if (updateError) {
            console.error('❌ Update Org Error:', updateError);
        } else {
            console.log('✅ Added to org members.');
        }
    } else {
        console.log('ℹ️ Already an org member.');
    }

    console.log('✨ Success!');
}

createCouncilAdmin();
