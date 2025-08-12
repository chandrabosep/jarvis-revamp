import { supabase, WorkflowFeedback } from "./supabaseClient";

/**
 * Save a feedback row.
 * - Uses `upsert` on the unique `feedback_data` constraint so duplicates just update.
 */
export async function saveFeedback(args: {
	workflowId: string;
	itemId: number;
	question?: string | null;
	answer?: string | null;
	data: Record<string, any>;
}) {
	const { workflowId, itemId, question = null, answer = null, data } = args;

	const { data: row, error } = await supabase
		.from("workflow_feedback")
		.upsert(
			[
				{
					workflow_id: workflowId,
					item_id: itemId,
					feedback_question: question,
					feedback_answer: answer,
					feedback_data: data,
					// created_time defaults to now() in your DDL
				},
			],
			{ onConflict: "feedback_data" } // requires the unique constraint on feedback_data
		)
		.select("*")
		.single();

	if (error) throw error;
	return row as WorkflowFeedback;
}

/**
 * Fetch feedback ordered by created_time ASC (older first).
 * Supports optional filters + simple pagination.
 */
export async function fetchFeedbackOlderFirst(opts?: {
	workflowId?: string;
	itemId?: number;
	limit?: number;
	offset?: number;
}) {
	const { workflowId, itemId, limit = 50, offset = 0 } = opts ?? {};

	let query = supabase
		.from("workflow_feedback")
		.select("*")
		.order("created_time", { ascending: true })
		.range(offset, offset + limit - 1);

	if (workflowId) query = query.eq("workflow_id", workflowId);
	if (typeof itemId === "number") query = query.eq("item_id", itemId);

	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []) as WorkflowFeedback[];
}

/**
 * Insert-only variant (optional)
 * Use this if you want strict "insert only" instead of upsert behavior
 */
export async function saveFeedbackInsertOnly(args: {
	workflowId: string;
	itemId: number;
	question?: string | null;
	answer?: string | null;
	data: Record<string, any>;
}) {
	const { workflowId, itemId, question = null, answer = null, data } = args;

	const { data: row, error } = await supabase
		.from("workflow_feedback")
		.insert({
			workflow_id: workflowId,
			item_id: itemId,
			feedback_question: question,
			feedback_answer: answer,
			feedback_data: data,
		})
		.select("*")
		.single();

	// Unique violation safeguard (feedback_data is unique)
	if (error && (error as any).code === "23505") {
		throw new Error("Duplicate feedback_data (unique).");
	}
	if (error) throw error;
	return row as WorkflowFeedback;
}
