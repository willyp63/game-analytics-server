import request from "supertest";
import { TestDatabase, createTestEvent } from "./utils";
import { createApp } from "../app";
import { connectDB, disconnectDB } from "../db";

describe("High Scores API", () => {
  let testDb: TestDatabase;
  let app: any;

  beforeAll(async () => {
    // Start in-memory database
    testDb = new TestDatabase();
    const mongoUri = await testDb.start();
    await connectDB(mongoUri);

    // Create test app
    app = await createApp();
  });

  afterAll(async () => {
    // Stop in-memory database
    await disconnectDB();
    await testDb.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await testDb.clearCollections();
  });

  describe("POST /api/events", () => {
    it("should accept a high score event and store it", async () => {
      const event = createTestEvent({
        game: "eldritch_shores",
        player: "123-456",
        event_name: "high_score",
        data: {
          score: 1500,
          player_name: "player1",
        },
      });

      await request(app).post("/api/events").send(event).expect(201);

      // Verify the event was stored in the events collection
      const eventsCollection = testDb.getCollection("eldritch_shores_events");
      const storedEvent = await eventsCollection.findOne();
      expect(storedEvent).toBeTruthy();
      expect(storedEvent?.event_name).toBe("high_score");
      expect(storedEvent?.data.score).toBe(1500);

      // Verify the score was stored in the scores collection
      const scoresCollection = testDb.getCollection("eldritch_shores_scores");
      const storedScore = await scoresCollection.findOne();
      expect(storedScore).toBeTruthy();
      expect(storedScore?.score).toBe(1500);
      expect(storedScore?.player_name).toBe("player1");
    });

    it("should accept multiple high score events and return them sorted by score", async () => {
      const events = [
        createTestEvent({
          game: "eldritch_shores",
          mode: "classic",
          player: "123-456",
          event_name: "high_score",
          data: {
            score: 5595,
            player_name: "player1",
          },
        }),
        createTestEvent({
          game: "eldritch_shores",
          mode: "classic",
          player: "abc-def",
          event_name: "high_score",
          data: {
            score: 1000,
            player_name: "player2",
          },
        }),
        createTestEvent({
          game: "eldritch_shores",
          mode: "classic",
          player: "xyz-xyz",
          event_name: "high_score",
          data: {
            score: 1250,
            player_name: "player3",
          },
        }),
      ];

      // Post all events
      for (const event of events) {
        await request(app).post("/api/events").send(event).expect(201);
      }

      // Verify all scores were stored
      const scoresCollection = testDb.getCollection("eldritch_shores_scores");
      const allScores = await scoresCollection.find({}).toArray();
      expect(allScores).toHaveLength(3);

      // Verify high scores are sorted by score in descending order
      const highScoresResponse = await request(app)
        .get("/api/scores/eldritch_shores/classic")
        .expect(200);
      const highScores = highScoresResponse.body;
      expect(highScores).toHaveLength(3);
      expect(highScores[0].score).toBe(5595);
      expect(highScores[0].player_name).toBe("player1");
      expect(highScores[1].score).toBe(1250);
      expect(highScores[1].player_name).toBe("player3");
      expect(highScores[2].score).toBe(1000);
      expect(highScores[2].player_name).toBe("player2");
    });
  });

  it("should return empty array when no scores exist for game/mode", async () => {
    const response = await request(app)
      .get("/api/scores/whacky_wharf/classic")
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
