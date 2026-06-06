import { Member } from '../dag/membertype';
import { Edge, Graph, Node } from '../dag/graph';
import { Relationship } from '../dag/relationshiptype';

export class Family {

    private family: Graph;

    constructor() {
        this.family = new Graph();
    }

    public async addMember(member: Member): Promise<String | undefined> {
        await this.family.initializeDatabase();
        const _id = await this.family.addNode(member);
        return _id;
    }

    public async removeMember(uniqueId: string): Promise<void> {
        await this.family.initializeDatabase();
        await this.family.removeNode(uniqueId);
    }

    public async updateMember(uniqueId: string, member: Member): Promise<void> {
        await this.family.initializeDatabase();
        await this.family.updateNode(uniqueId, member);
    }

    public async addRelationship(relationships: Relationship[]): Promise<void> {
        await this.family.initializeDatabase();
        for (const relationship of relationships) {
            await this.family.addEdge(relationship);
        }
        // When a parent/child link is created, every other child of that
        // parent becomes a sibling of the newly attached child. Sibling links
        // are intentionally not drawn as edges in the graph; they only exist
        // so the layout can place siblings in the same generation.
        
        await this.deriveSiblingRelationships(relationships);
        
        // When a spouse (partner) link is created, the partner's existing
        // children are NOT automatically the spouse's children. We instead
        // create an "unknown" placeholder relation between the spouse and each
        // of the partner's children so they remain visible and can be amended
        // later (e.g. promoted to step/adoptive parent).
        
        await this.deriveSpouseChildRelationships(relationships);
    }

    /**
     * Returns the parent and child ids of an inner-family relationship,
     * or null if the relationship is not a parent/child link.
     */
    private getParentChild(relationship: Relationship): { parentId: string; childId: string } | null {
        if (!relationship.isInnerFamily) {
            return null;
        }
        if (relationship.relationType === 'Parent') {
            return { parentId: relationship.fromId, childId: relationship.toId };
        }
        if (relationship.relationType === 'Child') {
            return { parentId: relationship.toId, childId: relationship.fromId };
        }
        return null;
    }

    /**
     * Finds the ids of every child of the given parent.
     */
    private async getChildrenOfParent(parentId: string): Promise<string[]> {
        const relations = await this.family.findRelationships({
            $or: [
                { relationType: 'Parent', fromId: parentId },
                { relationType: 'Child', toId: parentId }
            ]
        });
        const childIds = relations.map((relation) =>
            relation.relationType === 'Parent' ? relation.toId : relation.fromId
        );
        return Array.from(new Set(childIds));
    }

    private buildSiblingRelationship(fromId: string, toId: string): Relationship {
        return {
            relationType: 'Sibling',
            prettyType: 'Sibling',
            fromId,
            toId,
            isInnerFamily: false
        };
    }

    private async deriveSiblingRelationships(relationships: Relationship[]): Promise<void> {
        for (const relationship of relationships) {
            const parentChild = this.getParentChild(relationship);
            if (!parentChild) {
                continue;
            }
            const { parentId, childId } = parentChild;
            const siblingIds = (await this.getChildrenOfParent(parentId)).filter((id) => id !== childId);

            for (const siblingId of siblingIds) {
                const existing = await this.family.findRelationships({
                    relationType: 'Sibling',
                    fromId: childId,
                    toId: siblingId
                });
                if (existing.length === 0) {
                    await this.family.addEdge(this.buildSiblingRelationship(childId, siblingId));
                    await this.family.addEdge(this.buildSiblingRelationship(siblingId, childId));
                }
            }
        }
    }

    /**
     * Returns the two partner ids of a spouse/partner relationship, or null if
     * the relationship is not a spouse link.
     */
    private getSpousePair(relationship: Relationship): { spouseId: string; partnerId: string } | null {
        if (relationship.relationType !== 'Partner') {
            return null;
        }
        // `fromId` is the newly added spouse, `partnerId` is the existing member
        // whose children we want to keep visible (but not claim).
        return { spouseId: relationship.fromId, partnerId: relationship.toId };
    }

    private buildUnknownRelationship(fromId: string, toId: string): Relationship {
        return {
            relationType: 'Relative',
            prettyType: 'unknown',
            fromId,
            toId,
            isInnerFamily: false
        };
    }

    /**
     * Returns true when any relationship already exists between the two members
     * (in the given direction), so we never overwrite an existing link.
     */
    private async relationshipExists(fromId: string, toId: string): Promise<boolean> {
        const existing = await this.family.findRelationships({ fromId, toId });
        return existing.length > 0;
    }

    private async deriveSpouseChildRelationships(relationships: Relationship[]): Promise<void> {
        for (const relationship of relationships) {
            const spousePair = this.getSpousePair(relationship);
            if (!spousePair) {
                continue;
            }
            const { spouseId, partnerId } = spousePair;
            const childIds = (await this.getChildrenOfParent(partnerId)).filter((id) => id !== spouseId);

            for (const childId of childIds) {
                // Don't clobber an existing relationship (e.g. the spouse may
                // already be a real parent of this child).
                if (await this.relationshipExists(spouseId, childId)) {
                    continue;
                }
                await this.family.addEdge(this.buildUnknownRelationship(spouseId, childId));
                await this.family.addEdge(this.buildUnknownRelationship(childId, spouseId));
            }
        }
    }

    public async removeRelationship(source: string, target: string): Promise<void> {
        await this.family.initializeDatabase();
        // Relationships are stored bidirectionally (forward + inverse),
        // so remove both directions for a clean delete.
        await this.family.removeEdge(source, target);
        await this.family.removeEdge(target, source);
    }

    public async getMember(uniqueId: string): Promise<Node | undefined> {
        await this.family.initializeDatabase();
        const node = await this.family.getNode(uniqueId);
        return node;
    }

    public async getMembersByParams(param: string, param_value: string): Promise<Array<Node>> {
        await this.family.initializeDatabase();
        const nodes = await this.family.getNodebyParam(param, param_value);
        return nodes.map(node => node);
    }

    public async getAllMembers(): Promise<Node[]> {
        await this.family.initializeDatabase();
        const nodes = await this.family.getAllNodes();
        return nodes;
    }

    public async getAllRelationships(): Promise<Edge[]> {
        await this.family.initializeDatabase();
        const edges = await this.family.getAllEdges();
        return edges;
      }
}