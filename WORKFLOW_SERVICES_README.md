# User-Agent and Redis-Agent Services for Skynet

This implementation provides a simple, beginner-friendly way to execute workflows and monitor their status on the Skynet network using automatic API key generation and real-time status monitoring.

## 🎯 What This Does

### User-Agent Service

-   **Purpose**: Executes workflows on the Skynet network
-   **What it does**:
    -   Authenticates users
    -   Ensures users have required NFTs
    -   Sends workflow execution requests
    -   Returns execution status

### Redis-Agent Service

-   **Purpose**: Monitors workflow execution status
-   **What it does**:
    -   Checks workflow progress in real-time
    -   Provides status updates
    -   Manages polling intervals
    -   Handles completion and errors

## 📁 File Structure

```
src/
├── services/
│   ├── user-agent.service.ts      # Workflow execution service
│   ├── redis-agent.service.ts     # Status monitoring service
│   └── workflow-manager.service.ts # Unified workflow manager
├── hooks/
│   └── use-workflow-execution.ts  # React hook for easy usage
└── components/
    ├── workflow-executor.tsx      # Example component
    └── workflow-example.tsx       # Usage demonstration
```

## 🚀 Quick Start

### 1. Basic Usage

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
				// Your workflow data
			],
			isIndividualTool: false, // Set to true for single tool execution
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

### 2. Using the WorkflowExecutor Component

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

## 🔧 Services Explained

### User-Agent Service (`user-agent.service.ts`)

**What it does:**

-   **Generates API keys** automatically using Lighthouse Service
-   **Executes workflows** on Skynet with API key authentication
-   **Handles user authentication** and NFT verification
-   **Returns request ID** for status monitoring
-   **Manages API requests** with proper headers

**Key Methods:**

```typescript
// Execute a full workflow with automatic API key generation
await userAgentService.executeWorkflow(skyBrowser, web3Context, {
  agentId: "agent-123",
  prompt: "Your prompt",
  workflow: [...]
});

// Execute a single tool with API key
await userAgentService.executeIndividualTool(skyBrowser, web3Context, {
  prompt: "Your prompt",
  workflow: [...],
  activeNodeId: "node-1"
});
```

**Internal Process:**

1. Generate API key from Lighthouse Service
2. Authenticate user and verify NFT
3. Send workflow request with API key in headers
4. Return request ID for monitoring

### Redis-Agent Service (`redis-agent.service.ts`)

**What it does:**

-   **Generates API keys** automatically for status requests
-   **Monitors workflow execution** using request ID
-   **Provides real-time updates** via RESTful API
-   **Manages polling intervals** with cleanup
-   **Handles completion events** and errors

**Key Methods:**

```typescript
// Check status once with API key
const status = await redisAgentService.getWorkflowStatus(
	skyBrowser,
	web3Context,
	requestId
);

// Start continuous monitoring with API key
const cleanup = redisAgentService.startPolling(
	skyBrowser,
	web3Context,
	requestId,
	onStatusUpdate,
	onComplete,
	onError
);
```

**API Endpoints Used:**

-   `GET /api/workflows/{requestId}` - Get workflow status
-   `GET /api/workflows/{requestId}` - Get individual tool status
-   All requests include `x-api-key` header

**Internal Process:**

1. Generate API key from Lighthouse Service
2. Use request ID to check workflow status
3. Poll for updates until completion
4. Provide real-time progress data

### Workflow Manager Service (`workflow-manager.service.ts`)

**What it does:**

-   Combines user-agent and redis-agent services
-   Provides unified interface
-   Handles execution and monitoring together
-   Manages cleanup

**Key Methods:**

```typescript
// Execute with automatic monitoring
const result = await workflowManagerService.executeWorkflow({
	skyBrowser,
	web3Context,
	agentId,
	prompt,
	workflow,
	onStatusUpdate: (status) => console.log(status),
	onComplete: (status) => console.log("Done!", status),
	onError: (error) => console.error(error),
});
```

## 🎣 React Hook (`use-workflow-execution.ts`)

**What it does:**

-   Provides React state management
-   Handles execution lifecycle
-   Manages cleanup automatically
-   Provides simple interface

**Features:**

-   `executeWorkflow()` - Start workflow execution
-   `isExecuting` - Current execution state
-   `currentStatus` - Latest status update
-   `error` - Any error messages
-   `stopExecution()` - Stop current execution
-   `clearError()` - Clear error state

## 🎨 Example Component (`workflow-executor.tsx`)

**What it provides:**

-   Ready-to-use UI component
-   Progress tracking
-   Status badges
-   Error handling
-   Stop execution button

