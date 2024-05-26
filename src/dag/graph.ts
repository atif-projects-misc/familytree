import { Member } from './membertype';

export class Graph {
    private nodes: Map<string, Node>;

    constructor() {
        this.nodes = new Map<string, Node>();
    }

    public addNode(member: Member, uniqueId: string): void {
        const node = new Node(member, uniqueId);
        this.nodes.set(uniqueId, node);
    }

    public getNode(uniqueId: string): Node | undefined {
        return this.nodes.get(uniqueId);
    }

    public addEdge(sourceId: string, targetId: string, relationship: number): void {
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);

        if (sourceNode && targetNode) {
            sourceNode.addEdge(targetNode, relationship);
            targetNode.addEdge(sourceNode, relationship);
        }
    }

    public removeEdge(sourceId: string, targetId: string): void {
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);

        if (sourceNode && targetNode) {
            sourceNode.removeEdge(targetNode);
            targetNode.removeEdge(sourceNode);
        }
    }
    
    public removeNode(uniqueId: string): void {
        const nodeToRemove = this.nodes.get(uniqueId);
        if (nodeToRemove) {
            // Remove the node from all other nodes' edges
            this.nodes.forEach(node => {
                node.removeEdge(nodeToRemove);
            });

            // Remove the node from the graph
            this.nodes.delete(uniqueId);
        }
    }
}

export class Node {
    public member: Member;
    public uniqueId: string;
    public edges: Edge[];

    constructor(member: Member, uniqueId: string) {
        this.member = member;
        this.uniqueId = uniqueId;
        this.edges = [];
    }

    public addEdge(node: Node, relationship: number): void {
        this.edges.push(new Edge(node, relationship));
    }

    changeEdge(node: Node, relationship: number): void {
        const index = this.edges.findIndex(edge => edge.node === node);
        if (index > -1) {
            this.edges[index].relationship = relationship;
        }
    }

    public removeEdge(node: Node): void {
        const index = this.edges.findIndex(edge => edge.node === node);
        if (index > -1) {
            this.edges.splice(index, 1);
        }
    }
}

class Edge {
    public node: Node;
    public relationship: number;

    constructor(node: Node, relationship: number) {
        this.node = node;
        this.relationship = relationship;
    }
}