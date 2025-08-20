import { MongoClient, Db, Collection } from "mongodb";
import dotenv from "dotenv";
import { GameEvent, ScoreRecord, DatabaseResult, EventRecord } from "./types";

// Load environment variables
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error("MONGO_URI environment variable is not defined");
}

// MongoDB connection options
const mongoOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

// TODO: Move this to a collection or env variable
const SUPPORTED_GAMES = ["tetris", "snake", "pong", "breakout", "pacman"];

let client: MongoClient;
let db: Db;

export const connectDB = async () => {
  try {
    client = new MongoClient(MONGO_URI, mongoOptions);
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
    await getScoresCollection(score.game).insertOne(score);
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
