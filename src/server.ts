import express, { Request, Response } from 'express';
import { Member } from './dag/membertype';
import { Family } from './data/family';
import cors from 'cors';

const app = express();
const port = 3012;

const family = new Family();

app.use(express.json());
app.use(cors()); // Add this line to enable CORS


app.post('/family/addMember', async (req: Request, res: Response) => {
  const newMember: Member = req.body.member;
  const relationship: number = Number(req.body.relationship);
  newMember.generation = (newMember.generation != undefined) ? newMember.generation :
    req.body?.prevMember ? await family.getMember(req.body?.prevMember)
      .then((member) => {
        const prevGen: number = member?.generation || 0;
        return +prevGen + +relationship;
      }) :
      undefined;
  try {
    family.addMember(newMember, req.body?.prevMember, req.body?.relationship).then((_id) => {
      res.status(200).json(_id);
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to insert new member' });
  }
});

app.post('/family/addRelationship', async (req: Request, res: Response) => {
  try {
    family.addRelationship(req.query?.source, req.query?.target, req.query?.relationship).then(() => {
      res.status(200).json({ message: 'New relationship added' });
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to insert new relationship' });
  }
});

app.get(`/family/getMemberById`, async (req: Request, res: Response) => {
  try {
    family.getMember(req.query.id).then((member) => {
      if (!member) {
        res.status(404).json({ error: 'Member not found' });
      }
      res.status(200).json(member);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve family members' });
  }
});

app.get(`/family/getMemberByParam`, async (req: Request, res: Response) => {
  try {
    family.getMembersByParams(req.query.param, req.query.param_value).then((members) => {
      if (!members) {
        res.status(404).json({ error: 'Member(s) not found' });
      }
      res.status(200).json(members);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve family member' });
  }
});

app.get(`/family/getAllMembers`, async (_req: Request, res: Response) => {
  try {
    family.getAllMembers().then((nodes) => {
      if (!nodes) {
        res.status(404).json({ error: 'Members not found' });
      }
      res.status(200).json(nodes);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve family members' });
  }
});

app.get(`/family/getAllRelationships`, async (_req: Request, res: Response) => {
  try {
    family.getAllRelationships().then((edges) => {
      if (!edges) {
        res.status(404).json({ error: 'Members not found' });
      }
      res.status(200).json(edges);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve relationships' });
  }
});

app.delete(`/family/removeMember`, async (req: Request, res: Response) => {
  try {
    family.removeMember(req.query.id).then(() => {
      res.status(200).json({ message: 'Member removed' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

app.delete(`/family/removeRelationship`, async (req: Request, res: Response) => {
  try {
    family.removeRelationship(req.query.source, req.query.target).then(() => {
      res.status(200).json({ message: 'Relationship removed' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove relationship' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

