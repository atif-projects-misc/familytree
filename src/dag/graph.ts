import { Member } from './membertype';
import { connectToDatabase, getDatabase } from '../services/mongodb';
import { Settings } from '../Settings';
import { ObjectId } from 'mongodb';
import { Relationship } from './relationshiptype';

export class Graph {
    private database: any;

    constructor() {
        this.database = null;
    }

    public async initializeDatabase(): Promise<void> {
        await connectToDatabase(); // Connect to the MongoDB database
        this.database = getDatabase(); // Get the database instance
    }

    public async addNode(member: Member): Promise<String | undefined> {
        const node = new Node(member);
        const _id = await this.saveNodeToDatabase(node);
        return _id;
    }

    public async getNode(uniqueId: string): Promise<Node | undefined> {
        if (this.database) {
            const obj = new ObjectId(uniqueId);
            const nodeData = await this.database.collection(Settings.collectionName).findOne({ _id: obj });
            if (nodeData) {
                return nodeData;
            }
        }
        return undefined;
    }

    public async getNodebyParam(param: string, param_value: string): Promise<Array<Node>> {
        if (this.database) {
            const nodeData = await this.database.collection(Settings.collectionName).find({ [`member.${param}`]: { $regex: param_value, $options: 'i' } }).toArray();
            if (nodeData) {
                return nodeData;
            }
        }
        return [];
    }

    public async getAllNodes(): Promise<Node[]> {
        if (this.database) {
            try {
                const nodesData = await this.database.collection(Settings.collectionName).find().toArray();
                return nodesData.map((node: any) => {
                    node.id = node._id.toString();
                    delete node._id;
                    return node;
                });
            } catch (error) {
                console.error('Error fetching all nodes from database:', error);
                return [];
            }
        }
        return [];
    }

    public async removeNode(_id: string): Promise<void> {
        const nodeToRemove = await this.getNode(_id);
        if (nodeToRemove) {
            await this.deleteNodeFromDatabase(nodeToRemove);
        }
    }

    public async updateNode(uniqueId: string, member: Member): Promise<void> {
        if (this.database) {
            const node = new Node(member);
            await this.database.collection(Settings.collectionName).updateOne(
                { _id: new ObjectId(uniqueId) },
                { $set: { data: node.data } }
            );
        }
    }

    public async addEdge(relationship: Relationship): Promise<void> {
        if (relationship) {
            await this.saveEdgeToDatabase(relationship);
        }
    }

    public async getEdge(sourceId: string, targetId: string): Promise<Edge | undefined> {
        if (this.database) {
            const edgeData = await this.database.collection(Settings.relationshipCollectionName).findOne({ fromId: sourceId, toId: targetId });
            if (edgeData) {
                const edge = new Edge(edgeData.relationship, sourceId, targetId);
                edge._id = edgeData._id.toString();
                return edge;
            }
        }
        return undefined;
    }

    public async getAllEdges(): Promise<Edge[]> {
        if (this.database) {
            const edgesData = await this.database.collection(Settings.relationshipCollectionName).find().toArray();
            return edgesData;
        }
        return [];
    }

    public async findRelationships(query: Record<string, unknown>): Promise<Relationship[]> {
        if (this.database) {
            return await this.database.collection(Settings.relationshipCollectionName).find(query).toArray();
        }
        return [];
    }

    public async removeEdge(sourceId: string, targetId: string): Promise<void> {
        const edge = await this.getEdge(sourceId, targetId);

        if (edge?._id) {
            await this.deleteEdgeFromDatabase(edge._id);
        }
    }

    private async saveNodeToDatabase(node: Node): Promise<String | undefined> {
        if (this.database) {
            // Save the node to the Settings.collectionName collection in the database
            try {
                const result = await this.database.collection(Settings.collectionName).insertOne(node);
                return result.insertedId.toString();
            } catch (error) {
                console.error('Error saving node to database:', error);
                return undefined;
            }
        }
        return undefined;
    }

    private async saveEdgeToDatabase(relationship: Relationship): Promise<String | undefined> {
        if (this.database) {
            // Save the edge to the Settings.relationshipCollectionName collection in the database
            try {
                const result = await this.database.collection(Settings.relationshipCollectionName).insertOne(relationship);
                return result.insertedId.toString();
            } catch (error) {
                console.error('Error saving edge to database:', error);
                return undefined;
            }
        }
        return undefined;
    }

    private async deleteEdgeFromDatabase(edgeId: string): Promise<void> {
        if (this.database) {
            // Delete the edge from the Settings.collectionName collection in the database
            await this.database.collection(Settings.relationshipCollectionName).deleteOne({ _id: new ObjectId(edgeId) });
        }
    }

    private async deleteNodeFromDatabase(node: Node): Promise<void> {
        if (this.database) {
            const obj = new ObjectId(node._id);
            // Delete the node from the Settings.collectionName collection in the database
            await this.database.collection(Settings.collectionName).deleteOne({ _id: obj });
        }
    }
}

export class Node {
    public data: Member;
    public _id?: string;

    constructor(member: Member) {
        const memberData: Member = {
            badges: member?.badges || [],
            sex: member.sex,
            subtitles: member?.subtitles || "",
            title: member.title,
            titleBgColor: member?.titleBgColor || "rgb(63, 108, 191)",
            titleTextColor: member?.titleTextColor || "white",
            imageUrl: member?.imageUrl || null
        }
        this.data = memberData;
    }

    public setId(uniqueId: string): void {
        this._id = uniqueId;
    }
}

export class Edge {
    public _id?: string;
    public relationship: number;
    public source?: string;
    public target?: string;

    constructor(relationship: number, source?: string, target?: string, _id?: string) {
        this.relationship = relationship;
        this.source = source;
        this.target = target;
        this._id = _id;
    }
}