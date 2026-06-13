# familytree (backend)

REST API + MongoDB persistence layer for the Family Tree application. It stores
**members** (people) and **relationships** (typed, directed links between
people) and exposes a small HTTP API that the React frontend
([`reactui`](../reactui)) consumes.

This README documents the full architecture so the project can be handed off to
other developers. For the frontend (rendering, layout engine and the
relationship-type conventions) see [`reactui/README.md`](../reactui/README.md).

---

## Table of contents

- [Quick start (original steps)](#quick-start-original-steps)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [Configuration](#configuration)
- [Architecture overview](#architecture-overview)
- [Data model](#data-model)
- [The relationship convention](#the-relationship-convention)
- [REST API reference](#rest-api-reference)
- [Code layout](#code-layout)
- [Domain layer behaviour (`Family`)](#domain-layer-behaviour-family)
- [Dormant backend derivation](#dormant-backend-derivation)
- [Docker / CI](#docker--ci)

---

## Quick start (original steps)

1. Fork this repository and enable fork syncing to keep the fork updated with main.
2. Clone the fork to your local machine using `git clone` (preferable shell is gitbash).
3. Run `npm install` to install all dependencies.
4. Run `npm run build && npm run start` to build and run the backend locally. Default port is 3012.
5. The project connects to a MongoDB instance (cloud or local) configured via environment variables.

---

## Tech stack

- **Node.js** + **Express 4** — HTTP server.
- **TypeScript** — compiled to plain JS in `build/` via `tsc`.
- **MongoDB** (`mongodb` driver v6) — persistence.
- **cors** — CORS enabled for all origins so the browser app can call the API.
- **dotenv** — environment-based configuration.
- **rimraf** — cleans the `build/` directory before each compile.

There is **no ORM**; data is read/written directly through the MongoDB driver.

---

## Running locally

```bash
npm install          # install dependencies
npm run build        # rimraf build/ && tsc --pretty  -> emits build/
npm run start        # node ./build/server  -> listens on PORT (default 3012)
```

`npm run build && npm run start` does both in one step. The API then listens on
`http://localhost:3012` by default.

You need a reachable MongoDB instance (local or cloud). Connection details come
from environment variables (see [Configuration](#configuration)). With no
environment set, it connects to `mongodb://localhost:27017/` and database
`FamilyTree`.

> `npm test` is a no-op (`exit 0`) — there is currently no test suite.

---

## Configuration

All configuration lives in `src/Settings/Settings.base.ts` and is read from the
environment (with sensible local defaults):

| Setting                       | Env var                            | Default                       | Purpose                                  |
| ----------------------------- | ---------------------------------- | ----------------------------- | ---------------------------------------- |
| `MongoDbUrl`                  | `MONGODB_URL`                      | `mongodb://localhost:27017/`  | MongoDB connection string                |
| `dbName`                      | `MONGODB_DB_NAME`                  | `FamilyTree`                  | Database name                            |
| `collectionName`              | `MONGODB_MEMBERS_COLLECTION`       | `Members`                     | Collection that stores people            |
| `relationshipCollectionName`  | `MONGODB_RELATIONSHIPS_COLLECTION` | `Relationships`               | Collection that stores relationship rows |
| `port`                        | `PORT`                             | `3012`                        | HTTP port                                |

`dotenv` is available; create a `.env` file at the project root to override any
of the above for local development.

---

## Architecture overview

The backend is organised in three thin layers:

```
HTTP request
   │
   ▼
server.ts            (Express routes — request/response wiring only)
   │
   ▼
data/family.ts       (Family — domain layer; orchestrates operations,
   │                  ensures the DB connection, derives relationships)
   ▼
dag/graph.ts         (Graph/Node/Edge — MongoDB persistence;
   │                  CRUD on the Members and Relationships collections)
   ▼
services/mongodb.ts  (connection management — connectToDatabase/getDatabase)
   │
   ▼
MongoDB  (Members collection + Relationships collection)
```

- **`server.ts`** only maps HTTP routes to `Family` method calls. It owns no
  business logic.
- **`Family`** (`data/family.ts`) is the domain layer. Every public method first
  calls `this.family.initializeDatabase()` (a no-op if already connected), then
  delegates to `Graph`.
- **`Graph`** (`dag/graph.ts`) is the persistence layer. It wraps the two
  MongoDB collections and exposes `Node`/`Edge` CRUD. It normalises Mongo
  documents (maps `_id` → `id` string and removes `_id`) before returning them.
- **`mongodb.ts`** owns a single shared `MongoClient` and lazily connects.

The name *DAG* (directed acyclic graph) reflects the conceptual model: members
are nodes and relationships are directed edges between them.

---

## Data model

### Member (`dag/membertype.ts`)

A node in the graph — one person.

```ts
interface Member {
  badges: { bgColor: string; label: string; textColor: string }[];
  sex: "M" | "F";
  subtitles: string;
  title: string;          // display name
  titleBgColor: string;
  titleTextColor: string;
  imageUrl?: string | null;
}
```

In MongoDB a member document is `{ _id, member: Member }`. On read, `Graph`
flattens this to `{ id: <_id as string>, ...member }` for the API response.
`Node` supplies defaults for missing fields (`badges: []`, `subtitles: ""`,
`titleBgColor: "rgb(63, 108, 191)"`, `titleTextColor: "white"`,
`imageUrl: null`).

### Relationship (`dag/relationshiptype.ts`)

A directed edge between two members.

```ts
interface Relationship {
  fromId: string;         // the "anchor" member's id
  toId: string;           // the "relative" member's id
  relationType: string;   // drives the frontend layout/edges
  prettyType: string;     // drives the frontend label
  isInnerFamily: boolean; // direct parent/child link (drawn as a family edge)
}
```

> ⚠️ The `Edge` class inside `dag/graph.ts` declares a different, legacy shape
> (`relationship: number`). The rows actually stored and exchanged follow the
> `Relationship` interface above. Treat `relationshiptype.ts` as the source of
> truth.

---

## The relationship convention

This is the single most important rule to understand the whole system:

> For a stored row keyed `fromId -> toId`, **both `relationType` and
> `prettyType` mean "`toId` is the [type] of `fromId`"**, and they are normally
> **equal** for a given row.

Examples:

- Row `{ fromId: A, toId: B, relationType: "Father", prettyType: "Father" }`
  means **B is the Father of A**.
- Row `{ fromId: A, toId: B, relationType: "Son", prettyType: "Son" }`
  means **B is the Son of A**.

Relationships are stored **in both directions**. When the frontend adds a link
it sends a pair of rows (anchor→relative and relative→anchor), each typed from
its own perspective. `removeRelationship` therefore deletes **both** directions
(`source→target` and `target→source`).

There are two kinds of derived rows the frontend may persist:

- **Label-only**: `relationType: "Relative"`, `prettyType` carries the label
  (e.g. `"Great-grandfather"`, `"Brother in law"`). No edge is drawn; exists
  purely so the relationship-to-root label is correct when re-rooting.
- **Visual derived**: `relationType` = the actual canonical type (e.g. `"Father"`,
  `"Husband"`), set when the user checks "Show in graph" in the derivation
  confirmation panel. These are persisted identically to manually-added rows.

The backend stores both shapes verbatim — it does not validate `relationType`
against an enumerated list.

### Extended relationship vocabulary

The frontend relationship type vocabulary (`RelationTypes` in the frontend
`src/tree/types.ts`) was extended with four step in-law types. Any of the
following may now appear as `relationType` or `prettyType` values:

```
"Step father in law" | "Step mother in law" | "Step son in law" | "Step daughter in law"
```

These join the existing in-law types (`"Father in law"`, `"Mother in law"`,
`"Son in law"`, `"Daughter in law"`) and follow the same storage convention. The
backend stores them as plain strings with no schema changes required.

---

## REST API reference

Base URL: `http://localhost:<port>` (default `http://localhost:3012`). CORS is
open to all origins.

### Members

#### `POST /family/addMember`
Add a person.
- **Body:** a `Member` object (JSON).
- **Returns:** the inserted document id (string).

#### `PUT /family/updateMember?id=<memberId>`
Update an existing person's data.
- **Query:** `id` — the member id.
- **Body:** a `Member` object (replaces the `member` data).

#### `GET /family/getMemberById?id=<memberId>`
- **Query:** `id` — the member id.
- **Returns:** the member (`{ id, ...Member }`) or null.

#### `GET /family/getMemberByParam?param=<field>&param_value=<value>`
Case-insensitive regex lookup on a single member field.
- **Query:** `param` (field name on the member, e.g. `title`), `param_value`
  (substring to match).
- **Returns:** matching members.

#### `GET /family/getAllMembers`
- **Returns:** every member as `{ id, ...Member }[]`.

#### `DELETE /family/removeMember?id=<memberId>`
- **Query:** `id` — the member id to delete.

### Relationships

#### `POST /family/addRelationship`
Add one or more relationship rows.
- **Body:** an array of `Relationship` objects.
- **Side effects:** after inserting, the domain layer runs the (currently
  dormant) derivation routines — see
  [Dormant backend derivation](#dormant-backend-derivation).

#### `GET /family/getAllRelationships`
- **Returns:** every relationship row.

#### `DELETE /family/removeRelationship?source=<id>&target=<id>`
- **Query:** `source`, `target` — member ids.
- Removes **both** directions (`source→target` and `target→source`).

---

## Code layout

```
familytree/
├─ Dockerfile              # container build (copies build/, exposes 3012)
├─ Jenkinsfile             # CI pipeline
├─ eslint.config.mjs       # typescript-eslint flat config
├─ package.json            # scripts: build (tsc), start (node build/server)
├─ tsconfig.json
├─ build/                  # compiled output (generated by `npm run build`)
└─ src/
   ├─ server.ts            # Express app + routes
   ├─ data/
   │  └─ family.ts         # Family domain layer
   ├─ dag/
   │  ├─ graph.ts          # Graph / Node / Edge — MongoDB CRUD
   │  ├─ membertype.ts     # Member interface
   │  └─ relationshiptype.ts # Relationship interface
   ├─ services/
   │  └─ mongodb.ts        # connectToDatabase / getDatabase
   └─ Settings/
      ├─ index.ts          # re-exports Settings
      └─ Settings.base.ts  # env-driven config
```

---

## Domain layer behaviour (`Family`)

`Family` (in `data/family.ts`) wraps `Graph` and adds orchestration. Notable
methods:

- `addMember`, `removeMember`, `updateMember`, `getMember`,
  `getMembersByParams`, `getAllMembers`, `getAllRelationships` — straightforward
  delegations to `Graph` (each ensures the DB connection first).
- `addRelationship(relationships[])` — inserts every supplied edge, then calls
  the derivation helpers (`deriveSiblingRelationships`,
  `deriveSpouseChildRelationships`).
- `removeRelationship(source, target)` — removes **both** directions of the
  link.
- Helper queries: `getParentChild` (inner-family parent/child only),
  `getChildrenOfParent`, `getSpousePair`, `relationshipExists(fromId, toId)`.

`Graph` (in `dag/graph.ts`) exposes:

- Nodes: `addNode`, `getNode(ObjectId)`, `getNodebyParam` (case-insensitive
  regex on `member.<param>`), `getAllNodes` (normalises `_id`→`id`),
  `removeNode`, `updateNode` (updates the `member` data only).
- Edges: `addEdge`, `getEdge(fromId, toId)`, `getAllEdges`,
  `findRelationships(query)`, `removeEdge`.

---

## Dormant backend derivation

`Family.addRelationship` calls two derivation routines after inserting new
edges:

- `deriveSiblingRelationships` — links co-children of the same parents as
  siblings.
- `deriveSpouseChildRelationships` — creates placeholder links between a new
  spouse and the partner's existing children.

These were written against a **generic** relationship vocabulary
(`"Parent"`, `"Child"`, `"Partner"`, `"Sibling"`, `"Relative"`). The frontend
now sends **gendered** types (`"Father"`, `"Son"`, `"Husband"`, …), so these
routines do not match real data and are effectively **inactive**. All meaningful
relationship derivation (siblings, transitive grandparent/`Great-` labels, etc.)
now happens **in the frontend** before the rows are persisted. Keep this in mind
before relying on or extending the backend derivation code.

---

## Docker / CI

- **`Dockerfile`** — based on `node:latest`. It copies the pre-built `build/`
  directory and `node_modules`, runs `npm install`, exposes port `3012`, and
  runs `node server.js` from `build/`. Build the project (`npm run build`)
  before building the image.
- **`Jenkinsfile`** — defines the CI pipeline.
- **`eslint.config.mjs`** — `typescript-eslint` flat config for linting.