import express, { Request, Response } from "express";

import {
  getSupportedGames,
  insertEvent,
  insertScore,
  findHighScores,
  executeAnalyticsQuery,
} from "./db";
import {
  AnalyticsQuery,
  analyticsQuerySchema,
  GameEvent,
  gameEventSchema,
  ScoreRecord,
} from "./types";
import { formatValidationErrors, validateInput } from "./validation";

// Game events endpoint
const handleEvent = async (req: Request, res: Response) => {
  try {
    const validationResult = await validateInput<GameEvent>(
      gameEventSchema,
      req.body
    );

    if (!validationResult.data) {
      const errors = formatValidationErrors(validationResult.error);
      return res.status(400).json({
        error: "Invalid event data",
        message: "Event validation failed",
        details: errors,
      });
    }

    const eventData = validationResult.data;

    // Validate game is supported
    if (!getSupportedGames().includes(eventData.game)) {
      return res.status(400).json({
        error: "Invalid game",
        message: "Game is not supported",
      });
    }

    // If the event is a high score event, insert the score into the scores collection
    const playerName = eventData.data.player_name;
    const score = eventData.data.score;
    if (
      eventData.event === "high_score" &&
      playerName &&
      typeof playerName === "string" &&
      score &&
      typeof score === "number"
    ) {
      const scoreRecord: ScoreRecord = {
        game: eventData.game,
        mode: eventData.mode,
        player: eventData.player,
        run: eventData.run,
        player_name: playerName,
        score: score,
        data: eventData.data,
        timestamp: eventData.timestamp,
      };

      await insertScore(scoreRecord);
    }

    // Insert the event into the game-specific collection
    await insertEvent(eventData);

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

const getAnalytics = async (req: Request, res: Response) => {
  const validationResult = await validateInput<AnalyticsQuery>(
    analyticsQuerySchema,
    req.body
  );

  if (!validationResult.data) {
    const errors = formatValidationErrors(validationResult.error);
    return res.status(400).json({
      error: "Invalid query data",
      message: "Query validation failed",
      details: errors,
    });
  }

  const queryData = validationResult.data;

  // Validate game is supported
  if (!getSupportedGames().includes(queryData.game)) {
    return res.status(400).json({
      error: "Invalid game",
      message: "Game is not supported",
    });
  }

  // Execute the analytics query
  const result = await executeAnalyticsQuery(
    queryData.game,
    queryData.pipeline
  );
  if (!result.success) {
    return res.status(500).json({
      error: "Database error",
      message: "Failed to execute analytics query",
    });
  }

  res.json(result.data);
};

export const createEventRoutes = () => {
  const router = express.Router();

  router.post("/events", handleEvent);
  router.get("/scores/:game/:mode", getHighScores);

  router.post("/analytics/query", getAnalytics);

  return router;
};
