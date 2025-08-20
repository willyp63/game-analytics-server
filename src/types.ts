import { ObjectId, Document } from "mongodb";

export interface AnalyticsQuery {
  game: string;
  pipeline: Document[];
}

// Game event sent from the client
export interface GameEvent {
  game: string;
  mode: string;
  player: string;
  run: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Game event stored in the database
export interface EventRecord extends GameEvent {
  _id?: ObjectId;
}

// High score event sent from the client
export interface ScoreEvent extends GameEvent {
  event: "high_score";
  data: {
    score: number;
    player_name: string;
  } & Record<string, unknown>;
}

// High score record stored in the database (also stored as an event in the events collection)
export interface ScoreRecord {
  _id?: ObjectId;
  game: string;
  mode: string;
  player: string;
  run: string;
  player_name: string;
  score: number;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Database operation result
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
