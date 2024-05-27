import { Member } from '../dag/membertype';
import { Graph } from '../dag/graph';
import { ObjectId } from 'mongodb';

export class Family {

    private family: Graph;

    constructor() {
        this.family = new Graph();
    }

    public async addMember(member: Member, prevMember?: string, relationship?: number): Promise<ObjectId> {
        await this.family.initializeDatabase();
        const _id = await this.family.addNode(member);
        if (prevMember && relationship !== undefined)
            await this.family.addEdge(_id.toString(), prevMember, relationship);
        return _id;
    }

    public async removeMember(uniqueId: string): Promise<void> {
        await this.family.initializeDatabase();
        await this.family.removeNode(uniqueId);
    }

    public async addRelationship(source: string, target: string, relationship: number): Promise<void> {
        await this.family.initializeDatabase();
        await this.family.addEdge(source, target, relationship);
    }

    public async removeRelationship(source: string, target: string): Promise<void> {
        await this.family.initializeDatabase();
        await this.family.removeEdge(source, target);
    }

    public async getMember(uniqueId: string): Promise<Member | undefined> {
        await this.family.initializeDatabase();
        const node = await this.family.getNode(uniqueId);
        return node?.member;
    }

    public async getMembersByParams(param: string, param_value: string): Promise<Array<Member>> {
        await this.family.initializeDatabase();
        const nodes = await this.family.getNodebyParam(param, param_value);
        return nodes.map(node => node.member);
    }

    public async getAllMembers(): Promise<Array<Member>> {
        await this.family.initializeDatabase();
        const nodes = await this.family.getAllNodes();
        return Array.from(nodes.values()).map(node => node.member);
    }
}