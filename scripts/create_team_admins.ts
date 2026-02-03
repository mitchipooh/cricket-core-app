
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- ENV SETUP ---
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: any = envContent.split('\n').reduce((acc: any, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {} as any);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEAM_NAMES = [
    "Balmain United", "Brickfield Sports", "Orangefield Sports", "Caparo Sports",
    "Centric Academy", "Countryside", "Couva Sports", "Agostini Sports",
    "Esmeralda Sports", "Ragoonanan Road Sports", "Exchange 2", "Felicity Sports",
    "Friendship Hall Sports", "Koreans Sports", "Lange Park Sports", "Line and Length",
    "Madras Divergent Academy", "Mc Bean Sports", "Petersfield Sports", "Preysal Valley Boys",
    "Renoun Sports", "Sital Felicity Youngsters", "Supersonic Sports", "Waterloo Sports"
];

async function createTeamAdmins() {
    console.log('🌱 Creating 24 Team Administrators for Central Zone...');

    const orgId = 'org-central-zone';
    let credentialsOutput = `# Central Zone Admin Credentials\n\n| Team | Role | Handle | Password |\n|------|------|--------|----------|\n`;

    const profiles: any[] = [];
    const orgMembers: any[] = [];

    TEAM_NAMES.forEach((name) => {
        const teamSlug = name.replace(/\s+/g, '').toLowerCase();
        const adminId = `user-admin-${teamSlug}`;
        const adminHandle = `@admin_${teamSlug}`;
        const adminPassword = 'password123';

        // 1. User Profile
        profiles.push({
            id: adminId,
            name: `${name} Admin`,
            handle: adminHandle,
            role: 'Administrator',
            password: adminPassword,
            createdAt: Date.now()
        });

        credentialsOutput += `| ${name} | Administrator | ${adminHandle} | ${adminPassword} |\n`;

        // 2. Org Member with Permissions
        orgMembers.push({
            userId: adminId,
            name: `${name} Admin`,
            handle: adminHandle,
            role: 'Administrator',
            addedAt: Date.now(),
            permissions: {
                canEditSquad: true,
                canSubmitReport: true,
                canScoreMatch: true,
                canViewReports: true,
                canEditScorecard: true
            }
        });
    });

    console.log('... Upserting Admin Profiles');

    const { error: profileError } = await supabase.from('user_profiles').upsert(
        profiles.map(p => ({
            id: p.id,
            name: p.name,
            handle: p.handle,
            role: p.role,
            password: p.password,
            avatar_url: p.avatarUrl,
            updated_at: new Date()
        }))
    );

    if (profileError) {
        console.error('❌ Error upserting profiles:', profileError);
        return;
    }
    console.log(`✅ Profiles: ${profiles.length}`);

    // Update Organization Members
    console.log('... Updating Organization Members');
    const { data: orgData, error: orgFetchError } = await supabase
        .from('organizations')
        .select('members')
        .eq('id', orgId)
        .single();

    if (orgFetchError) {
        console.error('❌ Error fetching organization:', orgFetchError);
        return;
    }

    const existingMembers = orgData?.members || [];
    const newMembersMap = new Map();

    // Maintain existing members
    existingMembers.forEach((m: any) => newMembersMap.set(m.userId, m));

    // Overwrite or Add new admins
    orgMembers.forEach(m => newMembersMap.set(m.userId, m));

    const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({
            members: Array.from(newMembersMap.values())
        })
        .eq('id', orgId);

    if (orgUpdateError) {
        console.error('❌ Error updating organization members:', orgUpdateError);
        return;
    }
    console.log(`✅ Organization Members Updated`);

    // Write Credentials
    fs.writeFileSync('ADMIN_CREDENTIALS.md', credentialsOutput);
    console.log('🎉 Admin Creation Complete! Credentials saved to ADMIN_CREDENTIALS.md');
}

createTeamAdmins();
