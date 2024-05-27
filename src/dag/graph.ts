import { Member } from './membertype';
import { connectToDatabase, getDatabase } from '../services/mongodb';
import { Settings } from '../Settings';
import { ObjectId } from 'mongodb';

export class Graph {
    private nodes: Map<string, Node>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private database: any; // Replace 'any' with the appropriate type for your MongoDB database

    constructor() {
        this.nodes = new Map<string, Node>();
        this.database = null;
    }

    public async initializeDatabase(): Promise<void> {
        await connectToDatabase(); // Connect to the MongoDB database
        this.database = getDatabase(); // Get the database instance
        await this.updateNodesFromDatabase(); // Update nodes from the database
    }

    public async addNode(member: Member): Promise<ObjectId> {
        const node = new Node(member);
        const _id = await this.saveNodeToDatabase(node);
        node.setId(_id.toString());
        this.nodes.set(node._id || '', node);
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

    public async getAllNodes(): Promise<Map<string, Node>> {
        return this.nodes;
    }

    public async addEdge(sourceId: string, targetId: string, relationship: number): Promise<void> {
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);

        if (sourceNode && targetNode) {
            sourceNode.addEdge(targetNode, relationship);
            targetNode.addEdge(sourceNode, relationship * -1);
            await this.saveEdgeToDatabase(sourceNode, targetNode, relationship);
        }
    }

    public async removeEdge(sourceId: string, targetId: string): Promise<void> {
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);

        if (sourceNode && targetNode) {
            sourceNode.removeEdge(targetNode);
            targetNode.removeEdge(sourceNode);
            await this.deleteEdgeFromDatabase(sourceNode, targetNode);
        }
    }

    public async removeNode(_id: string): Promise<void> {
        const nodeToRemove = this.nodes.get(_id);
        if (nodeToRemove) {
            // Remove the node from all other nodes' edges
            this.nodes.forEach(async (node) => {
                node.removeEdge(nodeToRemove);
                await this.deleteEdgeFromDatabase(node, nodeToRemove);
            });

            // Remove the node from the graph
            this.nodes.delete(_id);

            await this.deleteNodeFromDatabase(nodeToRemove);
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
            const sourceEdgeData = {
                _id: targetNode._id,
                relationship: relationship
            };

            const targetNodeRelationship = relationship * -1;
            const targetEdgeData = {
                _id: sourceNode._id,
                relationship: targetNodeRelationship
            };

            // Save the edge to the Settings.collectionName collection in the database
            let obj = new ObjectId(sourceNode._id);
            await this.database.collection(Settings.collectionName).updateOne(
                { _id: obj },
                { $push: { edges: sourceEdgeData } }
            );

            obj = new ObjectId(targetNode._id);
            await this.database.collection(Settings.collectionName).updateOne(
                { _id: obj },
                { $push: { edges: targetEdgeData } }
            );
        }
    }

    private async deleteEdgeFromDatabase(sourceNode: Node, targetNode: Node): Promise<void> {
        if (this.database) {
            // Delete the edge from the Settings.collectionName collection in the database
            const obj = new ObjectId(targetNode._id);
            await this.database.collection(Settings.collectionName).updateOne(
                { _id: sourceNode._id },
                { $pull: { edges: { _id: obj } } }
            );
        }
    }

    private async deleteNodeFromDatabase(node: Node): Promise<void> {
        if (this.database) {
            const obj = new ObjectId(node._id);
            // Delete the node from the Settings.collectionName collection in the database
            await this.database.collection(Settings.collectionName).deleteOne({ _id: obj });
        }
    }

    private async updateNodesFromDatabase(): Promise<void> {
        if (this.database) {
            const nodesData = await this.database.collection(Settings.collectionName).find().toArray();
            this.nodes.clear();
            nodesData.forEach(nodeData => {
                const node = new Node(nodeData.member);
                node._id = nodeData._id.toString();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                nodeData.edges.forEach((edgeData: any) => {
                    const targetNode = this.nodes.get(edgeData?._id);
                    if (targetNode) {
                        node.addEdge(targetNode, edgeData.relationship);
                    }
                });
                this.nodes.set(nodeData._id.toString(), node);
            });
        }
    }
}

export class Node {
    public member: Member;
    public _id?: string;
    public edges: Edge[];

    constructor(member: Member) {
        this.member = member;
        this.edges = [];
        this._id = member._id;
    }

    public setId(_id: string): void {
        this._id = _id;
    }

    public addEdge(node: Node, relationship: number): void {
        if (!this.edges.some(edge => edge._id === node._id)) {
            if (node._id)
            this.edges.push(new Edge(node._id, relationship));
        }
    }

    changeEdge(node: Node, relationship: number): void {
        const index = this.edges.findIndex(edge => edge._id === node._id);
        if (index > -1) {
            this.edges[index].relationship = relationship;
        }
    }

    public removeEdge(node: Node): void {
        const index = this.edges.findIndex(edge => edge._id === node._id);
        if (index > -1) {
            this.edges.splice(index, 1);
        }
    }
}

class Edge {
    public _id: string;
    public relationship: number;

    constructor(_id: string, relationship: number) {
        this._id = _id;
        this.relationship = relationship;
    }
}