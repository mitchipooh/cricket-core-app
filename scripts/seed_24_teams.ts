
import { createClient } from '@supabase/supabase-js';
import { Organization, Team, MatchFixture, Player } from '../types';
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

// --- GENERATORS ---
const FIRST_NAMES = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Henry", "Alice", "Emma", "Olivia", "Ava", "Mia", "Sophia", "Charlotte", "Amelia", "Harper", "Evelyn", "Liam", "Noah", "Oliver", "Elijah", "Lucas", "Mason", "Logan", "Ethan", "Jacob", "Mohammed", "Arjun", "Virat", "Rohit", "Steve", "Kane", "Joe", "Babar", "Pat", "Mitchell"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Gonzalez", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall", "Young", "Allen", "Sanchez", "Wright", "King", "Scott"];

const TEAM_NAMES = [
    "Balmain United", "Brickfield Sports", "Orangefield Sports", "Caparo Sports",
    "Centric Academy", "Countryside", "Couva Sports", "Agostini Sports",
    "Esmeralda Sports", "Ragoonanan Road Sports", "Exchange 2", "Felicity Sports",
    "Friendship Hall Sports", "Koreans Sports", "Lange Park Sports", "Line and Length",
    "Madras Divergent Academy", "Mc Bean Sports", "Petersfield Sports", "Preysal Valley Boys",
    "Renoun Sports", "Sital Felicity Youngsters", "Supersonic Sports", "Waterloo Sports"
];

function generatePlayer(squadNumber: number): Player {
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const roleType = Math.random() > 0.6 ? "Bowler" : Math.random() > 0.3 ? "Batsman" : "All-rounder";
    const batStyle = Math.random() > 0.8 ? "Left-hand" : "Right-hand";

    return {
        id: `p-${Math.random().toString(36).substr(2, 9)}`,
        name: `${fn} ${ln}`,
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
    console.log('🌱 Starting Relational Seed...');

    // 1. Central Zone Org
    const orgId = 'org-central-zone';
    console.log(`... Creating Org: ${orgId}`);

    await supabase.from('organizations').upsert({
        id: orgId,
        name: 'Central Zone',
        type: 'GOVERNING_BODY',
        country: 'Global',
        is_public: true,
        details: { description: 'The primary governing body for the Cricket-Core League.' }
    });

    // 2. Tournament
    const tournamentId = 'trn-summer-26';
    await supabase.from('tournaments').upsert({
        id: tournamentId,
        org_id: orgId,
        name: 'Summer Cup 2026',
        format: 'T20',
        status: 'Ongoing',
        config: { pointsConfig: { win: 2, loss: 0, tie: 1, noResult: 1 }, overs: 20 }
    });

    // 3. Teams & Players
    const teams: any[] = [];
    const allPlayers: any[] = [];

    console.log('... Generating 24 Teams & Players');

    TEAM_NAMES.forEach((name, index) => {
        const teamId = `team-${index + 1}`;
        teams.push({
            id: teamId,
            org_id: orgId,
            name: name,
            location: 'Central Trinidad'
        });

        // Generate 15 players per team
        for (let i = 0; i < 15; i++) {
            const p = generatePlayer(i + 1);
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

    // Insert Teams (Batch)
    const { error: teamError } = await supabase.from('teams').upsert(teams);
    if (teamError) console.error('Error inserting teams:', teamError);
    else console.log(`✅ Inserted ${teams.length} Teams`);

    // Insert Players (Batch - might be large, split if needed but 360 is fine)
    const { error: playerError } = await supabase.from('roster_players').upsert(allPlayers);
    if (playerError) console.error('Error inserting players:', playerError);
    else console.log(`✅ Inserted ${allPlayers.length} Players`);

    // 4. Fixtures
    const fixtures: any[] = [];
    console.log('... Generating Fixtures');

    // Round 1
    for (let i = 0; i < teams.length; i += 2) {
        if (teams[i + 1]) {
            fixtures.push({
                id: `match-r1-${i}`,
                tournament_id: tournamentId,
                team_a_id: teams[i].id,
                team_b_id: teams[i + 1].id,
                date: new Date(Date.now() + 86400000 * (i + 1)).toISOString(),
                venue: 'Central Arena',
                status: 'Scheduled'
            });
        }
    }

    // Past Match
    const teamA = teams[0];
    const teamB = teams[1];
    fixtures.push({
        id: `match-past-demo`,
        tournament_id: tournamentId,
        team_a_id: teamA.id,
        team_b_id: teamB.id,
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        venue: 'Central Arena',
        status: 'Completed',
        result: `${teamA.name} won by 10 runs`,
        winner_id: teamA.id,
        scores: {
            teamAScore: "160/5 (20.0)",
            teamBScore: "150/9 (20.0)"
        }
    });

    const { error: fixtureError } = await supabase.from('fixtures').upsert(fixtures);
    if (fixtureError) console.error('Error inserting fixtures:', fixtureError);
    else console.log(`✅ Inserted ${fixtures.length} Fixtures`);

    console.log('🎉 Relational Seed Complete!');
}

seed();