## 🔄 Complete Workflow Execution Flow

### Detailed Process Flow

1. **User clicks "Execute"**
2. **API Key Generation:**

    - Authenticate user with Skynet
    - Verify NFT ownership
    - Generate API key from Lighthouse Service
    - Store API key for all subsequent requests

3. **User-Agent Service (Workflow Execution):**

    - Send workflow request with API key in headers
    - Receive unique request ID for monitoring
    - Return execution status and request ID

4. **Redis-Agent Service (Status Monitoring):**

    - Use request ID to check workflow status
    - Poll for real-time updates with API key
    - Provide progress, completion, and error data

5. **UI Updates:**
    - Display real-time progress
    - Show current subnet and completion status
    - Handle errors and completion events

### Data Flow Diagram

```
User Click → API Key Generation → Workflow Execution → Request ID → Status Monitoring → UI Updates
     ↓              ↓                    ↓                ↓              ↓              ↓
  React Hook → Lighthouse Service → User-Agent API → Redis-Agent API → Real-time Data → Progress Display
```

### Request ID Lifecycle

1. **Generated**: When workflow execution starts
2. **Used**: For all status monitoring requests
3. **Monitored**: Until workflow completes or fails
4. **Cleaned up**: When polling stops

## 📊 Status Types

```typescript
type WorkflowStatus = {
	requestId: string;
	workflowStatus: "pending" | "in_progress" | "completed" | "failed";
	currentSubnet?: string;
	completedSubnets?: string[];
	totalSubnets?: number;
	progress?: number;
	result?: any;
	error?: string;
	timestamp?: string;
};
```

## 🛠️ Environment Variables

All API endpoints are configured through environment variables. Add these to your `.env.local`:

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

**Copy the example file:**

```bash
cp .env.example .env.local
```

## 🔑 API Key Generation & Authentication

### How API Keys Work

The system automatically generates API keys for all requests using the Lighthouse Service:

```typescript
// API Key Generation Process
const genResponse = await axios.post(
	`https://lighthouseservice-c0n1.stackos.io/generate-api-key`,
	{
		userAuthPayload: JSON.stringify(auth.data),
		accountNFT: JSON.stringify({
			collectionID: "0",
			nftID: nftResult.nftId!,
		}),
	},
	{
		headers: { "Content-Type": "application/json" },
	}
);

const apiKey = genResponse.data.data.apiKey;
```

### Request Flow with API Keys

1. **Generate API Key** → User authentication + NFT verification
2. **Execute Workflow** → User-Agent service with API key in headers
3. **Get Request ID** → Returned from workflow execution
4. **Monitor Status** → Redis-Agent service with API key + request ID

### API Key Usage in Headers

```typescript
headers: {
  "Content-Type": "application/json",
  "x-api-key": apiKey, // Automatically generated
}
```

## 🔄 Complete Workflow Execution Process

### Step-by-Step Flow

1. **API Key Generation**

    - Authenticate user with Skynet
    - Verify NFT ownership
    - Generate API key from Lighthouse Service
    - Store API key for request

2. **Workflow Execution (User-Agent)**

    - Send workflow request with API key
    - Receive request ID for monitoring
    - Return execution status

3. **Status Monitoring (Redis-Agent)**
    - Use request ID to check status
    - Poll for real-time updates
    - Provide progress and completion data

### Request ID Flow

```typescript
// 1. Execute workflow and get request ID
const result = await userAgentService.executeWorkflow(skyBrowser, web3Context, {
  agentId: "agent-123",
  prompt: "Your prompt",
  workflow: [...]
});

const requestId = result.requestId; // ← This is what you get back

// 2. Use request ID to monitor status
const status = await redisAgentService.getWorkflowStatus(
  skyBrowser, web3Context, requestId
);
```

## 📡 Redis-Agent API Endpoints

### Base Configuration

-   **Base URL**: `https://redis-user-agent-c0n499.stackos.io/api`
-   **Authentication**: All requests require `x-api-key` header
-   **Content-Type**: `application/json`

### Available Endpoints

#### 1. Get Workflow Status

```
GET /api/workflows/{requestId}
```

**Description**: Retrieves the current status and progress of a specific workflow.

**Headers**:

```javascript
headers: {
  'x-api-key': 'your-api-key-here',
  'Content-Type': 'application/json'
}
```

**Response**:

```typescript
{
  requestId: string;
  workflowStatus: "pending" | "in_progress" | "completed" | "failed";
  currentSubnet?: string;
  completedSubnets?: string[];
  totalSubnets?: number;
  progress?: number;
  result?: any;
  error?: string;
  timestamp?: string;
}
```

## 🎯 Key Features

