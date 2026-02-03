
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

async function findAndUpdateAdmin() {
    const adminHandle = '@cz_admin';

    console.log(`🔍 Searching for existing admin: ${adminHandle}`);

    const { data: profile, error: searchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('handle', adminHandle)
        .single();

    if (searchError || !profile) {
        console.log('⚠️ No existing profile found with this handle (or error).');
        return;
    }

    console.log(`✅ Found Profile ID: ${profile.id}`);

    // Ensure membership in Central Zone
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
    let updated = false;

    const memberIndex = members.findIndex(m => m.handle === adminHandle || m.userId === profile.id);

    if (memberIndex === -1) {
        members.push({
            userId: profile.id,
            name: profile.name,
            handle: adminHandle,
            role: 'Administrator',
            addedAt: Date.now(),
            permissions: {
                canEditSquad: true,
                canSubmitReport: true,
                canScoreMatch: true,
                canViewReports: true,
                canEditScorecard: true,
                canManageAffiliations: true,
                isSuperAdmin: true
            }
        });
        updated = true;
    } else {
        // Update permissions for existing member
        members[memberIndex].permissions = {
            ...members[memberIndex].permissions,
            canManageAffiliations: true,
            isSuperAdmin: true
        };
        updated = true;
    }

    if (updated) {
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ members })
            .eq('id', orgId);

        if (updateError) {
            console.error('❌ Update Org Error:', updateError);
        } else {
            console.log('✅ Org members updated with super-admin permissions.');
        }
    }
}

findAndUpdateAdmin();
