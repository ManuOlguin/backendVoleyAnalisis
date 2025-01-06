// Type for a row in the 'matches' table
export type Match = {
    date: string | null;
    id: number;
    season_id: number | null;
  };
  
  // Type for inserting a new row into the 'matches' table
  export type MatchInsert = {
    date?: string | null;
    id?: number;
    season_id?: number | null;
  };
  
  // Type for updating a row in the 'matches' table
  export type MatchUpdate = {
    date?: string | null;
    id?: number;
    season_id?: number | null;
  };
  
  // Type for a row in the 'players' table
  export type Player = {
    elo: number | null;
    id: number;
    name: string;
  };
  
  // Type for inserting a new row into the 'players' table
  export type PlayerInsert = {
    elo?: number | null;
    id?: number;
    name?: string;
  };
  
  // Type for updating a row in the 'players' table
  export type PlayerUpdate = {
    elo?: number | null;
    id?: number;
    name?: string;
  };
  
  // Type for a row in the 'seasons' table
  export type Season = {
    id: number;
    name: string | null;
  };
  
  // Type for inserting a new row into the 'seasons' table
  export type SeasonInsert = {
    id?: number;
    name?: string | null;
  };
  
  // Type for updating a row in the 'seasons' table
  export type SeasonUpdate = {
    id?: number;
    name?: string | null;
  };
  
  // Type for a row in the 'sets' table
  export type Set = {
    id: number;
    ignore_for_elo: boolean | null;
    match_id: number | null;
    set_order: number | null;
    team1_score: number | null;
    team2_score: number | null;
    winner_known: number | null;
  };
  
  // Type for inserting a new row into the 'sets' table
  export type SetInsert = {
    id?: number;
    ignore_for_elo?: boolean | null;
    match_id?: number | null;
    set_order?: number | null;
    team1_score?: number | null;
    team2_score?: number | null;
    winner_known?: number | null;
  };
  
  // Type for updating a row in the 'sets' table
  export type SetUpdate = {
    id?: number;
    ignore_for_elo?: boolean | null;
    match_id?: number | null;
    set_order?: number | null;
    team1_score?: number | null;
    team2_score?: number | null;
    winner_known?: number | null;
  };
  
  // Type for a row in the 'team_player' table
  export type TeamPlayer = {
    player_id: number | null;
    team_id: number;
  };
  
  // Type for inserting a new row into the 'team_player' table
  export type TeamPlayerInsert = {
    player_id?: number | null;
    team_id?: number;
  };
  
  // Type for updating a row in the 'team_player' table
  export type TeamPlayerUpdate = {
    player_id?: number | null;
    team_id?: number;
  };
  
  // Type for a row in the 'teams' table
  export type Team = {
    id: number;
    match_id: number | null;
    team_number: number;
  };
  
  // Type for inserting a new row into the 'teams' table
  export type TeamInsert = {
    id?: number;
    match_id?: number | null;
    team_number: number;
  };
  
  // Type for updating a row in the 'teams' table
  export type TeamUpdate = {
    id?: number;
    match_id?: number | null;
    team_number?: number;
  };