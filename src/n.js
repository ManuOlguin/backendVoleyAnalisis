"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = "https://fztuknypyqcffuqkarsc.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Backend is running!");
});
app.listen(port, () => {
    console.log(`Backend is running on http://localhost:${port}`);
});
app.get("/api/fullPlayers", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { data: players, error } = yield supabase.from("players").select("*");
        if (error)
            throw error;
        console.log("Players:", players);
        res.status(200).json(players);
    }
    catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ error: error.message });
    }
}));
app.get("/api/fullMatches", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { data: matches, error: matchesError } = yield supabase
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
          set_order
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
        if (matchesError)
            throw matchesError;
        // Structure the response
        if (!matches) {
            throw new Error("No matches found");
        }
        res.status(200).json(matches);
    }
    catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ error: error.message });
    }
}));
app.get("/api/fullPlayers", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { data: players, error } = yield supabase.from("players").select("*");
        if (error)
            throw error;
        console.log("Players:", players);
        res.status(200).json(players);
    }
    catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ error: error.message });
    }
}));
app.post("/api/addMatch", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const season = 1;
        const { date, team1Players, team2Players, setsData } = req.body;
        console.log("Match data:", req.body);
        const idMatchisto = yield addMatchToDatabase(date, season, team1Players, team2Players, setsData);
        yield calculateElo(idMatchisto);
        res.status(201).json({ message: "Match added successfully!" });
    }
    catch (error) {
        console.error("Error adding match:", error);
        res.status(500).json({ error: error.message });
    }
}));
app.get("/pruebita", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield calculateElo(13);
        res.send("Elo calculation completed");
    }
    catch (error) {
        res.status(500).send(error.message);
    }
}));
function addMatchToDatabase(date, season, team1Players, team2Players, setsData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Step 1: Insert into the matches table
            const { data: matchData, error: matchError } = yield supabase
                .from("matches")
                .insert([{ date, season_id: season }])
                .select()
                .single();
            if (matchError)
                throw matchError;
            const match_id = matchData.id;
            // Step 2: Insert teams into the teams table
            const { data: teamsData, error: teamsError } = yield supabase
                .from("teams")
                .insert([
                { match_id, team_number: 1 },
                { match_id, team_number: 2 },
            ])
                .select();
            if (teamsError)
                throw teamsError;
            const team1_id = teamsData.find((team) => team.team_number === 1).id;
            const team2_id = teamsData.find((team) => team.team_number === 2).id;
            const teamPlayerInsertions = [
                ...(Array.isArray(team1Players)
                    ? team1Players.map((player_id) => ({
                        team_id: team1_id,
                        player_id,
                    }))
                    : []),
                ...(Array.isArray(team2Players)
                    ? team2Players.map((player_id) => ({
                        team_id: team2_id,
                        player_id,
                    }))
                    : []),
            ];
            console.log("Team player insertions:", team1Players, team2Players, teamPlayerInsertions);
            const { error: playersError } = yield supabase
                .from("team_player")
                .insert(teamPlayerInsertions);
            if (playersError)
                throw playersError;
            const setInsertions = setsData.map((set) => ({
                match_id,
                team1_score: set.team1Score,
                team2_score: set.team2Score,
                winner_known: set.winner === "team1" ? 1 : 2,
                ignore_for_elo: set.ignoreforelo,
                set_order: set.setOrder,
            }));
            const { error: setsError } = yield supabase
                .from("sets")
                .insert(setInsertions);
            if (setsError)
                throw setsError;
            return match_id;
        }
        catch (error) {
            throw new Error(`Error adding match: ${error.message}`);
        }
    });
}
function calculateElo(matchId) {
    return __awaiter(this, void 0, void 0, function* () {
        let { data, error } = yield supabase
            .from("teams")
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
            .eq("match_id", matchId);
        let { data: sets, error: error2 } = yield supabase
            .from("sets")
            .select("*")
            .eq("match_id", matchId)
            .order("id", { ascending: true });
        console.log("Sets:", sets);
        if (data && data.length > 0) {
            let promedio1 = 0;
            let promedio2 = 0;
            for (let i = 1; i <= 2; i++) {
                for (let j = 0; j <= data[i - 1].team_player.length - 1; j++) {
                    const playerData = data &&
                        data[0] &&
                        data[0].team_player &&
                        data[0].team_player[0] &&
                        typeof data[0].team_player[0].players === "object"
                        ? data[i - 1].team_player[j].players
                        : null;
                    console.log("Equipo " + i + " " + playerData.elo);
                    if (i === 1)
                        promedio1 += playerData.elo;
                    else
                        promedio2 += playerData.elo;
                }
                if (i === 1) {
                    promedio1 = promedio1 / data[i - 1].team_player.length;
                }
                else if (i === 2) {
                    promedio2 = promedio2 / data[i - 1].team_player.length;
                }
                else {
                    console.log("Error en promedio");
                    break;
                }
                console.log("Promedio " + i + " " + (i === 1 ? promedio1 : promedio2));
            }
            let probabilidad1 = 1 / (1 + Math.pow(10, (-promedio2 + promedio1) / 400));
            let probabilidad2 = 1 / (1 + Math.pow(10, (-promedio1 + promedio2) / 400));
            console.log("Probabilidad" + " " + probabilidad1 + " " + probabilidad2);
            for (let i = 1; i <= 2; i++) {
                for (let j = 0; j <= data[i - 1].team_player.length - 1; j++) {
                    const playerData = data &&
                        data[0] &&
                        data[0].team_player &&
                        data[0].team_player[0] &&
                        typeof data[0].team_player[0].players === "object"
                        ? data[i - 1].team_player[j].players
                        : null;
                    let tuvieja = playerData.elo;
                    if (sets) {
                        for (let k = 0; k <= sets.length - 1; k++) {
                            let team1_score = sets[k].team1_score !== null ? sets[k].team1_score : 1;
                            let team2_score = sets[k].team2_score !== null ? sets[k].team2_score : 1;
                            let correccion = 0;
                            if (i === 1) {
                                correccion = Math.pow(team1_score / team2_score, 0.14);
                            }
                            else if (i === 2) {
                                correccion = Math.pow(team2_score / team1_score, 0.14);
                            }
                            else {
                                console.log("Error en correccion");
                                break;
                            }
                            let w = 0.01;
                            let n = (7 + (20 - 7) * 1 / (1 + w * Math.abs(promedio1 - promedio2))) * correccion;
                            let a = playerData.elo;
                            switch (true) {
                                case i === 1 && sets[k].winner_known === 1:
                                    playerData.elo += n * (1 - probabilidad1);
                                    break;
                                case i === 2 && sets[k].winner_known === 1:
                                    playerData.elo += n * (0 - probabilidad2);
                                    break;
                                case i === 1 && sets[k].winner_known === 2:
                                    playerData.elo += n * (0 - probabilidad1);
                                    break;
                                case i === 2 && sets[k].winner_known === 2:
                                    playerData.elo += n * (1 - probabilidad2);
                                    break;
                                default:
                                    console.log("Error en aplicar elo");
                                    break;
                            }
                            console.log("El jugador: " +
                                playerData.name +
                                " con Equipo: " +
                                i +
                                " " +
                                team1_score +
                                " contra " +
                                team2_score +
                                " en set numero " +
                                (k + 1) +
                                " con diferencia de elo " +
                                (playerData.elo - tuvieja));
                        }
                        console.log("El jugador: " +
                            playerData.name +
                            " con Equipo: " +
                            i +
                            " " +
                            " con diferencia de elo global: " +
                            (playerData.elo - tuvieja));
                    }
                }
            }
        }
        else {
            throw new Error("No players found " + (error === null || error === void 0 ? void 0 : error.message) + " " + (error2 === null || error2 === void 0 ? void 0 : error2.message));
        }
    });
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
