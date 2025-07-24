# Skynet Boilerplate

This repository is a boilerplate for building Web3 applications with Next.js 15, focused on the Skynet blockchain. It provides a ready-to-use foundation for developers and interns to quickly start projects involving NFT minting, wallet authentication, and agent management.

## 🎯 What You'll Learn

-   **Web3 Authentication**: Connect wallets using Web3Auth with multiple provider support
-   **NFT Minting**: Mint account and agent NFTs on the Skynet blockchain
-   **Agent Management**: Create and manage AI agents with their own NFT collections
-   **Blockchain Integration**: Interact with Skynet network using ethers.js
-   **Modern UI**: Build clean interfaces with Shadcn/ui and Tailwind CSS
-   **Real-time Features**: WebSocket communication for live updates

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── (routes)/          # Route groups
│   │   └── agents/        # Agent management pages
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Landing page
├── components/            # Reusable UI components
│   ├── ui/               # Shadcn/ui components
│   ├── nft/              # NFT-related components
│   └── wallet/           # Wallet components
├── config/               # Configuration files
│   ├── constants.ts      # App constants and network config
│   └── web3AuthConfig.ts # Web3Auth configuration
├── hooks/                # Custom React hooks
│   ├── use-wallet.ts     # Wallet connection logic
│   └── use-nft.ts        # NFT operations
├── lib/                  # Utility libraries
│   ├── axios.ts          # HTTP client setup
│   └── utils.ts          # General utilities
├── providers/            # React context providers
│   └── Web3AuthProvider.tsx # Web3Auth provider
├── types/                # TypeScript definitions
│   ├── agents.d.ts       # Agent-related types
│   └── wallet.ts         # Wallet-related types
└── utils/                # Utility functions
    └── skynetHelper.ts   # Skynet blockchain utilities
```

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+ installed
-   Basic understanding of React and TypeScript
-   Skynet network configured in your wallet (Chain ID: 619)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd skynet-boilerplate

# Install dependencies
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
# Copy the example environment file
cp .env.example .env.local
```

The `env.example` file contains all required environment variables with descriptions. Key variables include:

-   **API URLs**: Skynet API endpoints for agents, storage, and analytics
-   **Web3Auth Client ID**: For wallet authentication (fallback is hardcoded)
-   **API Key**: For accessing Skynet services

**Note**: The Web3Auth client ID is already provided as a fallback in the code, so the app will work even if you don't set this environment variable.

### 3. Configure Your Wallet

Add Skynet network to your wallet:

-   **Network Name**: Skynet
-   **RPC URL**: `https://skynet-rpc.example.com` (update with actual RPC)
-   **Chain ID**: 619
-   **Currency Symbol**: sUSD
-   **Block Explorer**: `https://skynet-explorer.example.com`

### 4. Start Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🎮 How to Use

### 1. Connect Your Wallet

-   Click the "Connect Wallet" button on the homepage
-   Choose your preferred wallet provider (MetaMask, WalletConnect, etc.)
-   Approve the connection in your wallet

### 2. Mint Account NFT

-   After connecting, you'll see a "Mint Account NFT" button
-   Click to mint your first NFT (required for accessing features)
-   Confirm the transaction in your wallet

### 3. Create Agents

-   Navigate to `/agents` to view your agent dashboard
-   Click "Create Agent" to deploy a new AI agent
-   Fill in agent details and confirm creation

## 🔧 Troubleshooting

### Web3Auth Issues

If you encounter Web3Auth connection problems:

1. **Check Environment Variables**: Ensure `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` is set correctly
2. **Hardcode Client ID**: If environment variables aren't working, the app has a fallback client ID hardcoded in `src/config/web3AuthConfig.ts`
3. **Network Issues**: Make sure you're on the correct network (Skynet Chain ID: 619)
4. **Browser Console**: Check for any JavaScript errors in the browser console

### Common Issues

#### "Wallet not connected"

-   Ensure your wallet extension is installed and unlocked
-   Try refreshing the page and reconnecting
-   Check if your wallet supports the required network

#### "Transaction failed"

-   Verify you have sufficient sUSD balance for gas fees
-   Ensure you're connected to the Skynet network
-   Check if the contract addresses are correct

#### "NFT minting failed"

-   Confirm you have enough balance for the mint price
-   Check if the NFT contract is properly registered
-   Verify network connectivity

### Development Issues

#### TypeScript Errors

```bash
# Check for type errors
npm run type-check

# Fix linting issues
npm run lint
```

#### Build Issues

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## 🛠️ Key Technologies

-   **Frontend**: Next.js 15, React 18, TypeScript
-   **Web3**: Web3Auth, ethers.js, Skynet SDK
-   **UI**: Shadcn/ui, Tailwind CSS, Lucide Icons
-   **State Management**: React Hooks, Context API, Zustand
-   **HTTP Client**: Axios
-   **Real-time**: WebSockets

## 📁 Important Files Explained

### Core Configuration

-   `src/config/constants.ts` - App constants, network config, API endpoints
-   `src/config/web3AuthConfig.ts` - Web3Auth setup with fallback client ID
-   `src/lib/axios.ts` - HTTP client with API key authentication

### Web3 Integration

-   `src/utils/skynetHelper.ts` - Skynet blockchain operations
-   `src/hooks/use-wallet.ts` - Wallet connection and management
-   `src/hooks/use-nft.ts` - NFT operations and state

### UI Components

-   `src/components/wallet/connect-button.tsx` - Wallet connection UI
-   `src/components/nft/mint-button.tsx` - NFT minting interface
-   `src/app/page.tsx` - Landing page with feature overview

## 🔍 Code Examples

### Connecting Wallet

```typescript
import { useWallet } from "@/hooks/use-wallet";

function MyComponent() {
	const { isConnected, address, connect, disconnect } = useWallet();

	return (
		<button onClick={connect}>
			{isConnected ? `Connected: ${address}` : "Connect Wallet"}
		</button>
	);
}
```

### Minting NFT

```typescript
import { useNft } from "@/hooks/use-nft";

function MintComponent() {
	const { mintNft, minting, hasNfts } = useNft();

	const handleMint = async () => {
		const result = await mintNft();
		if (result.success) {
			console.log("NFT minted:", result.nftId);
		}
	};

	return (
		<button onClick={handleMint} disabled={minting || hasNfts}>
			{minting ? "Minting..." : "Mint NFT"}
		</button>
	);
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🤝 Contributing

### Development Workflow

1. Create feature branch from `main`
2. Follow coding standards and TypeScript best practices
3. Add proper error handling and loading states
4. Test thoroughly before submitting PR
5. Update documentation if needed

### Code Standards

-   Use TypeScript for all new code
-   Follow React hooks best practices
-   Implement proper error handling
-   Add loading states for async operations
-   Use Shadcn/ui components for consistency

## 📞 Support

If you encounter issues:

1. **Review browser console for errors**
2. **Verify environment variables are set correctly**
3. **Ensure you're on the correct network (Skynet Chain ID: 619)**
4. **Check if Web3Auth client ID is working (fallback is hardcoded)**

## 📚 Additional Resources

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Web3Auth Documentation](https://web3auth.io/docs/)
-   [Ethers.js Documentation](https://docs.ethers.io/)
-   [Skynet Documentation](https://docs.skynet.com/)
-   [Shadcn/ui Components](https://ui.shadcn.com/)
-   [Tailwind CSS](https://tailwindcss.com/docs)

---
