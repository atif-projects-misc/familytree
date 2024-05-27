import express, { Request, Response } from 'express';
import { Member } from './dag/membertype';
import { Family } from './data/family';

const app = express();
const port = 3012;

const family = new Family();

app.use(express.json());


app.post('/family/addMember', async (req: Request, res: Response) => {
  const newMember: Member = req.body.member;
  newMember.generation = await family.getMember(req.body?.prevMember).then((member) => {
    return member?.generation + req.body?.relationship;
  });
  try {
    family.addMember(newMember, req.body?.prevMember, req.body?.relationship).then(() => {
      res.status(200).json({ message: 'New member added' });
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to insert new member' });
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



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

