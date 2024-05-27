// src/mongodb.ts
import { MongoClient } from 'mongodb';

const uri = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);

let db: any;

export const connectToDatabase = async () => {
  if (db) {
    return;
  }
  try {
    await client.connect();
    db = client.db('local');
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
