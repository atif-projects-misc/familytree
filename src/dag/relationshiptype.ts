export interface Relationship {
    relationType: string;
    prettyType: string;
    toId: string;
    fromId: string;
    isInnerFamily: boolean;
}