"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	createTestWorkflowPayload,
	validateWorkflowPayload,
	logWorkflowPayload,
} from "@/utils/workflow-test-helper";
import { WorkflowExecutionPayload } from "@/types";

export default function WorkflowTestPage() {
	const [agentId, setAgentId] = useState(
		"e0442a40-cf02-4b1a-9c18-829628883af9"
	);
	const [prompt, setPrompt] = useState("test");
	const [userAddress, setUserAddress] = useState(
		"0xbB9fBB929e1d288485256F6D36b346B122ebd4f9"
	);
	const [collectionId, setCollectionId] = useState(
		"0xB0Bdc5de822a61e46efdEA78f7688B3f6bF5fB32"
	);
	const [nftId, setNftId] = useState("534");
	const [signature, setSignature] = useState("your_signature_here");
	const [message, setMessage] = useState("your_message_here");
	const [generatedPayload, setGeneratedPayload] =
		useState<WorkflowExecutionPayload | null>(null);
	const [validationResult, setValidationResult] = useState<{
		isValid: boolean;
		errors: string[];
	} | null>(null);

	const generatePayload = () => {
		const payload = createTestWorkflowPayload(
			agentId,
			prompt,
			userAddress,
			collectionId,
			nftId,
			signature,
			message
		);
		setGeneratedPayload(payload);

		const validation = validateWorkflowPayload(payload);
		setValidationResult(validation);

		// Log to console for debugging
		logWorkflowPayload(payload, "Generated Payload");
	};

	const copyToClipboard = () => {
		if (generatedPayload) {
			navigator.clipboard.writeText(
				JSON.stringify(generatedPayload, null, 2)
			);
		}
	};

	return (
		<div className="container mx-auto p-6 max-w-4xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">
					Workflow Execution Test
				</h1>
				<p className="text-muted-foreground">
					Test and validate the complete workflow execution payload
					format
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Input Form */}
				<Card>
					<CardHeader>
						<CardTitle>Payload Parameters</CardTitle>
						<CardDescription>
							Configure the workflow execution parameters
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="agentId">Agent ID</Label>
							<Input
								id="agentId"
								value={agentId}
								onChange={(e) => setAgentId(e.target.value)}
								placeholder="Enter agent ID"
							/>
						</div>

						<div>
							<Label htmlFor="prompt">Prompt</Label>
							<Textarea
								id="prompt"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="Enter your prompt"
								rows={3}
							/>
						</div>

						<div>
							<Label htmlFor="userAddress">User Address</Label>
							<Input
								id="userAddress"
								value={userAddress}
								onChange={(e) => setUserAddress(e.target.value)}
								placeholder="Enter user wallet address"
							/>
						</div>

						<div>
							<Label htmlFor="collectionId">Collection ID</Label>
							<Input
								id="collectionId"
								value={collectionId}
								onChange={(e) =>
									setCollectionId(e.target.value)
								}
								placeholder="Enter collection ID"
							/>
						</div>

						<div>
							<Label htmlFor="nftId">NFT ID</Label>
							<Input
								id="nftId"
								value={nftId}
								onChange={(e) => setNftId(e.target.value)}
								placeholder="Enter NFT ID"
							/>
						</div>

						<div>
							<Label htmlFor="signature">Signature</Label>
							<Input
								id="signature"
								value={signature}
								onChange={(e) => setSignature(e.target.value)}
								placeholder="Enter signature"
							/>
						</div>

						<div>
							<Label htmlFor="message">Message</Label>
							<Input
								id="message"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Enter message"
							/>
						</div>

						<Button onClick={generatePayload} className="w-full">
							Generate Payload
						</Button>
					</CardContent>
				</Card>

				{/* Output Display */}
				<Card>
					<CardHeader>
						<CardTitle>Generated Payload</CardTitle>
						<CardDescription>
							The complete workflow execution payload
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{generatedPayload && (
							<>
								{validationResult && (
									<div
										className={`p-3 rounded-md ${
											validationResult.isValid
												? "bg-green-50 border border-green-200"
												: "bg-red-50 border border-red-200"
										}`}
									>
										<div
											className={`font-medium ${
												validationResult.isValid
													? "text-green-800"
													: "text-red-800"
											}`}
										>
											{validationResult.isValid
												? "✅ Valid Payload"
												: "❌ Invalid Payload"}
										</div>
										{!validationResult.isValid && (
											<ul className="mt-2 text-sm text-red-700">
												{validationResult.errors.map(
													(error, index) => (
														<li key={index}>
															• {error}
														</li>
													)
												)}
											</ul>
										)}
									</div>
								)}

								<div className="bg-gray-50 p-4 rounded-md">
									<pre className="text-sm overflow-auto max-h-96">
										{JSON.stringify(
											generatedPayload,
											null,
											2
										)}
									</pre>
								</div>

								<Button
									onClick={copyToClipboard}
									variant="outline"
									className="w-full"
								>
									Copy to Clipboard
								</Button>
							</>
						)}

						{!generatedPayload && (
							<div className="text-center text-muted-foreground py-8">
								Click "Generate Payload" to create a test
								payload
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Example Format */}
			<Card className="mt-6">
				<CardHeader>
					<CardTitle>Expected Format</CardTitle>
					<CardDescription>
						This is the exact format your API expects
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="bg-gray-50 p-4 rounded-md">
						<pre className="text-sm overflow-auto">
							{`{
  "agentId": "e0442a40-cf02-4b1a-9c18-829628883af9",
  "prompt": "test",
  "workflow": [
    {
      "itemID": "1",
      "agentCollection": {
        "agentAddress": "0xB0Bdc5de822a61e46efdEA78f7688B3f6bF5fB32",
        "agentID": "0"
      },
      "feedback": true
    }
  ],
  "userAuthPayload": {
    "userAddress": "0xbB9fBB929e1d288485256F6D36b346B122ebd4f9",
    "signature": "",
    "message": ""
  },
  "accountNFT": {
    "collectionID": "0xB0Bdc5de822a61e46efdEA78f7688B3f6bF5fB32",
    "nftID": "534"
  }
}`}
						</pre>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
