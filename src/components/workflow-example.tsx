import React from "react";
import { WorkflowExecutor } from "./workflow-executor";

/**
 * Workflow Example Component
 * 
 * This component demonstrates how to use the workflow execution system
 * with sample data. It shows both regular workflow execution and
 * individual tool execution.
 */
export function WorkflowExample() {
  // Sample workflow data
  const sampleWorkflow = [
    {
      id: "1",
      type: "web_search",
      config: {
        query: "Skynet blockchain technology",
        maxResults: 5
      }
    },
    {
      id: "2", 
      type: "text_generation",
      config: {
        prompt: "Summarize the search results",
        maxTokens: 500
      }
    }
  ];

  // Sample individual tool data
  const sampleTool = [
    {
      id: "1",
      type: "web_search",
      config: {
        query: "AI agents on blockchain",
        maxResults: 3
      }
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Workflow Execution Examples</h1>
        <p className="text-gray-600">
          This demonstrates how to use the user-agent and redis-agent services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Regular Workflow Execution */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Regular Workflow</h2>
          <WorkflowExecutor
            skyBrowser={null} // Replace with actual skyBrowser instance
            web3Context={null} // Replace with actual web3Context
            agentId="sample-agent-123"
            prompt="Research Skynet blockchain and generate a summary"
            workflow={sampleWorkflow}
            isIndividualTool={false}
          />
        </div>

        {/* Individual Tool Execution */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Individual Tool</h2>
          <WorkflowExecutor
            skyBrowser={null} // Replace with actual skyBrowser instance
            web3Context={null} // Replace with actual web3Context
            agentId="sample-agent-123"
            prompt="Search for AI agents on blockchain"
            workflow={sampleTool}
            isIndividualTool={true}
            activeNodeId="1"
          />
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">How to Use</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Replace <code>skyBrowser</code> with your actual Skynet browser instance</li>
          <li>Replace <code>web3Context</code> with your actual Web3 context</li>
          <li>Set your <code>agentId</code> for the workflow</li>
          <li>Provide your <code>prompt</code> and <code>workflow</code> data</li>
          <li>Click "Execute Workflow" to start execution</li>
          <li>Monitor progress and status in real-time</li>
        </ol>
      </div>

      {/* Service Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Services Used</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold">User-Agent Service</h4>
            <p className="text-gray-600">
              Handles workflow execution and authentication
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Redis-Agent Service</h4>
            <p className="text-gray-600">
              Monitors workflow status and progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 