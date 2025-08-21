import { ObjectId, Document } from "mongodb";
import Joi from "joi";

export interface AnalyticsQuery {
  game: string;
  pipeline: Document[];
}

export const analyticsQuerySchema = Joi.object({
  game: Joi.string().trim().min(1).required(),
  pipeline: Joi.array().items(Joi.object().unknown(true)).required(),
});

// Game event sent from the client
export interface GameEvent {
  game: string;
  mode?: string;
  player: string;
  run?: string;
  event_name: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export const gameEventSchema = Joi.object({
  game: Joi.string().trim().min(1).required(),
  mode: Joi.string().trim(),
  player: Joi.string().trim().min(1).required(),
  run: Joi.string().trim(),
  event_name: Joi.string().trim().min(1).required(),
  data: Joi.object().unknown(true),
  timestamp: Joi.date().iso().required(),
});

// Game event stored in the database
export interface EventRecord extends GameEvent {
  _id?: ObjectId;
}

// High score event sent from the client
export interface ScoreEvent extends GameEvent {
  event_name: "high_score";
  data: {
    score: number;
    player_name: string;
  } & Record<string, unknown>;
}

// High score record stored in the database (also stored as an event in the events collection)
export interface ScoreRecord {
  _id?: ObjectId;
  game: string;
  mode?: string;
  player: string;
  run?: string;
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
