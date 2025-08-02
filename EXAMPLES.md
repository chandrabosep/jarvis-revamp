# Skynet Agent Workflow Boilerplate Examples

This document provides practical examples of how to use the boilerplate for common tasks.

## 🔗 Wallet Connection

### Basic Wallet Connection

```typescript
// src/components/wallet/connect-button.tsx
import { useWeb3Auth } from "@web3auth/modal-react-hooks";

export function ConnectButton() {
	const { login, logout, isConnected } = useWeb3Auth();

	return (
		<Button onClick={isConnected ? logout : login}>
			{isConnected ? "Disconnect" : "Connect Wallet"}
		</Button>
	);
}
```

### Custom Wallet Provider

```typescript
// src/providers/Web3AuthProvider.tsx
import { Web3AuthProvider } from "@web3auth/modal-react-hooks";

export function CustomWeb3AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Web3AuthProvider config={web3AuthConfig}>{children}</Web3AuthProvider>
	);
}
```

## 🎨 UI Components

### Button Variants

```typescript
import { Button } from '@/components/ui/button'

// Default button
<Button>Click me</Button>

// Destructive button
<Button variant="destructive">Delete</Button>

// Outline button
<Button variant="outline">Secondary</Button>

// Small button
<Button size="sm">Small</Button>

// Icon button
<Button size="icon">
  <Icon />
</Button>
```

### Form Components

```typescript
import { Input, Label, Textarea } from "@/components/ui";

export function ContactForm() {
	return (
		<form className="space-y-4">
			<div>
				<Label htmlFor="name">Name</Label>
				<Input id="name" placeholder="Enter your name" />
			</div>

			<div>
				<Label htmlFor="message">Message</Label>
				<Textarea
					id="message"
					placeholder="Enter your message"
					rows={4}
				/>
			</div>

			<Button type="submit">Send Message</Button>
		</form>
	);
}
```

## 🗄️ State Management

### Using Zustand Stores

```typescript
import { useAgentStore, useExecutionStatusStore } from "@/stores";

export function AgentSelector() {
	const { selectedAgents, addAgent, removeAgent } = useAgentStore();
	const { isRunning, updateExecutionStatus } = useExecutionStatusStore();

	const handleAgentSelect = (agent: Agent) => {
		if (selectedAgents[agent.id]) {
			removeAgent(agent.id);
		} else {
			addAgent(agent);
		}
	};

	return (
		<div>
			{agents.map((agent) => (
				<div key={agent.id}>
					<input
						type="checkbox"
						checked={!!selectedAgents[agent.id]}
						onChange={() => handleAgentSelect(agent)}
					/>
					<span>{agent.name}</span>
				</div>
			))}

			{isRunning && <div>Workflow is running...</div>}
		</div>
	);
}
```

### Custom Store

```typescript
// src/stores/user-store.ts
import { create } from "zustand";

interface UserState {
	user: User | null;
	setUser: (user: User | null) => void;
	isAuthenticated: boolean;
}

export const useUserStore = create<UserState>((set) => ({
	user: null,
	isAuthenticated: false,
	setUser: (user) =>
		set({
			user,
			isAuthenticated: !!user,
		}),
}));
```

## 🔌 API Integration

### Making Authenticated API Calls

```typescript
import { apiKeyManager } from "@/utils/api-key-manager";
import { getAgents } from "@/controllers/agents";

export async function fetchUserAgents(skyBrowser: any, web3Context: any) {
	try {
		// Get API key with authentication
		const apiKey = await apiKeyManager.getApiKey(skyBrowser, web3Context);

		// Make API call
		const response = await getAgents({
			limit: 10,
			offset: 0,
			address: web3Context.address,
		});

		return response.data.agents;
	} catch (error) {
		console.error("Failed to fetch agents:", error);
		throw error;
	}
}
```

### Custom API Controller

```typescript
// src/controllers/workflows.ts
import axiosInstance from "@/lib/axios";
import { WorkflowExecutionPayload, WorkflowExecutionResponse } from "@/types";

export const executeWorkflow = async (
	payload: WorkflowExecutionPayload,
	apiKey: string
): Promise<WorkflowExecutionResponse> => {
	const response = await axiosInstance.post("/workflows/execute", payload, {
		headers: {
			"x-api-key": apiKey,
		},
	});
	return response.data;
};

export const getWorkflowStatus = async (
	requestId: string,
	apiKey: string
): Promise<WorkflowExecutionResponse> => {
	const response = await axiosInstance.get(`/workflows/${requestId}`, {
		headers: {
			"x-api-key": apiKey,
		},
	});
	return response.data;
};
```

