import express, { Request, Response } from "express";
import {
  getSupportedGames,
  insertEvent,
  insertScore,
  findHighScores,
} from "./db";
import { ScoreRecord } from "./types";
import {
  validateGameEvent,
  validateScoreEvent,
  getValidationErrors,
} from "./validation";

// Game events endpoint
const handleEvent = async (req: Request, res: Response) => {
  try {
    const eventData = req.body;

    // Validate the event data using the new validation function
    if (!validateGameEvent(eventData)) {
      const errors = getValidationErrors(eventData, "GameEvent");
      return res.status(400).json({
        error: "Invalid event data",
        message: "Event validation failed",
        details: errors,
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
    if (validateScoreEvent(eventData)) {
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

      const scoreResult = await insertScore(scoreRecord);
      if (!scoreResult.success) {
        console.error("Failed to insert score:", scoreResult.error);
        return res.status(500).json({
          error: "Database error",
          message: "Failed to record score",
        });
      }
    }

    // Insert the event into the game-specific collection
    const eventResult = await insertEvent(eventData);
    if (!eventResult.success) {
      console.error("Failed to insert event:", eventResult.error);
      return res.status(500).json({
        error: "Database error",
        message: "Failed to record event",
      });
    }

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

  try {
    // Get the high scores for the given game and mode using type-safe function
    const result = await findHighScores(game, mode, 100);
    if (!result.success) {
      console.error("Failed to fetch high scores:", result.error);
      return res.status(500).json({
        error: "Database error",
        message: "Failed to fetch high scores",
      });
    }

    // Return the high scores
    res.json(
      (result.data || []).map((score) => ({
        player_name: score.player_name,
        score: score.score,
        timestamp: score.timestamp,
      }))
    );
  } catch (error) {
    console.error("Error fetching high scores:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch high scores",
    });
  }
};

export const createEventRoutes = () => {
  const router = express.Router();

  router.post("/events", handleEvent);
  router.get("/scores/:game/:mode", getHighScores);

  return router;
};