### ✅ Automatic API Key Management

-   No manual key handling required
-   Secure authentication per request
-   Transparent to end users

### ✅ Request ID Based Monitoring

-   Unique request ID for each workflow
-   Real-time status tracking
-   Progress and completion data

### ✅ Simple & Clean

-   Minimal code with clear separation
-   Beginner-friendly interfaces
-   Comprehensive documentation

### ✅ Optimized

-   Singleton pattern for services
-   Efficient polling with cleanup
-   Resource management

### ✅ Error Handling

-   Comprehensive error handling
-   User-friendly error messages
-   Graceful failure recovery

### ✅ Type Safety

-   Full TypeScript support
-   Proper interfaces
-   Type checking

### ✅ Reusable

-   Modular design
-   Easy integration
-   Flexible configuration

## 🚨 Important Notes

1. **NFT Requirement**: Users must own an NFT to execute workflows
2. **Authentication**: Automatic user authentication is handled
3. **Polling**: Status is checked every 2 seconds by default
4. **Cleanup**: Automatic cleanup on component unmount
5. **Error Recovery**: Failed executions can be retried

## 🔧 Customization

### Change Polling Interval

```typescript
const cleanup = redisAgentService.startPolling(
	skyBrowser,
	web3Context,
	requestId,
	onStatusUpdate,
	onComplete,
	onError,
	false, // isIndividualTool
	5000 // pollInterval in milliseconds
);
```

### Custom Error Handling

```typescript
const { executeWorkflow, error } = useWorkflowExecution();

useEffect(() => {
	if (error) {
		// Handle error your way
		console.error("Workflow error:", error);
	}
}, [error]);
```

### Custom Status Handling

```typescript
const { currentStatus } = useWorkflowExecution();

useEffect(() => {
	if (currentStatus?.workflowStatus === "completed") {
		// Handle completion
		console.log("Workflow completed:", currentStatus.result);
	}
}, [currentStatus]);
```

## 🎉 Complete Implementation Summary

This implementation provides everything you need to execute workflows and monitor their status on the Skynet network with automatic API key generation and real-time status monitoring.

### 🔑 **Core Components**

**User-Agent Service** = Generates API key → Executes workflow → Returns request ID  
**Redis-Agent Service** = Generates API key → Monitors status using request ID → Provides real-time updates  
**Workflow Manager** = Combines both services → Handles execution + monitoring → Provides unified interface  
**React Hook** = Easy to use in components → Automatic state management → Cleanup handling

### 📊 **Complete Data Flow**

1. **API Key Generation** → Lighthouse Service (`${NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL}/generate-api-key`)
2. **Workflow Execution** → User-Agent Service with API key in headers
3. **Request ID Return** → Unique identifier for status monitoring
4. **Status Monitoring** → Redis-Agent Service with API key + request ID
5. **Real-time Updates** → UI components with progress and completion data

### 🚀 **Key Benefits**

✅ **Automatic API Key Management** - No manual key handling required  
✅ **Request ID Based Monitoring** - Unique tracking for each workflow  
✅ **Real-time Status Updates** - Live progress and completion data  
✅ **Beginner-Friendly** - Simple interfaces with complex functionality  
✅ **Production Ready** - Error handling, cleanup, and resource management

### 🔧 **Technical Features**

-   **Singleton Pattern** - Efficient service management
-   **Automatic Cleanup** - Resource management on unmount
-   **Error Recovery** - Graceful failure handling
-   **Type Safety** - Full TypeScript support
-   **Modular Design** - Easy to extend and customize

### 📡 **API Endpoints Used**

All endpoints are configured via environment variables:

-   **Lighthouse Service**: `POST ${NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL}/generate-api-key` - API key generation
-   **User-Agent Service**: `POST ${NEXT_PUBLIC_NFT_USER_AGENT_URL}/natural-request` - Workflow execution
-   **Redis-Agent Service**: `GET ${NEXT_PUBLIC_REDIS_USER_AGENT_URL}/api/workflows/{requestId}` - Status monitoring
-   **Knowledge Base**: `POST ${NEXT_PUBLIC_KNOWLEDGE_BASE_URL}/natural-request` - Individual tool execution
-   **Knowledge Base Status**: `GET ${NEXT_PUBLIC_KNOWLEDGE_BASE_URL}/api/workflows/{requestId}` - Tool status monitoring

### 🎯 **Ready to Use**

The implementation is **simple enough for beginners** but **powerful enough for production**. Users with zero knowledge can understand and use it immediately, while advanced users can customize it as needed.

**Start with the React hook, use the WorkflowExecutor component, or build your own with the services!**

Happy coding! 🚀
