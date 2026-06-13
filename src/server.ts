import 'dotenv/config';
import express, { Request, Response } from 'express';
import { Member } from './dag/membertype';
import { Relationship } from './dag/relationshiptype';
import { Family } from './data/family';
import { Settings } from './Settings';
import cors from 'cors';

const app = express();
const port = Settings.port;

const family = new Family();

app.use(express.json());
app.use(cors()); // Add this line to enable CORS


app.post('/family/addMember', async (req: Request, res: Response) => {
  const newMember: Member = req?.body;
  if (!newMember || !newMember.title || !newMember.sex) {
    res.status(400).json({ error: 'Member requires at least a title and sex' });
    return;
  }
  try {
    const _id = await family.addMember(newMember);
    res.status(200).json(_id);
  } catch (error) {
    res.status(500).json({ error: 'Failed to insert new member' });
  }
});

app.put('/family/updateMember', async (req: Request, res: Response) => {
  const id = req.query.id as string;
  const updatedMember: Member = req?.body;
  if (!id) {
    res.status(400).json({ error: 'Member id not provided' });
    return;
  }
  try {
    await family.updateMember(id, updatedMember);
    res.status(200).json({ message: 'Member updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

app.post('/family/addRelationship', async (req: Request, res: Response) => {
  const newRelationships: Relationship[] = req?.body;
  if (!Array.isArray(newRelationships) || newRelationships.length === 0) {
    res.status(400).json({ error: 'Relationships not provided' });
    return;
  }
  try {
    await family.addRelationship(newRelationships);
    res.status(200).json({ message: 'New relationship added' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to insert new relationship' });
  }
});

app.get(`/family/getMemberById`, async (req: Request, res: Response) => {
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: 'Member id not provided' });
    return;
  }
  try {
    const member = await family.getMember(id);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve family members' });
  }
});

app.get(`/family/getMemberByParam`, async (req: Request, res: Response) => {
  const param = req.query.param as string;
  const paramValue = req.query.param_value as string;
  if (!param || paramValue === undefined) {
    res.status(400).json({ error: 'param and param_value are required' });
    return;
  }
  try {
    const members = await family.getMembersByParams(param, paramValue);
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve family member' });
  }
});

app.get(`/family/getAllMembers`, async (_req: Request, res: Response) => {
  try {
    const nodes = await family.getAllMembers();
    res.status(200).json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve family members' });
  }
});

app.get(`/family/getAllRelationships`, async (_req: Request, res: Response) => {
  try {
    const edges = await family.getAllRelationships();
    res.status(200).json(edges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve relationships' });
  }
});

app.delete(`/family/removeMember`, async (req: Request, res: Response) => {
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: 'Member id not provided' });
    return;
  }
  try {
    await family.removeMember(id);
    res.status(200).json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

app.delete(`/family/removeRelationship`, async (req: Request, res: Response) => {
  const source = req.query.source as string;
  const target = req.query.target as string;
  if (!source || !target) {
    res.status(400).json({ error: 'source and target are required' });
    return;
  }
  try {
    await family.removeRelationship(source, target);
    res.status(200).json({ message: 'Relationship removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove relationship' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

