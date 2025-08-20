import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

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

// Connect to MongoDB
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

// Initialize collections for all supported games
const initializeGameCollections = async () => {
  try {
    console.log("Initializing game collections...");

    for (const game of SUPPORTED_GAMES) {
      await ensureCollectionExists(getEventsCollectionName(game));
      await ensureCollectionExists(getScoresCollectionName(game));
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

// Get the database instance
export const getDB = () => {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
};

// Check if database is connected
export const isConnected = () => {
  return client?.db() !== undefined;
};

// Get list of supported games
export const getSupportedGames = () => {
  return [...SUPPORTED_GAMES];
};

// Get the name of the events collection for a given game
export const getEventsCollectionName = (game: string) => {
  return `${game}_events`;
};

// Get the name of the scores collection for a given game
export const getScoresCollectionName = (game: string) => {
  return `${game}_scores`;
};