## 🔄 Workflow Execution

### Basic Workflow Execution

```typescript
import { useWorkflowExecutor } from "@/hooks/use-workflow-executor";

export function WorkflowRunner() {
	const { executeWorkflow } = useWorkflowExecutor();
	const [isRunning, setIsRunning] = useState(false);

	const handleExecute = async () => {
		setIsRunning(true);

		try {
			const payload: WorkflowExecutionPayload = {
				prompt: "Analyze this data",
				workflow: selectedWorkflow,
			};

			await executeWorkflow(payload, skyBrowser, web3Context);
		} catch (error) {
			console.error("Workflow execution failed:", error);
		} finally {
			setIsRunning(false);
		}
	};

	return (
		<Button onClick={handleExecute} disabled={isRunning}>
			{isRunning ? "Running..." : "Execute Workflow"}
		</Button>
	);
}
```

### Real-time Status Updates

```typescript
import { useExecutionStatusStore } from "@/stores";

export function WorkflowStatus() {
	const { isRunning, currentSubnet, responseId } = useExecutionStatusStore();

	return (
		<div className="space-y-2">
			{isRunning && (
				<div className="flex items-center space-x-2">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
					<span>Workflow is running...</span>
				</div>
			)}

			{currentSubnet && (
				<div>
					<span className="text-sm text-gray-600">
						Current subnet: {currentSubnet}
					</span>
				</div>
			)}

			{responseId && (
				<div>
					<span className="text-sm text-gray-600">
						Request ID: {responseId}
					</span>
				</div>
			)}
		</div>
	);
}
```

## 🎯 NFT Management

### NFT Status Check

```typescript
import { useNFT } from "@/hooks/use-nft";

export function NFTStatus() {
	const { nftStatus, mintNFT, isLoading } = useNFT();

	if (isLoading) {
		return <div>Checking NFT status...</div>;
	}

	if (!nftStatus.hasNFT) {
		return (
			<div>
				<p>No NFT found. Mint one to continue.</p>
				<Button onClick={mintNFT}>Mint NFT</Button>
			</div>
		);
	}

	return (
		<div>
			<p>✅ NFT owned: {nftStatus.nftId}</p>
		</div>
	);
}
```

### Custom NFT Hook

```typescript
// src/hooks/use-custom-nft.ts
import { useState, useEffect } from "react";
import { ensureUserHasNFT } from "@/utils/skynetHelper";

export function useCustomNFT(skyBrowser: any, web3Context: any) {
	const [nftData, setNftData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function checkNFT() {
			try {
				const result = await ensureUserHasNFT(skyBrowser, web3Context);
				setNftData(result);
			} catch (error) {
				console.error("NFT check failed:", error);
			} finally {
				setLoading(false);
			}
		}

		if (skyBrowser && web3Context) {
			checkNFT();
		}
	}, [skyBrowser, web3Context]);

	return { nftData, loading };
}
```

## 🎨 Custom Components

### Reusable Card Component

```typescript
// src/components/ui/card.tsx
import { cn } from "@/lib/utils";

interface CardProps {
	children: React.ReactNode;
	className?: string;
	title?: string;
}

export function Card({ children, className, title }: CardProps) {
	return (
		<div className={cn("bg-white rounded-lg shadow-md p-6", className)}>
			{title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
			{children}
		</div>
	);
}
```

### Loading Component

```typescript
// src/components/ui/loading.tsx
interface LoadingProps {
	size?: "sm" | "md" | "lg";
	text?: string;
}

export function Loading({ size = "md", text = "Loading..." }: LoadingProps) {
	const sizeClasses = {
		sm: "h-4 w-4",
		md: "h-6 w-6",
		lg: "h-8 w-8",
	};

	return (
		<div className="flex items-center space-x-2">
			<div
				className={cn(
					"animate-spin rounded-full border-b-2 border-blue-600",
					sizeClasses[size]
				)}
			/>
			<span className="text-sm text-gray-600">{text}</span>
		</div>
	);
}
```

## 🔧 Utility Functions

### Custom Hook for API Calls

