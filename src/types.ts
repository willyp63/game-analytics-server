import { ObjectId, Document } from "mongodb";
import vine from "@vinejs/vine";

export interface AnalyticsQuery {
  game: string;
  pipeline: Document[];
}

export const analyticsQuerySchema = vine.object({
  game: vine.string().trim().minLength(1),
  pipeline: vine.array(vine.object({}).allowUnknownProperties()),
});

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

export const gameEventSchema = vine.object({
  game: vine.string().trim().minLength(1),
  mode: vine.string().trim().minLength(1),
  player: vine.string().trim().minLength(1),
  run: vine.string().trim().minLength(1),
  event: vine.string().trim().minLength(1),
  data: vine.object({}).allowUnknownProperties(),
  timestamp: vine.date({ formats: ["iso8601"] }),
});

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
