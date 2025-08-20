import express, { Request, Response } from "express";

import { connectDB } from "./db";
import { createEventRoutes } from "./events";

export const createApp = async () => {
  const app = express();
  const port = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Use event routes
  app.use("/api", createEventRoutes());

  await startServer(app, port);

  return app;
};

// Start server and connect to database
const startServer = async (app: express.Application, port: number | string) => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
