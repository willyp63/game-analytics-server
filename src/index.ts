import { createApp, startServer } from "./app";
import { connectDB } from "./db";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
console.log("YOOOOOOOO");
console.log(MONGO_URI);
console.log(PORT);
if (!MONGO_URI) {
  throw new Error("MONGO_URI environment variable is not defined");
}

const start = async () => {
  await connectDB(MONGO_URI);
  await startServer(await createApp(), PORT);
};

start();
