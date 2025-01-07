import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://fztuknypyqcffuqkarsc.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.listen(port, () => {
  console.log(`Backend is running on http://localhost:${port}`);
});

app.get('/api/fullPlayers', async (req, res) => {
  try {

let { data: players, error } = await supabase
  .from('players')
  .select('*')

    if (error) throw error;
    console.log('Players:', players);
    res.status(200).json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});
app.post('/api/addMatch', async (req, res) => {
  const season = 1;
  const { date, team1Players, team2Players, setsData } = req.body;
  console.log('Match data:', req.body);

  try {
    // Step 1: Insert into the matches table
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([{ date, season_id: season }])
      .select()
      .single();

    if (matchError) throw matchError;
    const match_id = matchData.id;

    // Step 2: Insert teams into the teams table
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .insert([
        { match_id, team_number: 1 },
        { match_id, team_number: 2 }
      ])
      .select();

    if (teamsError) throw teamsError;

    // Retrieve team IDs
    interface Team {
      id: number;
      match_id: number;
      team_number: number;
    }

    const team1_id: number = teamsData.find((team: Team) => team.team_number === 1)!.id;
    const team2_id: number = teamsData.find((team: Team) => team.team_number === 2)!.id;

    // Step 3: Insert players into the team_player table
    interface PlayerInsertion {
      team_id: number;
      player_id: number;
    }

    const teamPlayerInsertions = [
      ...(Array.isArray(team1Players) ? team1Players.map((player_id: number) => ({ team_id: team1_id, player_id })) : []),
      ...(Array.isArray(team2Players) ? team2Players.map((player_id: number) => ({ team_id: team2_id, player_id })) : [])
    ];
    console.log('Team player insertions:', team1Players, team2Players, teamPlayerInsertions);

    const { error: playersError } = await supabase
      .from('team_player')
      .insert(teamPlayerInsertions);

    if (playersError) throw playersError;

    // Step 4: Insert sets into the sets table
    interface SetInsertion {
      match_id: number;
      team1_score: number;
      team2_score: number;
      winner_known: number;
      ignore_for_elo: boolean;
      set_order: number;
    }

    const setInsertions: SetInsertion[] = setsData.map((set: any) => ({
      match_id,
      team1_score: set.team1Score,
      team2_score: set.team2Score,
      winner_known: set.winner === 'team1' ? 1 : 2,
      ignore_for_elo: set.ignoreforelo,
      set_order: set.setOrder
    }));

    const { error: setsError } = await supabase
      .from('sets')
      .insert(setInsertions);

    if (setsError) throw setsError;

    res.status(201).json({ message: 'Match added successfully!' });
  } catch (error) {
    console.error('Error adding match:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});


app.get('/pruebita', async (req, res) => {
  
});