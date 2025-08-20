import { AnalyticsQuery, GameEvent, ScoreEvent, ScoreRecord } from "./types";

export const validateAnalyticsQuery = (data: any): data is AnalyticsQuery => {
  if (!data || typeof data !== "object") return false;
  if (typeof data.game !== "string" || data.game.trim() === "") return false;
  if (typeof data.pipeline !== "object" || data.pipeline === null) return false;
  return true;
};

// Schema validation for GameEvent
export const validateGameEvent = (data: any): data is GameEvent => {
  if (!data || typeof data !== "object") return false;

  const requiredFields = [
    "game",
    "mode",
    "player",
    "run",
    "event",
    "data",
    "timestamp",
  ];
  for (const field of requiredFields) {
    if (!(field in data)) return false;
  }

  // Type checks
  if (typeof data.game !== "string" || data.game.trim() === "") return false;
  if (typeof data.mode !== "string" || data.mode.trim() === "") return false;
  if (typeof data.player !== "string" || data.player.trim() === "")
    return false;
  if (typeof data.run !== "string" || data.run.trim() === "") return false;
  if (typeof data.event !== "string" || data.event.trim() === "") return false;
  if (typeof data.data !== "object" || data.data === null) return false;
  if (!(data.timestamp instanceof Date) && isNaN(Date.parse(data.timestamp)))
    return false;

  return true;
};

// Schema validation for ScoreEvent
export const validateScoreEvent = (data: any): data is ScoreEvent => {
  if (!validateGameEvent(data)) return false;
  if (data.event !== "high_score") return false;

  // Check for required high score fields
  if (typeof data.data.score !== "number" || data.data.score < 0) return false;
  if (
    typeof data.data.player_name !== "string" ||
    data.data.player_name.trim() === ""
  )
    return false;

  return true;
};

// Schema validation for ScoreRecord
export const validateScoreRecord = (data: any): data is ScoreRecord => {
  if (!data || typeof data !== "object") return false;

  const requiredFields = [
    "game",
    "mode",
    "player",
    "run",
    "player_name",
    "score",
    "data",
    "timestamp",
  ];
  for (const field of requiredFields) {
    if (!(field in data)) return false;
  }

  // Type checks
  if (typeof data.game !== "string" || data.game.trim() === "") return false;
  if (typeof data.mode !== "string" || data.mode.trim() === "") return false;
  if (typeof data.player !== "string" || data.player.trim() === "")
    return false;
  if (typeof data.run !== "string" || data.run.trim() === "") return false;
  if (typeof data.player_name !== "string" || data.player_name.trim() === "")
    return false;
  if (typeof data.score !== "number" || data.score < 0) return false;
  if (typeof data.data !== "object" || data.data === null) return false;
  if (!(data.timestamp instanceof Date) && isNaN(Date.parse(data.timestamp)))
    return false;

  return true;
};

// Sanitize and normalize data before database insertion
export const sanitizeGameEvent = (data: any): Partial<GameEvent> => {
  const sanitized: Partial<GameEvent> = {};

  if (data.game && typeof data.game === "string") {
    sanitized.game = data.game.trim().toLowerCase();
  }

  if (data.mode && typeof data.mode === "string") {
    sanitized.mode = data.mode.trim();
  }

  if (data.player && typeof data.player === "string") {
    sanitized.player = data.player.trim();
  }

  if (data.run && typeof data.run === "string") {
    sanitized.run = data.run.trim();
  }

  if (data.event && typeof data.event === "string") {
    sanitized.event = data.event.trim();
  }

  if (data.data && typeof data.data === "object") {
    sanitized.data = data.data;
  }

  if (data.timestamp) {
    const timestamp = new Date(data.timestamp);
    if (!isNaN(timestamp.getTime())) {
      sanitized.timestamp = timestamp;
    }
  }

  return sanitized;
};

// Validation error messages
export const getValidationErrors = (
  data: any,
  type: "GameEvent" | "ScoreRecord"
): string[] => {
  const errors: string[] = [];

  if (type === "GameEvent") {
    if (
      !data.game ||
      typeof data.game !== "string" ||
      data.game.trim() === ""
    ) {
      errors.push("Game field is required and must be a non-empty string");
    }
    if (
      !data.mode ||
      typeof data.mode !== "string" ||
      data.mode.trim() === ""
    ) {
      errors.push("Mode field is required and must be a non-empty string");
    }
    if (
      !data.player ||
      typeof data.player !== "string" ||
      data.player.trim() === ""
    ) {
      errors.push("Player field is required and must be a non-empty string");
    }
    if (!data.run || typeof data.run !== "string" || data.run.trim() === "") {
      errors.push("Run field is required and must be a non-empty string");
    }
    if (
      !data.event ||
      typeof data.event !== "string" ||
      data.event.trim() === ""
    ) {
      errors.push("Event field is required and must be a non-empty string");
    }
    if (!data.data || typeof data.data !== "object" || data.data === null) {
      errors.push("Data field is required and must be an object");
    }
    if (
      !data.timestamp ||
      (isNaN(Date.parse(data.timestamp)) && !(data.timestamp instanceof Date))
    ) {
      errors.push("Timestamp field is required and must be a valid date");
    }
  } else if (type === "ScoreRecord") {
    if (
      !data.game ||
      typeof data.game !== "string" ||
      data.game.trim() === ""
    ) {
      errors.push("Game field is required and must be a non-empty string");
    }
    if (
      !data.mode ||
      typeof data.mode !== "string" ||
      data.mode.trim() === ""
    ) {
      errors.push("Mode field is required and must be a non-empty string");
    }
    if (
      !data.player ||
      typeof data.player !== "string" ||
      data.player.trim() === ""
    ) {
      errors.push("Player field is required and must be a non-empty string");
    }
    if (!data.run || typeof data.run !== "string" || data.run.trim() === "") {
      errors.push("Run field is required and must be a non-empty string");
    }
    if (
      !data.player_name ||
      typeof data.player_name !== "string" ||
      data.player_name.trim() === ""
    ) {
      errors.push(
        "Player name field is required and must be a non-empty string"
      );
    }
    if (typeof data.score !== "number" || data.score < 0) {
      errors.push("Score field is required and must be a non-negative number");
    }
    if (!data.data || typeof data.data !== "object" || data.data === null) {
      errors.push("Data field is required and must be an object");
    }
    if (
      !data.timestamp ||
      (isNaN(Date.parse(data.timestamp)) && !(data.timestamp instanceof Date))
    ) {
      errors.push("Timestamp field is required and must be a valid date");
    }
  }

  return errors;
};
