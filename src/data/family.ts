import { Member } from '../dag/membertype';
import { Graph } from '../dag/graph';

export class Family {
    private family: Graph;

    constructor() {
        this.family = new Graph();
    }

    public async addMember(member: Member, prevMember?: string, relationship?: number): Promise<void> {
        await this.family.initializeDatabase();
        await this.family.addNode(member, member._id);
        if (prevMember && relationship !== undefined)
            await this.family.addEdge(member._id, prevMember, relationship);
    }

    public async addRelationship(source: string, target: string, relationship: number): Promise<void> {
        await this.family.initializeDatabase();
        await this.family.addEdge(source, target, relationship);
    }

    public async getMember(uniqueId: string): Promise<Member | undefined> {
        await this.family.initializeDatabase();
        const node = await this.family.getNode(uniqueId);
        return node?.member;
    }

    public async getMembersByName(param: string, param_value: string): Promise<Array<Member>> {
        await this.family.initializeDatabase();
        const nodes = await this.family.getNodebyParam(param, param_value);
        return nodes.map(node => node.member);
    }

    public async removeMember(uniqueId: string): Promise<void> {
        await this.family.initializeDatabase();
        this.family.removeNode(uniqueId);
    }
}