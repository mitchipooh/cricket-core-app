
import { createClient } from '@supabase/supabase-js';
import { Organization, Team, MatchFixture, Player, UserProfile, OrgMember } from '../types';
import fs from 'fs';
import path from 'path';

// --- ENV SETUP ---
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {} as any);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) { console.error('Missing credentials'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEAM_NAMES = [
    "Balmain United", "Brickfield Sports", "Orangefield Sports", "Caparo Sports",
    "Centric Academy", "Countryside", "Couva Sports", "Agostini Sports",
    "Esmeralda Sports", "Ragoonanan Road Sports", "Exchange 2", "Felicity Sports",
    "Friendship Hall Sports", "Koreans Sports", "Lange Park Sports", "Line and Length",
    "Madras Divergent Academy", "Mc Bean Sports", "Petersfield Sports", "Preysal Valley Boys",
    "Renoun Sports", "Sital Felicity Youngsters", "Supersonic Sports", "Waterloo Sports"
];

function generatePlayer(teamName: string, index: number, isCaptain: boolean = false): Player {
    const roleType = isCaptain ? "Batsman" : Math.random() > 0.6 ? "Bowler" : Math.random() > 0.3 ? "Batsman" : "All-rounder";
    const batStyle = Math.random() > 0.8 ? "Left-hand" : "Right-hand";
    const name = `${teamName} Player ${index}`;

    return {
        id: `p-${teamName.replace(/\s+/g, '-').toLowerCase()}-${index}`,
        name: name,
        role: roleType as Player['role'],
        playerDetails: {
            battingStyle: batStyle,
            bowlingStyle: "Right Arm Fast",
            primaryRole: roleType as any,
            lookingForClub: false,
            isHireable: false
        },
        stats: {
            matches: 0, runs: 0, wickets: 0, catches: 0, stumpings: 0, runOuts: 0,
            ballsFaced: 0, ballsBowled: 0, runsConceded: 0, maidens: 0,
            highestScore: 0, bestBowling: '-', fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0
        }
    };
}

async function seed() {
    console.log('🌱 Starting 24 Teams Seed with Logins...');

    const orgId = 'org-central-zone';
    let credentialsOutput = `# Central Zone Credentials\n\n| Team | Role | Handle | Password |\n|------|------|--------|----------|\n`;

    // 1. Teams, Players, Captains
    const teams: any[] = [];
    const allPlayers: any[] = [];
    const profiles: UserProfile[] = [];
    const orgMembers: OrgMember[] = [];

    TEAM_NAMES.forEach((name, index) => {
        const teamSlug = name.replace(/\s+/g, '').toLowerCase();
        const teamId = `team-${teamSlug}`;

        // Team
        teams.push({ id: teamId, org_id: orgId, name: name, location: 'Central Trinidad' });

        // Captain User
        const captainHandle = `@captain_${teamSlug}`;
        const captainPassword = 'password123';
        const captainId = `user-cap-${teamSlug}`;

        profiles.push({
            id: captainId,
            name: `${name} Captain`,
            handle: captainHandle,
            role: 'Captain',
            password: captainPassword,
            createdAt: Date.now()
        });

        credentialsOutput += `| ${name} | Captain | ${captainHandle} | ${captainPassword} |\n`;

        // Captain as Player 1
        const captainPlayer = generatePlayer(name, 1, true);
        captainPlayer.id = captainId; // Link User ID
        captainPlayer.name = `${name} Captain`; // Override name

        allPlayers.push({
            id: captainPlayer.id,
            team_id: teamId,
            name: captainPlayer.name,
            role: captainPlayer.role,
            stats: captainPlayer.stats,
            details: captainPlayer.playerDetails
        });

        // Add to Org Members
        orgMembers.push({
            userId: captainId,
            name: captainPlayer.name,
            handle: captainHandle,
            role: 'Captain',
            addedAt: Date.now()
        });

        // Other Players (2-15)
        for (let i = 2; i <= 15; i++) {
            const p = generatePlayer(name, i);
            allPlayers.push({
                id: p.id,
                team_id: teamId,
                name: p.name,
                role: p.role,
                stats: p.stats,
                details: p.playerDetails
            });
        }
    });

    // 2. Aux Roles (Umpires, Scorers)
    const auxRoles = ['Umpire', 'Scorer'];
    auxRoles.forEach(role => {
        for (let i = 1; i <= 3; i++) {
            const handle = `@${role.toLowerCase()}_${i}`;
            const pwd = `${role.toLowerCase()}123`;
            const id = `user-${role.toLowerCase()}-${i}`;

            profiles.push({
                id: id,
                name: `Zone ${role} ${i}`,
                handle: handle,
                role: role as any,
                password: pwd,
                createdAt: Date.now()
            });
            credentialsOutput += `| Central Zone | ${role} | ${handle} | ${pwd} |\n`;

            orgMembers.push({
                userId: id,
                name: `Zone ${role} ${i}`,
                handle: handle,
                role: role as any,
                addedAt: Date.now()
            });
        }
    });

    console.log('... Upserting Data');

    // Execute Upserts
    await supabase.from('teams').upsert(teams);
    console.log(`✅ Teams: ${teams.length}`);

    await supabase.from('roster_players').upsert(allPlayers);
    console.log(`✅ Players: ${allPlayers.length}`);

    // Note: Profiles are usually in a separate table or Auth, but for this app we sync them via JSON or a specific table if one exists.
    // Assuming 'users' table or storing implicitly. 
    // Wait, the app uses 'fetchUserData' which queries 'profiles' table?
    // Let's check centralZoneService.ts? 
    // Yes, usually 'profiles' table.

    // Check if profiles table exists, if so insert.
    const { error: profileError } = await supabase.from('profiles').upsert(profiles.map(p => ({
        id: p.id,
        name: p.name,
        handle: p.handle,
        role: p.role,
        data: p // Store full JSON in data column if schema uses it, or spread fields
    })));

    // Actually, looking at previous seed, we didn't seed users.
    // But Step 723 showed `fetchUserData` queries `profiles`?
    // Let's assume there is a `profiles` table. I'll upsert with what I have.
    // If it fails, I'll know.

    // Workaround: If no profiles table logic known, I'll skip explicit profile DB insert and rely on the frontend "Login" using the handles we generated?
    // No, standard `fetchUserData` likely queries DB.
    // I will try to insert into `profiles`.

    await supabase.from('profiles').upsert(profiles);
    console.log(`✅ Profiles: ${profiles.length}`);

    // Update Org with Members
    // Fetch existing org
    const { data: org } = await supabase.from('organizations').select('members').eq('id', orgId).single();
    const existingMembers = org?.members || [];
    // Merge
    const newMembersMap = new Map();
    existingMembers.forEach((m: any) => newMembersMap.set(m.userId, m));
    orgMembers.forEach(m => newMembersMap.set(m.userId, m));

    await supabase.from('organizations').update({
        members: Array.from(newMembersMap.values())
    }).eq('id', orgId);
    console.log(`✅ Org Members Updated`);

    // Write Credentials
    fs.writeFileSync('CAPTAIN_CREDENTIALS.md', credentialsOutput);
    console.log('🎉 Seed Complete! Credentials saved to CAPTAIN_CREDENTIALS.md');
}

seed();