```typescript
// src/hooks/use-api.ts
import { useState, useEffect } from "react";
import { apiKeyManager } from "@/utils/api-key-manager";

export function useAPI<T>(
	apiCall: (apiKey: string) => Promise<T>,
	skyBrowser: any,
	web3Context: any
) {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);
				const apiKey = await apiKeyManager.getApiKey(
					skyBrowser,
					web3Context
				);
				const result = await apiCall(apiKey);
				setData(result);
			} catch (err) {
				setError(err as Error);
			} finally {
				setLoading(false);
			}
		}

		if (skyBrowser && web3Context) {
			fetchData();
		}
	}, [apiCall, skyBrowser, web3Context]);

	return { data, loading, error };
}
```

### Error Boundary Component

```typescript
// src/components/error-boundary.tsx
import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	ErrorBoundaryState
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Error caught by boundary:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
					<h2 className="text-lg font-semibold text-red-800">
						Something went wrong
					</h2>
					<p className="text-red-600 mt-2">
						{this.state.error?.message}
					</p>
				</div>
			);
		}

		return this.props.children;
	}
}
```

## 🚀 Advanced Patterns

### Compound Component Pattern

```typescript
// src/components/ui/agent-card.tsx
import { Card } from "./card";
import { Button } from "./button";

interface AgentCardProps {
	agent: Agent;
	onSelect?: (agent: Agent) => void;
	selected?: boolean;
}

export function AgentCard({ agent, onSelect, selected }: AgentCardProps) {
	return (
		<Card className="hover:shadow-lg transition-shadow">
			<div className="flex justify-between items-start">
				<div>
					<h3 className="font-semibold">{agent.name}</h3>
					<p className="text-sm text-gray-600">{agent.description}</p>
				</div>

				{onSelect && (
					<Button
						variant={selected ? "default" : "outline"}
						size="sm"
						onClick={() => onSelect(agent)}
					>
						{selected ? "Selected" : "Select"}
					</Button>
				)}
			</div>
		</Card>
	);
}
```

### Custom Hook with Dependencies

```typescript
// src/hooks/use-workflow-status.ts
import { useEffect, useState } from "react";
import { getWorkflowStatus } from "@/controllers/workflows";

export function useWorkflowStatus(
	requestId: string | null,
	apiKey: string | null,
	pollInterval: number = 2000
) {
	const [status, setStatus] = useState<WorkflowExecutionResponse | null>(
		null
	);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (!requestId || !apiKey) return;

		const interval = setInterval(async () => {
			try {
				const response = await getWorkflowStatus(requestId, apiKey);
				setStatus(response);

				// Stop polling when completed
				if (
					response.status === "completed" ||
					response.status === "error"
				) {
					clearInterval(interval);
				}
			} catch (err) {
				setError(err as Error);
				clearInterval(interval);
			}
		}, pollInterval);

		return () => clearInterval(interval);
	}, [requestId, apiKey, pollInterval]);

	return { status, error };
}
```

## 📱 Responsive Design

### Mobile-First Component

```typescript
// src/components/responsive-layout.tsx
export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="py-8">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}
```

### Responsive Navigation

```typescript
// src/components/navigation.tsx
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Navigation() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<nav className="bg-white shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center">
						<h1 className="text-xl font-semibold">Skynet Agents</h1>
					</div>

					{/* Desktop Navigation */}
					<div className="hidden md:flex items-center space-x-4">
						<a
							href="/"
							className="text-gray-700 hover:text-gray-900"
						>
							Home
						</a>
						<a
							href="/agents"
							className="text-gray-700 hover:text-gray-900"
						>
							Agents
						</a>
						<ConnectButton />
					</div>

					{/* Mobile Navigation */}
					<div className="md:hidden flex items-center">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsOpen(!isOpen)}
						>
							{isOpen ? (
								<X className="h-6 w-6" />
							) : (
								<Menu className="h-6 w-6" />
							)}
						</Button>
					</div>
				</div>

				{/* Mobile Menu */}
				{isOpen && (
					<div className="md:hidden">
						<div className="px-2 pt-2 pb-3 space-y-1">
							<a
								href="/"
								className="block px-3 py-2 text-gray-700 hover:text-gray-900"
							>
								Home
							</a>
							<a
								href="/agents"
								className="block px-3 py-2 text-gray-700 hover:text-gray-900"
							>
								Agents
							</a>
							<div className="px-3 py-2">
								<ConnectButton />
							</div>
						</div>
					</div>
				)}
			</div>
		</nav>
	);
}
```

---

These examples demonstrate the most common patterns and use cases for the Skynet Agent Workflow Boilerplate. Use them as a starting point for your own implementations!
