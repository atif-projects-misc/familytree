export const Settings = {
    MongoDbUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/',
    dbName: process.env.MONGODB_DB_NAME || 'FamilyTree',
    collectionName: process.env.MONGODB_MEMBERS_COLLECTION || 'Members',
    relationshipCollectionName: process.env.MONGODB_RELATIONSHIPS_COLLECTION || 'Relationships',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3012
};