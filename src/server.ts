// src/server.ts
import express, { Request, Response } from 'express';
import { connectToDatabase, getDatabase } from './services/mongodb';
import { Member } from './dag/membertype';

const app = express();
const port = 3012;

app.use(express.json());

app.post('/family', async (req: Request, res: Response) => {
    const db = getDatabase();
    const familyCollection = db.collection('FamilyTree');
    const newMember: Member = req.body;

    try {
        const result = await familyCollection.insertOne(newMember);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to insert new member' });
    }
});

app.get('/family', async (req: Request, res: Response) => {
  const db = getDatabase();
  const familyCollection = db.collection('FamilyTree');
  console.log(req);

  try {
    const members = await familyCollection.find().toArray();
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve family members' });
  }
});

connectToDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
