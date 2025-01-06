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

