import { Member } from './membertype';
import { connectToDatabase, getDatabase } from '../services/mongodb';
import { Settings } from '../Settings';
import { ObjectId } from 'mongodb';

export class Graph {
    private database: any;

    constructor() {
        this.database = null;
    }

    public async initializeDatabase(): Promise<void> {
        await connectToDatabase(); // Connect to the MongoDB database
        this.database = getDatabase(); // Get the database instance
    }

    public async addNode(member: Member): Promise<ObjectId> {
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
        await this.setNodeCoordinates();
        if (this.database) {
            const nodesData = await this.database.collection(Settings.collectionName).find().toArray();
            return nodesData;
        }
        return [];
    }

    public async removeNode(_id: string): Promise<void> {
        const nodeToRemove = await this.getNode(_id);
        if (nodeToRemove) {
            await this.deleteNodeFromDatabase(nodeToRemove);
        }
    }

    public async addEdge(sourceId: string, targetId: string, relationship: number): Promise<void> {
        if (relationship > 0) {
            const temp = sourceId;
            sourceId = targetId;
            targetId = temp;
        }

        const sourceNode = await this.getNode(sourceId);
        const targetNode = await this.getNode(targetId);

        if (sourceNode && targetNode) {
            await this.saveEdgeToDatabase(sourceNode, targetNode, relationship);
        }
    }

    public async getEdge(sourceId: string, targetId: string): Promise<Edge | undefined> {
        if (this.database) {
            const edgeData = await this.database.collection(Settings.relationshipCollectionName).findOne({ source: sourceId, target: targetId });
            if (edgeData) {
                return new Edge(edgeData._id, edgeData.relationship, sourceId, targetId);
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

    public async removeEdge(sourceId: string, targetId: string): Promise<void> {
        const edge = await this.getEdge(sourceId, targetId);

        if (edge?._id) {
            await this.deleteEdgeFromDatabase(edge._id);
        }
    }

    private async saveNodeToDatabase(node: Node): Promise<ObjectId> {
        if (this.database) {
            // Save the node to the Settings.collectionName collection in the database
            const result = await this.database.collection(Settings.collectionName).insertOne(node);
            return result.insertedId;
        }
        return new ObjectId();
    }

    private async saveEdgeToDatabase(sourceNode: Node, targetNode: Node, relationship: number): Promise<void> {
        if (this.database) {
            // Save the edge to the Settings.relationshipCollectionName collection in the database
            const edge = new Edge(relationship, sourceNode._id?.toString(), targetNode._id?.toString());
            await this.database.collection(Settings.relationshipCollectionName).insertOne(edge);
        }
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

    // Function to access and analyze the nodes and edges and set the x and y coordinates of each node
    // such that when the nodes are displayed on a screen, the nodes of the same generation are in
    // one horizontal line with lower numbered generations obove the higher numbered generations.
    // Within a generation, the x value should be such that the nodes are evenly spaced. Save the
    // updated nodes with x and y values to the database. Keep in mind the genration number could go in negatives as well

    private async setNodeCoordinates(): Promise<void> {
        if (this.database) {
            const nodes = await this.database.collection(Settings.collectionName).find().toArray();
            // const edges = await this.database.collection(Settings.relationshipCollectionName).find().toArray();

            // Sort the nodes by generation
            nodes.sort((a, b) => (a.member.generation ?? 0) - (b.member.generation ?? 0));

            // Set the x and y coordinates of each node
            let x = 100;
            let y = 100;
            let prevGen = nodes[0].member.generation;
            for (let i = 0; i < nodes.length; i++) {
                if (prevGen !== nodes[i].member.generation) {
                    y += 100;
                    x = 100;
                    prevGen = nodes[i].member.generation;
                }
                nodes[i].x = x;
                nodes[i].y = y;
                x += 500;
            }

            // Save the updated nodes with x and y values to the database
            for (let i = 0; i < nodes.length; i++) {
                await this.database.collection(Settings.collectionName).updateOne({ _id: nodes[i]._id }, { $set: { x: nodes[i].x, y: nodes[i].y } });
            }
        }
    }
}

export class Node {
    public member: Member;
    public _id?: string;
    public x?: number;
    public y?: number;

    constructor(member: Member, x?: number, y?: number) {
        this.member = member;
        this._id = member._id;
        this.x = x;
        this.y = y;
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