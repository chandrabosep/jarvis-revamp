import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
	{
		auth: { persistSession: false }, // no auth needed for anon-only writes/reads
	}
);

// (optional) row type for convenience
export type WorkflowFeedback = {
	workflow_id: string;
	item_id: number;
	feedback_question: string | null;
	feedback_answer: string | null;
	feedback_data: Record<string, any>; // or unknown
	created_time: string; // timestamptz ISO
};
