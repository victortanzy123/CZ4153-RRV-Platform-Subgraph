# RRV Platform Subgraph

## Overview

The <a href="https://thegraph.com/hosted-service/subgraph/victortanzy123/rrv-platform-sepolia">RRV Platform Subgraph</a> deployed via The Graph Protocol on `Sepolia Testnet` enables real-time syncing and indexing of event logs emitted from the RRV Platform Creator Smart Contract, and acts as a database with intemediate data processing, storage and query endpoints via `GraphQL` Framework.

The <a href="https://cz-4153-frontend.vercel.app/">RRV Platform</a> NextJS application then queries and pull relevant data from the Subgraph via the Apollo Client using the Serverless Functions, and subsequently displays data on the UI for the user.

## Subgraph Deployment Details

- **Subgraph Type:** `Hosted Service`
- **Blockchain:** `Sepolia Testnet`
- **RRV Platform Contract Address:** `0x8ac2379b0f17138d2e83Ca87E218F810d9B6Ad63`
- **Deployed Subgraph URL:** https://thegraph.com/hosted-service/subgraph/victortanzy123/rrv-platform-sepolia

## Setting up local development environment

### Prerequisites

Make sure you have [docker](https://docs.docker.com/engine/install) installed in your system.

In the root directory run the following command

```bash
docker compose up -d
```

#### \*Note:

If deployment is on the Mainnet:

```bash
yarn codegen
```

Else if deployment is NOT ETH MAINNET, use:

```bash
yarn codegen-non-mainnet
```

To prepare the workspace for a given network run,

```bash
yarn prepare:<network>
```

To deploy locally

```bash
yarn create-local
yarn deploy-local
```

Go to [http://localhost:4000](http://localhost:4000) to view the graphql playground

## Live Deployment on The Graph Protocol Hosted Service

```bash
export SUBGRAPH_ACCESS_KEY=<your-access-key>
yarn deploy:<network>
```
