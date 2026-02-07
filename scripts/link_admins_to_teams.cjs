
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

async function linkAdmins() {
    const orgId = 'org-central-zone';
    console.log(`🔗 Linking admins for organization: ${orgId}`);

    const { data: org, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

    if (fetchError || !org) {
        console.error('❌ Fetch Org Error:', fetchError);
        return;
    }

    let members = org.members || [];
    const teams = org.memberTeams || [];

    console.log(`📊 Found ${members.length} members and ${teams.length} teams.`);

    let updatedCount = 0;

    members = members.map(member => {
        if (member.handle && member.handle.startsWith('@admin_')) {
            const teamSlug = member.handle.replace('@admin_', '');

            const matchedTeam = teams.find(t => {
                const calculatedSlug = t.name.replace(/\s+/g, '').toLowerCase();
                return calculatedSlug === teamSlug;
            });

            if (matchedTeam) {
                console.log(`✅ Linked ${member.handle} to team "${matchedTeam.name}" (${matchedTeam.id})`);
                updatedCount++;
                return {
                    ...member,
                    managedTeamId: matchedTeam.id
                };
            } else {
                console.log(`⚠️ No team found for admin: ${member.handle} (Slug: ${teamSlug})`);
            }
        }
        return member;
    });

    const updatedDetails = {
        ...(org.details || {}),
        allowMemberEditing: true
    };

    const { error: updateError } = await supabase
        .from('organizations')
        .update({
            members,
            details: updatedDetails
        })
        .eq('id', orgId);

    if (updateError) {
        console.error('❌ Update Error:', updateError);
    } else {
        console.log(`✨ Successfully linked ${updatedCount} admins and enabled global editing in details.`);
    }
}

linkAdmins();
