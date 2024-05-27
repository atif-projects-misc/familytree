// src/mongodb.ts
import { MongoClient } from 'mongodb';
import { Settings } from '../Settings';

const client = new MongoClient(Settings.MongoDbUrl);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

export const connectToDatabase = async () => {
  if (db) {
    return;
  }
  try {
    await client.connect();
    db = client.db(Settings.dbName);
    console.log('Connected to database');
  } catch (error) {
    console.error('Could not connect to database', error);
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Must connect to database first');
  }
  return db;
};
