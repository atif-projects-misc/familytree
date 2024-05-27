import { Member } from '../dag/membertype';
import { Graph } from '../dag/graph';

export class Family {
    private family: Graph;

    constructor() {
        this.family = new Graph();
    }

    public async addMember(member: Member, prevMember?: Member, relationship?: number): Promise<void> {
        await this.family.initializeDatabase();
        this.family.addNode(member, member._id);
        if (prevMember && relationship)
            this.family.addEdge(member._id, prevMember._id, relationship);
    }

    public async getMember(uniqueId: string): Promise<Member | undefined> {
        await this.family.initializeDatabase();
        const node = await this.family.getNode(uniqueId);
        return node?.member;
    }

    public async removeMember(uniqueId: string): Promise<void> {
        await this.family.initializeDatabase();
        this.family.removeNode(uniqueId);
    }
}