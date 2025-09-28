# GALERIE - Enoki Sui zkLogin & Gas Sponsorship

A web3 Sui application demonstrating Enoki's gas sponsorship and zkLogin authentication on the Sui blockchain.

## How It Works

### 🔐 Enoki zkLogin Authentication
- **Enoki zkLogin**: Integrated zkLogin authentication system from Mysten Labs
- **OAuth Providers**: Users authenticate with Google, Facebook, or Twitch without exposing private keys
- **Zero-Knowledge Proofs**: Leverages cryptographic proofs to maintain privacy while creating Sui wallet addresses
- **Seamless Integration**: Enoki handles the complex zkLogin flow automatically

### ⛽ Gas Fee Sponsorship
- **Enoki Sponsorship**: Backend service sponsors all transaction gas fees
- **Seamless UX**: Users pay $0 in gas fees for all blockchain interactions
- **Configurable Limits**: Set spending limits and allowed contract interactions per user

### 🏗️ Architecture Components

#### Frontend (`enoki_frontend/`)
- **React + TypeScript** application using Mysten Dapp Kit
- **zkLogin Integration** for wallet-less user authentication
- **Real-time Portfolio** tracking with live price updates
- **NFT Marketplace** for fractional ownership of digital assets

#### Backend (`enoki-sponsor-backend/`)
- **Node.js/Express** server handling transaction sponsorship
- **Enoki SDK Integration** for gas fee management
- **JWT Validation** for secure user session management
- **Rate Limiting** and spending controls

#### Smart Contracts
- **Move Language** contracts on Sui blockchain
- **Fractional NFT** ownership and trading mechanisms



## Quick Start

### Frontend
```bash
cd enoki_frontend
npm install
npm run dev
```

### Backend
```bash
cd enoki-sponsor-backend
npm install
npm run dev
```

## Configuration

1. **Enoki Setup**: Configure OAuth providers in Enoki Portal
2. **Environment Variables**: Set up JWT secrets and Enoki credentials
3. **Sponsorship Rules**: Define gas limits and allowed contracts

## Resources

- [Enoki Documentation](https://docs.enoki.mystenlabs.com/)
- [Sui Asset Tokenization](https://docs.sui.io/guides/developer/nft/asset-tokenization)
