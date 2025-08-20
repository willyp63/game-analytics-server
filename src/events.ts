import express, { Request, Response } from "express";
import {
  getDB,
  getEventsCollectionName,
  getScoresCollectionName,
  getSupportedGames,
} from "./db";

// Event validation interface
export interface GameEvent {
  game: string;
  mode: string;
  player: string;
  run: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// High score event validation interface
export interface HighScoreEvent extends GameEvent {
  event: "high_score";
  data: {
    score: number;
    player_name: string;
  } & Record<string, unknown>;
}

// Score database record
export interface ScoreRecord {
  game: string;
  mode: string;
  player: string;
  run: string;
  player_name: string;
  score: number;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Validate event
const validateEvent = (eventData: any): eventData is GameEvent => {
  return (
    eventData &&
    eventData.game &&
    typeof eventData.game === "string" &&
    eventData.mode &&
    typeof eventData.mode === "string" &&
    eventData.player &&
    typeof eventData.player === "string" &&
    eventData.run &&
    typeof eventData.run === "string" &&
    eventData.event &&
    typeof eventData.event === "string" &&
    eventData.data &&
    eventData.timestamp
  );
};

// Validate high score event
const validateHighScoreEvent = (
  eventData: GameEvent
): eventData is HighScoreEvent => {
  return (
    eventData.event === "high_score" &&
    !!eventData.data.score &&
    typeof eventData.data.score === "number" &&
    !!eventData.data.player_name &&
    typeof eventData.data.player_name === "string"
  );
};

// Game events endpoint
const handleEvent = async (req: Request, res: Response) => {
  try {
    const eventData = req.body;

    // Validate the event data
    if (!validateEvent(eventData)) {
      return res.status(400).json({
        error: "Invalid event data",
        message:
          "Event must include _id, game, mode, player, run, event, data, and timestamp fields",
      });
    }

    // Validate game is supported
    if (!getSupportedGames().includes(eventData.game)) {
      return res.status(400).json({
        error: "Invalid game",
        message: "Game is not supported",
      });
    }

    // If the event is a high score event, insert the score into the scores collection
    if (validateHighScoreEvent(eventData)) {
      const scoreRecord: ScoreRecord = {
        game: eventData.game,
        mode: eventData.mode,
        player: eventData.player,
        run: eventData.run,
        player_name: eventData.data.player_name,
        score: eventData.data.score,
        data: eventData.data,
        timestamp: eventData.timestamp,
      };

      const scoresCollectionName = getScoresCollectionName(eventData.game);
      await getDB().collection(scoresCollectionName).insertOne(scoreRecord);
    }

    // Insert the event into the game-specific collection
    const collectionName = getEventsCollectionName(eventData.game);
    await getDB().collection(collectionName).insertOne(eventData);

    res.status(201).json({
      message: "Event recorded successfully",
    });
  } catch (error) {
    console.error("Error processing event:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to process event",
    });
  }
};

const getHighScores = async (req: Request, res: Response) => {
  const { game, mode } = req.params;

  // Validate game is supported
  if (!getSupportedGames().includes(game)) {
    return res.status(400).json({
      error: "Invalid game",
      message: "Game is not supported",
    });
  }

  // Get the high scores for the given game and mode
  const scoresCollectionName = getScoresCollectionName(game);
  const scores = await getDB()
    .collection(scoresCollectionName)
    .find({ mode })
    .sort({ score: -1 })
    .limit(100)
    .toArray();

  // Return the high scores
  res.json(
    scores.map((score) => ({
      player_name: score.player_name,
      score: score.score,
      timestamp: score.timestamp,
    }))
  );
};

export const createEventRoutes = () => {
  const router = express.Router();

  router.post("/events", handleEvent);
  router.get("/scores/:game/:mode", getHighScores);

  return router;
};
