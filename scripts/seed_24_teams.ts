
import { createClient } from '@supabase/supabase-js';
import { Organization, Team, MatchFixture, Player, Tournament } from '../types';
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

const COLORS = [
    "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#059669", "#0d9488",
    "#0891b2", "#0284c7", "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3", "#db2777",
    "#e11d48", "#1f2937", "#4b5563", "#9ca3af", "#b91c1c", "#c2410c", "#a16207", "#4d7c0f"
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
            matches: 0,
            runs: 0,
            wickets: 0,
            catches: 0,
            stumpings: 0,
            runOuts: 0,
            ballsFaced: 0,
            ballsBowled: 0,
            runsConceded: 0,
            maidens: 0,
            highestScore: 0,
            bestBowling: '-',
            fours: 0,
            sixes: 0,
            hundreds: 0,
            fifties: 0,
            ducks: 0,
            threeWickets: 0,
            fiveWickets: 0
        }
    };
}

async function seed() {
    console.log('🌱 Generating 24 Teams for Central Zone...');

    const teams: Team[] = TEAM_NAMES.map((name, index) => {
        const players: Player[] = Array.from({ length: 15 }, (_, i) => generatePlayer(i + 1));
        return {
            id: `team-${index + 1}`,
            name: name,
            players: players
        };
    });

    console.log(`✅ Generated ${teams.length} teams.`);

    // --- FIXTURES ---
    const fixtures: MatchFixture[] = [];
    const tournamentId = 'trn-summer-26';

    // Create 12 matches (Round 1)
    for (let i = 0; i < teams.length; i += 2) {
        if (teams[i + 1]) {
            fixtures.push({
                id: `match-r1-${i}`,
                date: new Date(Date.now() + 86400000 * (i + 1)).toISOString(),
                teamAId: teams[i].id,
                teamBId: teams[i + 1].id,
                teamAName: teams[i].name,
                teamBName: teams[i + 1].name,
                venue: 'Central Arena',
                status: 'Scheduled', // Correct Literal
                tournamentId: tournamentId
            });
        }
    }

    // Add a completed/past match for demo
    const teamA = teams[0];
    const teamB = teams[1];
    fixtures.push({
        id: `match-past-demo`,
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        venue: 'Central Arena',
        status: 'Completed',
        tournamentId: tournamentId,
        result: `${teamA.name} won by 10 runs`,
        winnerId: teamA.id,
        teamAScore: "160/5 (20.0)",
        teamBScore: "150/9 (20.0)"
    });


    // --- CENTRAL ZONE ---
    const centralZone: Organization = {
        id: 'org-central-zone',
        name: 'Central Zone',
        type: 'GOVERNING_BODY',
        country: 'Global',
        isPublic: true,
        allowUserContent: true,
        tournaments: [{
            id: tournamentId,
            name: 'Summer Cup 2026',
            format: 'T20',
            groups: [],
            pointsConfig: { win: 2, loss: 0, tie: 1, noResult: 1 },
            overs: 20,
            status: 'Ongoing'
        }],
        groups: [],
        memberTeams: teams,
        fixtures: fixtures,
        members: [],
        applications: []
    };

    // --- PUSH ---
    console.log('🚀 Pushing 24 Teams to Supabase...');
    const payload = {
        orgs: [centralZone],
        standaloneMatches: [],
        mediaPosts: []
    };

    const { error } = await supabase
        .from('app_state')
        .upsert({ id: 'global', payload: payload, updated_at: new Date() });

    if (error) {
        console.error('❌ Sync Failed:', error);
    } else {
        console.log('✅ 24 Teams Loaded Successfully!');
    }
}

seed();
