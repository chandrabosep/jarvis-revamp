# Skynet Agent Workflow Boilerplate Architecture

This document provides a comprehensive overview of the boilerplate architecture, design decisions, and implementation details.

## 🏗️ Architecture Overview

The boilerplate follows a modern, scalable architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │   Pages     │ │ Components  │ │   Providers │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │   Hooks     │ │   Stores    │ │  Utilities  │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Controllers │ │   Config    │ │    Types    │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    External Services                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │   Skynet    │ │  Web3Auth   │ │    APIs     │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

### `/src/app/` - Next.js App Router

-   **`layout.tsx`**: Root layout with providers and global styles
-   **`page.tsx`**: Main dashboard page
-   **`agents/page.tsx`**: Agent listing page
-   **`globals.css`**: Global Tailwind CSS styles

### `/src/components/` - React Components

-   **`ui/`**: Reusable UI components (Button, Input, Label, etc.)
-   **`nft/`**: NFT-related components (MintButton, NFTStatus)
-   **`wallet/`**: Wallet connection components (ConnectButton)

### `/src/stores/` - State Management

-   **`agent-store.ts`**: Agent selection and management state
-   **`execution-status-store.ts`**: Workflow execution status
-   **`ui-store.ts`**: UI state and notifications
-   **`workflow-store.ts`**: Workflow configuration state
-   **`index.ts`**: Centralized store exports

### `/src/utils/` - Business Logic

-   **`api-key-manager.ts`**: API key generation and caching
-   **`workflow-executor.ts`**: HTTP-based workflow execution
-   **`skynetHelper.ts`**: Skynet blockchain interactions
-   **`rpc/web3RPC.ts`**: Web3 RPC utilities

### `/src/hooks/` - Custom React Hooks

-   **`use-workflow-executor.ts`**: Workflow execution hook
-   **`use-wallet.ts`**: Wallet connection hook
-   **`use-nft.ts`**: NFT management hook

### `/src/controllers/` - API Controllers

-   **`agents.ts`**: Agent API endpoints and mutations

### `/src/config/` - Configuration

-   **`constants.ts`**: Application constants and endpoints
-   **`web3AuthConfig.ts`**: Web3Auth configuration

### `/src/types/` - TypeScript Definitions

-   **`index.ts`**: All TypeScript interfaces and types

### `/src/providers/` - Context Providers

-   **`Web3AuthProvider.tsx`**: Web3Auth context provider

## 🔄 Data Flow

### 1. User Authentication Flow

```
User → ConnectButton → Web3AuthProvider → Wallet Connection → NFT Verification → API Key Generation
```

### 2. Workflow Execution Flow

```
User Input → WorkflowExecutor → HTTP POST → Polling → Status Updates → UI Updates
```

### 3. Agent Management Flow

```
Agent Selection → Store Update → API Call → Response → UI Update
```

## 🗄️ State Management

### Zustand Stores Architecture

The application uses Zustand for state management with the following stores:

#### Agent Store (`agent-store.ts`)

```typescript
interface AgentState {
	selectedAgents: { [id: string]: any };

	setSelectedAgents: (agents: { [id: string]: any }) => void;
	addAgent: (agent: any) => void;
	removeAgent: (agentId: string) => void;
	reset: () => void;
}
```

#### Execution Status Store (`execution-status-store.ts`)

```typescript
interface ExecutionStatusState {
	isRunning: boolean;
	responseId: string | null;
	currentSubnet: string | null;

	updateExecutionStatus: (status: Partial<ExecutionStatusState>) => void;
	reset: () => void;
}
```

#### UI Store (`ui-store.ts`)

```typescript
interface UIState {
	isRunning: boolean;
	status: string;
	message: string;

	updateTestStatus: (status: Partial<UIState>) => void;
	reset: () => void;
}
```

## 🔌 API Integration

### HTTP-based Workflow Execution

The boilerplate uses HTTP POST + Polling pattern for workflow execution:

1. **Initiate Workflow**: HTTP POST to full workflow endpoint
2. **Get Request ID**: Extract request ID from response
3. **Poll Status**: 2-second intervals to check status
4. **Update UI**: Real-time status updates to UI

### API Key Management

Centralized API key management with caching:

```typescript
class ApiKeyManager {
	private cachedApiKey: string | null = null;

	async getApiKey(skyBrowser: any, web3Context: any): Promise<string>;
	private async generateNewApiKey(
		skyBrowser: any,
		web3Context: any
	): Promise<string>;
	private isApiKeyValid(data: any): boolean;
	public clearCache(): void;
}
```

