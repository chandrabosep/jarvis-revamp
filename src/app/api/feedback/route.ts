import { NextResponse } from "next/server";
import { saveFeedback, fetchFeedbackOlderFirst } from "@/lib/feedback";

export async function POST(req: Request) {
	const body = await req.json(); // { workflowId, itemId, question, answer, data }
	const row = await saveFeedback(body);
	return NextResponse.json(row);
}

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const workflowId = searchParams.get("workflowId") ?? undefined;
	const itemId = searchParams.get("itemId");
	const limit = Number(searchParams.get("limit") ?? 50);
	const offset = Number(searchParams.get("offset") ?? 0);

	const rows = await fetchFeedbackOlderFirst({
		workflowId,
		itemId: itemId ? Number(itemId) : undefined,
		limit,
		offset,
	});

	return NextResponse.json(rows);
}
