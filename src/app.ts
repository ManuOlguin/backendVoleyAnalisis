import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
import { createClient } from '@supabase/supabase-js'
import math, { MathType } from 'mathjs';
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

app.get('/pruebita', async (req, res) => {

  let { data, error } = await supabase
    .from('teams')
    .select(`
      id,
      team_number,
      team_player (
        id,
        players (
          id,
          name,
          elo
        )
      )
    `)
    .eq('match_id', 13)



  let { data: sets, error: error2 } = await supabase
    .from('sets')
    .select('*')
    .eq('match_id', 13)
    .order('id', { ascending: true });

  console.log('Sets:', sets);

  if (data && data.length > 0) {
    res.send(data);
    // promedio de los equipos
    let promedio1 = 0;
    let promedio2 = 0;
    for (let i = 1; i <= 2; i++) {

      for (let j = 0; j <= data[i - 1].team_player.length - 1; j++) {
        const playerData: any = data && data[0] && data[0].team_player && data[0].team_player[0] && typeof data[0].team_player[0].players === 'object' ? data[i - 1].team_player[j].players : null;
        console.log("Equipo " + i + ' ' + playerData.elo);

        if (i === 1) promedio1 += playerData.elo;
        else promedio2 += playerData.elo;

      }
      if (i === 1) {
        promedio1 = promedio1 / data[i - 1].team_player.length;
      } else if (i === 2) {
        promedio2 = promedio2 / data[i - 1].team_player.length;
      } else {
        console.log("Error en promedio");
        break
      }

      console.log("Promedio " + i + ' ' + (i === 1 ? promedio1 : promedio2));
      // 

      // 
    }

    let probabilidad1 = 1 / (1 + Math.pow(10, (-promedio2 + promedio1) / 400));

    let probabilidad2 = 1 / (1 + Math.pow(10, (-promedio1 + promedio2) / 400));

    console.log("Probabilidad" + ' ' + probabilidad1 + ' ' + probabilidad2);

    for (let i = 1; i <= 2; i++) {
      for (let j = 0; j <= data[i - 1].team_player.length - 1; j++) {
        const playerData: any = data && data[0] && data[0].team_player && data[0].team_player[0] && typeof data[0].team_player[0].players === 'object' ? data[i - 1].team_player[j].players : null;
        let tuvieja = playerData.elo;
        if (sets) {
          for (let k = 0; k <= sets.length - 1; k++) {
            let team1_score = sets[k].team1_score !== null ? sets[k].team1_score : 1;
            let team2_score = sets[k].team2_score !== null ? sets[k].team2_score : 1;
            let correccion = 0;
            if (i === 1) {
              correccion = Math.pow(team1_score / team2_score, 0.14);
            } else if (i === 2) {
              correccion = Math.pow(team2_score / team1_score, 0.14);
            } else {
              console.log("Error en correccion");
              break
            }
            let n = 0;
            switch (true) {
              case (i === 1 && promedio1 != promedio2):
                n = 20 * (1 + 0.9 * Math.tanh((playerData.elo - promedio1) / (Math.abs(promedio1 - promedio2) + correccion * 0.1)));
                break;
              case (i === 2 && promedio1 != promedio2):
                n = 20 * (1 + 0.9 * Math.tanh((playerData.elo - promedio2) / (Math.abs(promedio1 - promedio2) + correccion * 0.1)));
                break;
              case (promedio1 === promedio2):
                n = 20 * (1 + 0.9 * Math.tanh((playerData.elo - promedio2) / 0.14));
                break;
              default:
                console.log("Error en k");
                break;
            }
            let a = playerData.elo;
            switch (true) {
              case (i === 1 && sets[k].winner_known === 1):
                playerData.elo += n * (1 - probabilidad1);
                break;
              case (i === 2 && sets[k].winner_known === 1):
                playerData.elo += n * (0 - probabilidad2);
                break;
              case (i === 1 && sets[k].winner_known === 2):
                playerData.elo += n * (0 - probabilidad1);
                break;
              case (i === 2 && sets[k].winner_known === 2):
                playerData.elo += n * (1 - probabilidad2);
                break;
              default:
                console.log("Error en aplicar elo");
                break;
            }


            console.log('El jugador: ' + playerData.name + " con Equipo: " + i + ' ' + team1_score + ' contra ' + team2_score + ' en set numero ' + (k + 1) + ' con diferencia de elo ' + (playerData.elo - a));
          }
          console.log('El jugador: ' + playerData.name + " con Equipo: " + i + ' ' + ' con diferencia de elo global: ' + (playerData.elo - tuvieja));

        }
      }
    }
  } else {
    res.status(404).send('No players found ' + error?.message + ' ' + error2?.message);
  }
});