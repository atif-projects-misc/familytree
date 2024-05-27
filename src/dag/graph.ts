import { Member } from './membertype';
import { connectToDatabase, getDatabase } from '../services/mongodb';

export class Graph {
    private nodes: Map<string, Node>;
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

    public async addNode(member: Member, _id: string): Promise<void> {
        const node = new Node(member, _id);
        this.nodes.set(_id, node);
        await this.saveNodeToDatabase(node);
    }

    public async getNode(uniqueId: string): Promise<Node | undefined> {
        if (this.database) {
            const nodeData = await this.database.collection('FamilyTree').findOne({ _id: uniqueId });
            if (nodeData) {
                return nodeData;
            }
        }
        return undefined;
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
            this.nodes.forEach(node => {
                node.removeEdge(nodeToRemove);
            });

            // Remove the node from the graph
            this.nodes.delete(_id);

            await this.deleteNodeFromDatabase(nodeToRemove);
        }
    }

    private async saveNodeToDatabase(node: Node): Promise<void> {
        if (this.database) {
            // Save the node to the 'FamilyTree' collection in the database
            await this.database.collection('FamilyTree').insertOne(node);
        }
    }

    private async saveEdgeToDatabase(sourceNode: Node, targetNode: Node, relationship: number): Promise<void> {
        if (this.database) {
            // Exclude circular references from the edge data
            const sourceEdgeData = {
                _id: targetNode._id,
                relationship: relationship
            };

            const targetNodeRelationship = relationship * -1;
            const targetEdgeData = {
                _id: sourceNode._id,
                relationship: targetNodeRelationship
            };

            // Save the edge to the 'FamilyTree' collection in the database
            await this.database.collection('FamilyTree').updateOne(
                { _id: sourceNode._id },
                { $push: { edges: sourceEdgeData } }
            );

            await this.database.collection('FamilyTree').updateOne(
                { _id: targetNode._id },
                { $push: { edges: targetEdgeData } }
            );
        }
    }

    private async deleteEdgeFromDatabase(sourceNode: Node, targetNode: Node): Promise<void> {
        if (this.database) {
            // Delete the edge from the 'FamilyTree' collection in the database
            await this.database.collection('FamilyTree').updateOne(
                { _id: sourceNode._id },
                { $pull: { edges: { node: targetNode } } }
            );
        }
    }

    private async deleteNodeFromDatabase(node: Node): Promise<void> {
        if (this.database) {
            // Delete the node from the 'FamilyTree' collection in the database
            await this.database.collection('FamilyTree').deleteOne({ _id: node._id });
        }
    }

    private async updateNodesFromDatabase(): Promise<void> {
        if (this.database) {
            const nodesData = await this.database.collection('FamilyTree').find().toArray();
            this.nodes.clear();
            nodesData.forEach(nodeData => {
                const node = new Node(nodeData.member, nodeData._id);
                nodeData.edges.forEach((edgeData: any) => {
                    const targetNode = this.nodes.get(edgeData.node._id);
                    if (targetNode) {
                        node.addEdge(targetNode, edgeData.relationship);
                    }
                });
                this.nodes.set(nodeData._id, node);
            });
        }
    }
}

export class Node {
    public member: Member;
    public _id: string;
    public edges: Edge[];

    constructor(member: Member, _id: string) {
        this.member = member;
        this._id = _id;
        this.edges = [];
    }

    public addEdge(node: Node, relationship: number): void {
        this.edges.push(new Edge(node._id, relationship));
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