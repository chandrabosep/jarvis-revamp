# Skynet Boilerplate

This repository is a boilerplate for building Web3 applications with Next.js 15, focused on the Skynet blockchain. It provides a ready-to-use foundation for developers and interns to quickly start projects involving NFT minting, wallet authentication, and agent management.

## 📚 Important Documentation & Resources

-   **[Skynet Agent API Documentation](https://skynetagent-c0n525.stackos.io/api-docs)** - Complete API reference for Skynet agents
-   **[Skynet Explorer](https://explorer.skynet.io/)** - Blockchain explorer for viewing transactions, blocks, and network data
-   **[Skynet DevTools](https://preview-c0n0.stackos.io/)** - Development dashboard for managing projects and subscriptions

### Current SDK Version

-   **@decloudlabs/skynet**: `0.6.28`

## 🎯 What You'll Learn

-   **Web3 Authentication**: Connect wallets using Web3Auth with multiple provider support
-   **NFT Minting**: Mint account and agent NFTs on the Skynet blockchain
-   **Agent Management**: Create and manage AI agents with their own NFT collections
-   **Workflow Execution**: Execute workflows with automatic API key generation and real-time monitoring
-   **Status Monitoring**: Track workflow progress using request IDs and Redis-Agent service
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
├── services/             # Workflow execution services
│   ├── user-agent.service.ts      # Workflow execution with API key generation
│   ├── redis-agent.service.ts     # Status monitoring with real-time updates
│   └── workflow-manager.service.ts # Unified workflow manager
└── components/           # Additional components
    ├── workflow-executor.tsx      # Ready-to-use workflow component
    └── workflow-example.tsx       # Usage demonstration
```

## 🔄 Workflow Execution Services

The boilerplate includes a complete workflow execution system with automatic API key generation and real-time status monitoring.

### 🎯 What the Workflow Services Do

**User-Agent Service** = Generates API key → Executes workflow → Returns request ID  
**Redis-Agent Service** = Generates API key → Monitors status using request ID → Provides real-time updates  
**Workflow Manager** = Combines both services → Handles execution + monitoring → Provides unified interface

### 📊 Complete Data Flow

1. **API Key Generation** → Lighthouse Service (`${NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL}/generate-api-key`)
2. **Workflow Execution** → User-Agent Service with API key in headers
3. **Request ID Return** → Unique identifier for status monitoring
4. **Status Monitoring** → Redis-Agent Service with API key + request ID
5. **Real-time Updates** → UI components with progress and completion data

### 🚀 Quick Usage

```typescript
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";

function MyComponent() {
	const { executeWorkflow, isExecuting, currentStatus, error } =
		useWorkflowExecution();

	const handleExecute = async () => {
		await executeWorkflow({
			skyBrowser: yourSkyBrowserInstance,
			web3Context: yourWeb3Context,
			agentId: "your-agent-id",
			prompt: "Your workflow prompt",
			workflow: [
				{
					id: "1",
					type: "web_search",
					config: { query: "blockchain", maxResults: 5 },
				},
			],
			isIndividualTool: false,
		});
	};

	return (
		<div>
			<button onClick={handleExecute} disabled={isExecuting}>
				{isExecuting ? "Executing..." : "Execute Workflow"}
			</button>

			{currentStatus && (
				<div>
					Status: {currentStatus.workflowStatus}
					Progress: {currentStatus.progress}%
				</div>
			)}

			{error && <div>Error: {error}</div>}
		</div>
	);
}
```

### 🎨 Ready-to-Use Component

```typescript
import { WorkflowExecutor } from "@/components/workflow-executor";

function MyPage() {
	return (
		<WorkflowExecutor
			skyBrowser={yourSkyBrowserInstance}
			web3Context={yourWeb3Context}
			agentId="your-agent-id"
			prompt="Research blockchain technology"
			workflow={[
				{
					id: "1",
					type: "web_search",
					config: { query: "blockchain", maxResults: 5 },
				},
			]}
			isIndividualTool={false}
		/>
	);
}
```

### 🔑 Key Features

✅ **Automatic API Key Management** - No manual key handling required  
✅ **Request ID Based Monitoring** - Unique tracking for each workflow  
✅ **Real-time Status Updates** - Live progress and completion data  
✅ **Beginner-Friendly** - Simple interfaces with complex functionality  
✅ **Production Ready** - Error handling, cleanup, and resource management

### 📡 API Endpoints Used

All endpoints are configured via environment variables:

-   **Lighthouse Service**: `POST ${NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL}/generate-api-key` - API key generation
-   **User-Agent Service**: `POST ${NEXT_PUBLIC_NFT_USER_AGENT_URL}/natural-request` - Workflow execution
-   **Redis-Agent Service**: `GET ${NEXT_PUBLIC_REDIS_USER_AGENT_URL}/api/workflows/{requestId}` - Status monitoring
-   **Knowledge Base**: `POST ${NEXT_PUBLIC_KNOWLEDGE_BASE_URL}/natural-request` - Individual tool execution
-   **Knowledge Base Status**: `GET ${NEXT_PUBLIC_KNOWLEDGE_BASE_URL}/api/workflows/{requestId}` - Tool status monitoring

### 📚 Detailed Documentation

For complete workflow services documentation, see: **[WORKFLOW_SERVICES_README.md](./WORKFLOW_SERVICES_README.md)**

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

The `.env.example` file contains all required environment variables with descriptions. Key variables include:

-   **Network Configuration**: Skynet chain ID, RPC URL, and explorer URL
-   **API Endpoints**: All service URLs for workflow execution and monitoring
-   **Web3Auth Client ID**: For wallet authentication (fallback is hardcoded)
-   **API Keys**: For accessing Skynet services

**Required Environment Variables:**

```bash
# Skynet Network Configuration
NEXT_PUBLIC_SKYNET_CHAIN_ID=619
NEXT_PUBLIC_SKYNET_RPC_URL=https://rpc.skynet.io
NEXT_PUBLIC_SKYNET_EXPLORER_URL=https://explorer.skynet.io

# API Endpoints - All services
NEXT_PUBLIC_STORAGE_API_URL=https://storage-c0n499.stackos.io
NEXT_PUBLIC_SKYINTEL_API_URL=https://skynetagent-c0n525.stackos.io
NEXT_PUBLIC_NFT_USER_AGENT_URL=https://nft-user-agent-c0n499.stackos.io
NEXT_PUBLIC_REDIS_USER_AGENT_URL=https://redis-user-agent-c0n499.stackos.io
NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL=https://lighthouseservice-c0n1.stackos.io
NEXT_PUBLIC_KNOWLEDGE_BASE_URL=https://knowledgebase-c0n499.stackos.io

# Web3Auth Configuration
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=YOUR_WEB3AUTH_CLIENT_ID
```

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
-   `src/components/workflow-executor.tsx` - Ready-to-use workflow execution component
-   `src/app/page.tsx` - Landing page with feature overview

### Workflow Services

-   `src/services/user-agent.service.ts` - Workflow execution with API key generation
-   `src/services/redis-agent.service.ts` - Status monitoring with real-time updates
-   `src/services/workflow-manager.service.ts` - Unified workflow manager
-   `src/hooks/use-workflow-execution.ts` - React hook for workflow execution

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

### Executing Workflows

```typescript
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";

function WorkflowComponent() {
	const { executeWorkflow, isExecuting, currentStatus, error } =
		useWorkflowExecution();

	const handleExecute = async () => {
		await executeWorkflow({
			skyBrowser: yourSkyBrowserInstance,
			web3Context: yourWeb3Context,
			agentId: "agent-123",
			prompt: "Research blockchain technology",
			workflow: [
				{
					id: "1",
					type: "web_search",
					config: { query: "blockchain", maxResults: 5 },
				},
				{
					id: "2",
					type: "text_generation",
					config: { prompt: "Summarize the results", maxTokens: 500 },
				},
			],
			isIndividualTool: false,
		});
	};

	return (
		<div>
			<button onClick={handleExecute} disabled={isExecuting}>
				{isExecuting ? "Executing..." : "Execute Workflow"}
			</button>

			{currentStatus && (
				<div>
					Status: {currentStatus.workflowStatus}
					Progress: {currentStatus.progress}% Current Subnet: {currentStatus.currentSubnet}
				</div>
			)}

			{error && <div>Error: {error}</div>}
		</div>
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