## 🌐 Web3 Integration

### Web3Auth Configuration

The boilerplate uses Web3Auth for secure wallet connections:

```typescript
const web3AuthConfig = {
	clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
	web3AuthNetwork: "testnet",
	chainConfig: {
		chainNamespace: "eip155",
		chainId: "0x1",
		rpcTarget: process.env.NEXT_PUBLIC_RPC_URL,
	},
};
```

### Skynet Blockchain Integration

Direct integration with Skynet blockchain:

```typescript
// NFT minting and verification
const nftResult = await ensureUserHasNFT(skyBrowser, web3Context);

// API key generation
const apiKey = await apiKeyManager.getApiKey(skyBrowser, web3Context);
```

## 🔒 Security Architecture

### Authentication Flow

1. **Wallet Connection**: Web3Auth handles wallet connections
2. **NFT Verification**: Verify user has required NFT
3. **API Key Generation**: Generate NFT-gated API keys
4. **Request Authentication**: Include API key in all requests

### Data Protection

-   **Environment Variables**: All sensitive data in `.env.local`
-   **API Key Caching**: Secure caching with expiration
-   **HTTPS Only**: All external API calls use HTTPS
-   **Input Validation**: TypeScript types ensure data integrity

## 🎨 UI/UX Architecture

### Component Design System

The boilerplate includes a comprehensive UI component system:

#### Base Components

-   **Button**: Multiple variants (default, destructive, outline, etc.)
-   **Input**: Form inputs with validation states
-   **Label**: Accessible form labels
-   **Textarea**: Multi-line text inputs

#### Specialized Components

-   **ConnectButton**: Wallet connection with Web3Auth
-   **MintButton**: NFT minting functionality
-   **NFTStatus**: NFT ownership status display

### Styling Architecture

-   **Tailwind CSS**: Utility-first CSS framework
-   **Radix UI**: Accessible component primitives
-   **Lucide React**: Icon library
-   **Class Variance Authority**: Component variant management

## 🚀 Performance Optimizations

### Code Splitting

-   **Next.js App Router**: Automatic code splitting
-   **Dynamic Imports**: Lazy loading of components
-   **Bundle Analysis**: Built-in bundle analysis

### Caching Strategy

-   **API Key Caching**: 24-hour cache with localStorage
-   **Component Memoization**: React.memo for expensive components
-   **Store Optimization**: Zustand with subscribeWithSelector

### Network Optimization

-   **HTTP Polling**: Efficient 2-second intervals
-   **Request Deduplication**: Prevent duplicate API calls
-   **Error Handling**: Graceful fallbacks and retries

## 🔧 Development Workflow

### Local Development

1. **Environment Setup**: Copy `env.example` to `.env.local`
2. **Dependencies**: `npm install`
3. **Development Server**: `npm run dev`
4. **Linting**: `npm run lint`
5. **Build Check**: `npm run build`

### Testing Strategy

-   **TypeScript**: Compile-time type checking
-   **ESLint**: Code quality and consistency
-   **Manual Testing**: Component and integration testing

### Deployment

-   **Vercel**: Recommended deployment platform
-   **Environment Variables**: Configure in deployment platform
-   **Build Optimization**: Automatic build optimization

## 📊 Monitoring and Debugging

### Error Handling

-   **Global Error Boundary**: Catch and handle errors gracefully
-   **API Error Handling**: Consistent error responses
-   **User Feedback**: Toast notifications for user actions

### Logging

-   **Console Logging**: Development debugging
-   **Error Tracking**: Error boundary logging
-   **Performance Monitoring**: Bundle analysis

## 🔄 Future Enhancements

### Planned Features

-   **Real-time Collaboration**: Multi-user agent editing
-   **Advanced Analytics**: Workflow performance metrics
-   **Plugin System**: Extensible agent capabilities
-   **Mobile Support**: Responsive design improvements

### Scalability Considerations

-   **Microservices**: API service separation
-   **Database Integration**: Persistent data storage
-   **CDN Integration**: Static asset optimization
-   **Load Balancing**: Horizontal scaling support

## 📚 Additional Resources

-   **Next.js Documentation**: https://nextjs.org/docs
-   **Zustand Documentation**: https://github.com/pmndrs/zustand
-   **Web3Auth Documentation**: https://web3auth.io/docs
-   **Skynet Documentation**: https://docs.skynetlabs.com
-   **Tailwind CSS Documentation**: https://tailwindcss.com/docs

---

This architecture provides a solid foundation for building scalable, maintainable Skynet agent workflow applications.
