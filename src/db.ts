import { MongoClient, Db, Collection, Document } from "mongodb";

import { GameEvent, ScoreRecord, DatabaseResult, EventRecord } from "./types";

// MongoDB connection options
const mongoOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

// TODO: Move this to a collection or env variable
const SUPPORTED_GAMES = [
  "eldritch_shores",
  "whacky_wharf",
  "collapse_protocol",
  "gundig",
];

let client: MongoClient;
let db: Db;

export const connectDB = async (mongoUri: string) => {
  try {
    client = new MongoClient(mongoUri, mongoOptions);
    await client.connect();

    db = client.db();
    console.log(`MongoDB Connected: ${client.db().databaseName}`);

    // Initialize game collections
    await initializeGameCollections();

    // Handle connection events
    client.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    client.on("close", () => {
      console.log("MongoDB connection closed");
    });

    client.on("reconnect", () => {
      console.log("MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        await client.close();
        console.log("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        console.error("Error during MongoDB connection closure:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await client.close();
};

const initializeGameCollections = async () => {
  try {
    console.log("Initializing game collections...");

    for (const game of SUPPORTED_GAMES) {
      await ensureCollectionExists(getEventsCollectionName(game));
      await ensureCollectionExists(getScoresCollectionName(game));

      // Create indexes for better performance
      await createCollectionIndexes(game);
    }

    console.log("Game collections initialized successfully");
  } catch (error) {
    console.error("Error initializing game collections:", error);
    throw error;
  }
};

const ensureCollectionExists = async (collectionName: string) => {
  // Check if collection exists, create if it doesn't
  const collections = await db
    .listCollections({ name: collectionName })
    .toArray();
  if (collections.length === 0) {
    await db.createCollection(collectionName);
    console.log(`Created collection: ${collectionName}`);
  } else {
    console.log(`Collection already exists: ${collectionName}`);
  }
};

const createCollectionIndexes = async (game: string) => {
  try {
    // Events collection indexes
    const eventsCollection = getEventsCollection(game);
    await eventsCollection.createIndex({ mode: 1 });
    await eventsCollection.createIndex({ timestamp: -1 });

    // Scores collection indexes
    const scoresCollection = getScoresCollection(game);
    await scoresCollection.createIndex({ mode: 1 });
    await scoresCollection.createIndex({ score: -1 });

    console.log(`Indexes created for ${game} collections`);
  } catch (error) {
    console.error(`Error creating indexes for ${game}:`, error);
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
};

export const getSupportedGames = () => {
  return [...SUPPORTED_GAMES];
};

export const getEventsCollectionName = (game: string) => {
  return `${game}_events`;
};

export const getScoresCollectionName = (game: string) => {
  return `${game}_scores`;
};

export const getEventsCollection = (game: string): Collection<EventRecord> => {
  return getDB().collection<GameEvent>(getEventsCollectionName(game));
};

export const getScoresCollection = (game: string): Collection<ScoreRecord> => {
  return getDB().collection<ScoreRecord>(getScoresCollectionName(game));
};

export const insertEvent = async (
  event: GameEvent
): Promise<DatabaseResult<void>> => {
  try {
    await getEventsCollection(event.game).insertOne(event);
    return { success: true };
  } catch (error) {
    console.error(`Error inserting event for ${event.game}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const insertScore = async (
  score: ScoreRecord
): Promise<DatabaseResult<void>> => {
  try {
    const scoresCollection = getScoresCollection(score.game);

    // override any old records for this run
    await scoresCollection.deleteMany({ run: score.run });
    await scoresCollection.insertOne(score);

    return { success: true };
  } catch (error) {
    console.error(`Error inserting score for ${score.game}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const findHighScores = async (
  game: string,
  mode: string,
  limit: number = 100
): Promise<DatabaseResult<ScoreRecord[]>> => {
  try {
    const collection = getScoresCollection(game);
    const scores = await collection
      .find({ mode })
      .sort({ score: -1 })
      .limit(limit)
      .toArray();
    return { success: true, data: scores };
  } catch (error) {
    console.error(`Error finding scores by mode for ${game}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Safe MongoDB query execution
const ALLOWED_OPERATIONS = [
  "$match",
  "$group",
  "$sort",
  "$limit",
  "$project",
  "$lookup",
  "$unwind",
  "$addFields",
  "$set",
  "$count",
];

// Filter out dangerous operations like $out, $merge, $geoNear, $text
const DANGEROUS_OPERATIONS = [
  "$out",
  "$merge",
  "$geoNear",
  "$text",
  "$indexStats",
  "$collStats",
  "$currentOp",
  "$listLocalSessions",
];

// Maximum pipeline stages to prevent overly complex queries
const MAX_PIPELINE_STAGES = 10;

// Maximum limit value to prevent memory issues
const MAX_LIMIT = 1000;

// Maximum group size to prevent memory issues
const MAX_GROUP_SIZE = 10000;

export const sanitizePipeline = (pipeline: Document[]): Document[] => {
  let sanitizedPipeline: Document[] = [];
  let hasLimit = false;
  let hasSort = false;

  // Filter and validate each pipeline stage
  for (let i = 0; i < Math.min(pipeline.length, MAX_PIPELINE_STAGES); i++) {
    const stage = pipeline[i];
    const stageKey = Object.keys(stage)[0];

    // Skip dangerous operations
    if (DANGEROUS_OPERATIONS.includes(stageKey)) {
      console.warn(
        `Dangerous operation ${stageKey} filtered out from pipeline`
      );
      continue;
    }

    // Validate allowed operations
    if (!ALLOWED_OPERATIONS.includes(stageKey)) {
      console.warn(
        `Unsupported operation ${stageKey} filtered out from pipeline`
      );
      continue;
    }

    // Special handling for $limit stage
    if (stageKey === "$limit") {
      const limitValue = (stage as any)[stageKey];
      if (
        typeof limitValue === "number" &&
        limitValue > 0 &&
        limitValue <= MAX_LIMIT
      ) {
        sanitizedPipeline.push(stage);
        hasLimit = true;
      } else {
        // Replace with safe limit
        sanitizedPipeline.push({
          $limit: Math.min(limitValue || 100, MAX_LIMIT),
        } as Document);
        hasLimit = true;
      }
      continue;
    }

    // Special handling for $sort stage
    if (stageKey === "$sort") {
      const sortFields = Object.keys((stage as any)[stageKey]);
      if (sortFields.length <= 5) {
        // Limit sort fields to prevent memory issues
        sanitizedPipeline.push(stage);
        hasSort = true;
      } else {
        // Take only first 5 sort fields
        const limitedSort: Record<string, any> = {};
        sortFields.slice(0, 5).forEach((field) => {
          limitedSort[field] = (stage as any)[stageKey][field];
        });
        sanitizedPipeline.push({ $sort: limitedSort } as Document);
        hasSort = true;
      }
      continue;
    }

    // Special handling for $group stage
    if (stageKey === "$group") {
      const groupStage = (stage as any)[stageKey];
      // Add $limit to group results if not present
      if (!hasLimit) {
        sanitizedPipeline.push(stage);
        sanitizedPipeline.push({ $limit: MAX_GROUP_SIZE } as Document);
        hasLimit = true;
      } else {
        sanitizedPipeline.push(stage);
      }
      continue;
    }

    // Special handling for $lookup stage (limit to prevent cartesian products)
    if (stageKey === "$lookup") {
      const lookupStage = (stage as any)[stageKey];
      // Add pipeline to limit lookup results
      if (!lookupStage.pipeline) {
        lookupStage.pipeline = [{ $limit: 1000 }];
      } else if (Array.isArray(lookupStage.pipeline)) {
        // Ensure lookup pipeline has a limit
        const hasLookupLimit = lookupStage.pipeline.some(
          (s: any) => Object.keys(s)[0] === "$limit"
        );
        if (!hasLookupLimit) {
          lookupStage.pipeline.push({ $limit: 1000 });
        }
      }
      sanitizedPipeline.push(stage);
      continue;
    }

    // Add all other valid stages
    sanitizedPipeline.push(stage);
  }

  // Add automatic $limit if none specified to prevent runaway queries
  if (!hasLimit) {
    sanitizedPipeline.push({ $limit: 1000 } as Document);
  }

  // Add $allowDiskUse: false to prevent disk usage for large operations
  if (hasSort && sanitizedPipeline.length > 0) {
    // MongoDB will automatically use disk if sort exceeds memory, but we can warn
    console.log(
      "Sort operation detected - ensure adequate memory for operation"
    );
  }

  return sanitizedPipeline;
};

// Helper function to execute a sanitized aggregation pipeline
export const executeAnalyticsQuery = async (
  game: string,
  pipeline: Document[]
): Promise<DatabaseResult<Document[]>> => {
  try {
    // Sanitize the pipeline before execution
    const sanitizedPipeline = sanitizePipeline(pipeline);

    // Execute the sanitized pipeline
    const results = await getEventsCollection(game)
      .aggregate(sanitizedPipeline)
      .toArray();

    return { success: true, data: results };
  } catch (error) {
    console.error(`Error executing analytics query for ${game}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
