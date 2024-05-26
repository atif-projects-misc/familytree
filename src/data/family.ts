import { Member } from '../dag/membertype';
import { Graph } from '../dag/graph';

export class Family {
    private family: Graph;

    constructor() {
        this.family = new Graph();
    }

    public addMember(member: Member, prevMember?: Member, relationship?: number): void {
        this.family.addNode(member, member.id);
        if (prevMember && relationship)
            this.family.addEdge(member.id, prevMember.id, relationship);
    }

    public getMember(uniqueId: string): Member | undefined {
        return this.family.getNode(uniqueId)?.member;
    }

    public removeMember(uniqueId: string): void {
        this.family.removeNode(uniqueId);
    }

}