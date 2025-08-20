import request from "supertest";
import { TestDatabase, createTestEvent } from "./utils";
import { createApp } from "../app";

describe("High Scores API", () => {
  let testDb: TestDatabase;
  let app: any;
  let originalMongoUri: string | undefined;

  beforeAll(async () => {
    // Store original MONGO_URI
    originalMongoUri = process.env.MONGO_URI;

    // Start in-memory database
    testDb = new TestDatabase();
    const mongoUri = await testDb.start();

    // Set the in-memory database URI
    process.env.MONGO_URI = mongoUri;

    // Create test app
    app = await createApp();
  });

  afterAll(async () => {
    // Restore original MONGO_URI
    if (originalMongoUri) {
      process.env.MONGO_URI = originalMongoUri;
    } else {
      delete process.env.MONGO_URI;
    }

    // Stop in-memory database
    await testDb.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await testDb.clearCollections();
  });

  describe("POST /api/events", () => {
    it("should accept a high score event and store it", async () => {
      const event = createTestEvent("tetris", "classic", "player1", 1500);

      const response = await request(app)
        .post("/api/events")
        .send(event)
        .expect(201);

      expect(response.body.message).toBe("Event recorded successfully");

      // Verify the event was stored in the events collection
      const eventsCollection = testDb.getCollection("tetris_events");
      const storedEvent = await eventsCollection.findOne({ player: "player1" });
      expect(storedEvent).toBeTruthy();
      expect(storedEvent?.event).toBe("high_score");
      expect(storedEvent?.data.score).toBe(1500);

      // Verify the score was stored in the scores collection
      const scoresCollection = testDb.getCollection("tetris_scores");
      const storedScore = await scoresCollection.findOne({ player: "player1" });
      expect(storedScore).toBeTruthy();
      expect(storedScore?.score).toBe(1500);
      expect(storedScore?.player_name).toBe("player1");
    });

    it("should accept multiple high score events from different players", async () => {
      const events = [
        createTestEvent("tetris", "classic", "player1", 1500),
        createTestEvent("tetris", "classic", "player2", 2000),
        createTestEvent("tetris", "classic", "player3", 1200),
      ];

      // Post all events
      for (const event of events) {
        await request(app).post("/api/events").send(event).expect(201);
      }

      // Verify all scores were stored
      const scoresCollection = testDb.getCollection("tetris_scores");
      const allScores = await scoresCollection.find({}).toArray();
      expect(allScores).toHaveLength(3);

      const playerNames = allScores.map((s) => s.player_name).sort();
      expect(playerNames).toEqual(["player1", "player2", "player3"].sort());
    });
  });

  describe("GET /api/scores/:game/:mode", () => {
    it("should return high scores sorted by score in descending order", async () => {
      // Post events with different scores
      const events = [
        createTestEvent("tetris", "classic", "player1", 1500),
        createTestEvent("tetris", "classic", "player2", 2000),
        createTestEvent("tetris", "classic", "player3", 1200),
        createTestEvent("tetris", "classic", "player4", 1800),
      ];

      // Post all events
      for (const event of events) {
        await request(app).post("/api/events").send(event).expect(201);
      }

      // Get high scores
      const response = await request(app)
        .get("/api/scores/tetris/classic")
        .expect(200);

      const scores = response.body;
      expect(scores).toHaveLength(4);

      // Verify scores are sorted by score in descending order
      expect(scores[0].score).toBe(2000); // player2
      expect(scores[1].score).toBe(1800); // player4
      expect(scores[2].score).toBe(1500); // player1
      expect(scores[3].score).toBe(1200); // player3

      // Verify response structure
      scores.forEach((score: any) => {
        expect(score).toHaveProperty("player_name");
        expect(score).toHaveProperty("score");
        expect(score).toHaveProperty("timestamp");
      });
    });

    it("should return empty array when no scores exist for game/mode", async () => {
      const response = await request(app)
        .get("/api/scores/tetris/classic")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should return 400 for unsupported game", async () => {
      const response = await request(app)
        .get("/api/scores/unsupported_game/classic")
        .expect(400);

      expect(response.body.error).toBe("Invalid game");
    });
  });

  describe("Integration: Post events and retrieve scores", () => {
    it("should handle complete flow of posting events and retrieving scores", async () => {
      // Post a high score event
      const event = createTestEvent("snake", "easy", "snakePlayer", 5000);

      await request(app).post("/api/events").send(event).expect(201);

      // Post another high score event
      const event2 = createTestEvent("snake", "easy", "snakePlayer2", 7500);

      await request(app).post("/api/events").send(event2).expect(201);

      // Retrieve high scores
      const response = await request(app)
        .get("/api/scores/snake/easy")
        .expect(200);

      const scores = response.body;
      expect(scores).toHaveLength(2);

      // Verify scores are sorted correctly
      expect(scores[0].score).toBe(7500);
      expect(scores[0].player_name).toBe("snakePlayer2");
      expect(scores[1].score).toBe(5000);
      expect(scores[1].player_name).toBe("snakePlayer");
    });
  });
});
