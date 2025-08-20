import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";
import express from "express";
import { createEventRoutes } from "../events";

export class TestDatabase {
  private mongoServer: MongoMemoryServer;
  private client: MongoClient;
  public db: Db;

  constructor() {
    this.mongoServer = null as any;
    this.client = null as any;
    this.db = null as any;
  }

  async start(): Promise<string> {
    // Start the in-memory MongoDB server
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();

    // Connect to the in-memory database
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db("test");

    return uri;
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  async clearCollections(): Promise<void> {
    if (!this.db) return;

    const collections = await this.db.listCollections().toArray();
    for (const collection of collections) {
      await this.db.collection(collection.name).deleteMany({});
    }
  }

  getCollection(name: string) {
    return this.db.collection(name);
  }
}

export function createTestEvent(
  game: string = "tetris",
  mode: string = "classic",
  player: string = "testPlayer",
  score: number = 1000
) {
  return {
    game,
    mode,
    player,
    run: "test-run-1",
    event: "high_score",
    data: {
      score,
      player_name: player,
    },
    timestamp: new Date().toISOString(),
  };
}
