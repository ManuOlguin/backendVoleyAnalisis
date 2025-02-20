import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
import { createClient } from "@supabase/supabase-js";
import math, { abs, corr, MathType } from "mathjs";
const supabaseUrl = "https://fztuknypyqcffuqkarsc.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.listen(port, () => {
  console.log(`Backend is running on http://localhost:${port}`);
});



app.get("/api/fullMatches", async (req, res) => {
  try {
    let { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select(`
        id, 
        date,
        season_id,
        sets (
          id, 
          team1_score, 
          team2_score, 
          winner_known, 
          set_order,
          elo_history (
            player_id,
            change)
        ),
        teams (
          id, 
          team_number,
          team_player (
            player_id,
            players (id, name, elo)
          )
        )
      `);

    if (matchesError) throw matchesError;

    // Structure the response
    if (!matches) {
      throw new Error("No matches found");
    }


    res.status(200).json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});


app.get("/api/fullPlayers", async (req, res) => {
  try {
    let { data: players, error } = await supabase.from("players").select("*");

    if (error) throw error;
    console.log("Players:", players);
    res.status(200).json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/addMatch", async (req, res) => {
  try {
    const season = 1;
    const { date, team1Players, team2Players, setsData } = req.body;
    console.log("Match data:", req.body);
    const idMatchisto = await addMatchToDatabase(
      date,
      season,
      team1Players,
      team2Players,
      setsData
    );
    await calculateElo(idMatchisto);

    res.status(201).json({ message: "Match added successfully!" });
  } catch (error) {
    console.error("Error adding match:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/pruebita", async (req, res) => {
  try {
    await calculateElo(13);
    res.send("Elo calculation completed");
  } catch (error) {
    res.status(500).send((error as Error).message);
  }
});

async function addMatchToDatabase(
  date: string,
  season: number,
  team1Players: number[],
  team2Players: number[],
  setsData: any[]
) {

    // Step 1: Insert into the matches table
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert([{ date, season_id: season }])
      .select()
      .single();

    if (matchError) throw matchError;
    const match_id = matchData.id;

    // Step 2: Insert teams into the teams table
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .insert([
        { match_id, team_number: 1 },
        { match_id, team_number: 2 },
      ])
      .select();

    if (teamsError) throw teamsError;

    // Retrieve team IDs
    interface Team {
      id: number;
      match_id: number;
      team_number: number;
    }

    const team1_id: number = teamsData.find(
      (team: Team) => team.team_number === 1
    )!.id;
    const team2_id: number = teamsData.find(
      (team: Team) => team.team_number === 2
    )!.id;

    // Step 3: Insert players into the team_player table
    interface PlayerInsertion {
      team_id: number;
      player_id: number;
      //position
    }
    console.log("Sets data:", setsData, team1Players.indexOf(2));

    const teamPlayerInsertions = [
      ...(Array.isArray(team1Players)
      ? team1Players.map((player_id: number) => ({
        team_id: team1_id,
        player_id,
        position: setsData.map(set => {
          const pos = set.team1Positions.indexOf(player_id.toString());
          const valor = pos === 0 ? "A" : pos === 1 ? "O" : pos === 2 || pos === 3 ? "P" : pos === 4 || pos === 5 ? "C" : "";

        return pos === 0 ? "A" : pos === 1 ? "O" : pos === 2 || pos === 3 ? "P" : pos === 4 || pos === 5 ? "C" : "";
        })
      }))
      : []),
      ...(Array.isArray(team2Players)
      ? team2Players.map((player_id: number) => ({
        team_id: team2_id,
        player_id,
        position: setsData.map(set => {
          const pos = set.team2Positions.indexOf(player_id.toString());
          const valor = pos === 0 ? "A" : pos === 1 ? "O" : pos === 2 || pos === 3 ? "P" : pos === 4 || pos === 5 ? "C" : "";

        return pos === 0 ? "A" : pos === 1 ? "O" : pos === 2 || pos === 3 ? "P" : pos === 4 || pos === 5 ? "C" : "";
        })
      }))
      : []),
    ];
    console.log(
      "Team player insertions:",
      team1Players,
      team2Players,
      teamPlayerInsertions,

    );

    const { error: playersError } = await supabase
      .from("team_player")
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
      team1_score: set.team1_score,
      team2_score: set.team2_score,
      winner_known: set.winner === "team1" ? 1 : 2,
      ignore_for_elo: set.ignore_for_elo,
      set_order: set.set_order,
    }));
    console.log("Set insertions:", setInsertions);


    const { error: setsError } = await supabase
      .from("sets")
      .insert(setInsertions);

    if (setsError) throw setsError;

    return match_id;

}

async function calculateElo(matchId: number) {
  let { data, error } = await supabase
    .from("teams")
    .select(
      `
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
      `
    )
    .eq("match_id", matchId);

  let { data: sets, error: error2 } = await supabase
    .from("sets")
    .select("*")
    .eq("match_id", matchId)
    .order("id", { ascending: true });

  console.log("Sets:", sets);

  const juanito: any[] = data && data.length > 0
    ? data.flatMap(team => team.team_player.map(tp => tp.players))
    : [];


  if (data && data.length > 0) {
    if (sets) {

      const playerData: any[] = data && data.length > 0
        ? data.flatMap(team => team.team_player.map(tp => tp.players))
        : [];




      console.log("Player data:", playerData);
      const playerEloChangesGlobal: { playerId: number; eloChange: number }[] = [];

      for (let k = 0; k <= sets.length - 1; k++) {
        // pormedio
        const playerEloChanges: { playerId: number; eloChange: number }[] = [];
        let promedio1 = 0;
        let promedio2 = 0;

        for (let j = 0; j <= playerData.length - 1; j++) {
          if (j <= 5) {
            promedio1 += playerData[j].elo / 6;
            console.log("Equipo " + 1 + " " + playerData[j].elo);

          } else if (j > 5) {
            promedio2 += playerData[j].elo / 6;
            console.log("Equipo " + 2 + " " + playerData[j].elo);

          }

        }

        // pormedio
        let probabilidad1 = 1 / (1 + Math.pow(10, (-promedio2 + promedio1) / 400));
        let probabilidad2 = 1 / (1 + Math.pow(10, (-promedio1 + promedio2) / 400));

        console.log("Probabilidad" + " " + probabilidad1 + " " + probabilidad2);

        let team1_score =
          sets[k].team1_score !== null ? sets[k].team1_score : 1;
        let team2_score =
          sets[k].team2_score !== null ? sets[k].team2_score : 1;

          
        for (let j = 0; j <= playerData.length - 1; j++) {
          let correccion = 0;
          if (j <= 5) {
            correccion = Math.pow(team1_score / team2_score, 0.20);
          } else if (j > 5) {
            correccion = Math.pow(team2_score / team1_score, 0.20);
          } else {
            console.log("Error en correccion");
            break;
          }
          console.log("Team scores:", team1_score, team2_score);
          console.log("Correccion:", correccion);
          let w = 0.01;
          let n = (7 + (20 - 7) * 1 / (1 + w * Math.abs(promedio1 - promedio2))) * correccion;
          console.log("N" + " " + n);
          let tuvieja = playerData[j].elo;
          switch (true) {
            case j <= 5 && sets[k].winner_known === 1:
              playerData[j].elo += n * (1 - probabilidad1);
              break;
            case j > 5 && sets[k].winner_known === 1:
              playerData[j].elo += n * (0 - probabilidad2);
              break;
            case j <= 5 && sets[k].winner_known === 2:
              playerData[j].elo += n * (0 - probabilidad1);
              break;
            case j > 5 && sets[k].winner_known === 2:
              playerData[j].elo += n * (1 - probabilidad2);
              break;
            default:
              console.log("Error en aplicar elo");
              break;
          }

          if (j !== 5) {
            console.log(
              "El jugador: " +
              playerData[j].name +
              " con Equipo: " +
              (j <= 5 ? 1 : 2) +
              " " +
              team1_score +
              " contra " +
              team2_score +
              " en set numero " +
              (k + 1) +
              " con diferencia de elo " +
              (playerData[j].elo - tuvieja)
            );
          }
          playerEloChanges.push({
            playerId: playerData[j].id,
            eloChange: playerData[j].elo - tuvieja,
          });
            const existingChange = playerEloChangesGlobal.find(change => change.playerId === playerData[j].id);
            if (existingChange) {
            existingChange.eloChange += (playerData[j].elo - tuvieja);
            } else {
            playerEloChangesGlobal.push({
              playerId: playerData[j].id,
              eloChange: playerData[j].elo - tuvieja,
            });
            }
        }
        const eloHistoryInsertions = playerData.map(player => ({
          player_id: player.id,
          set_id: sets[k].id, // Assuming the set_id is the same for all players in this context
          change: playerEloChanges.find(playerEloChanges => playerEloChanges.playerId === player.id)?.eloChange ?? 0,
        }));
  
        const { error: eloHistoryError } = await supabase
          .from("elo_history")
          .insert(eloHistoryInsertions);
  
        if (eloHistoryError) throw eloHistoryError;
      }
      for (let j = 0; j < playerData.length; j++) {
        console.log(
          ` ELO DE :) ${playerData[j].name}: ${playerData[j].elo}`
        );
      }
      const playerUpdates = playerEloChangesGlobal.map(change => ({
        id: change.playerId,
        elo: playerData.find(player => player.id === change.playerId)?.elo ?? 0
      }));

      const { error: updateError } = await supabase
        .from("players")
        .upsert(playerUpdates, { onConflict: "id" });

      if (updateError) throw updateError;
      console.log("Player elo changes:", playerEloChangesGlobal);
    }


  }
  else {
    throw new Error(
      "No players found " + error?.message + " " + error2?.message
    );
  }
}












//Dejo esto aca porque no si si copilot trollea o no
/*let { data, error } = await supabase
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
});*/
