import { NextRequest, NextResponse } from "next/server";
import { validateAudio, transcribeAudio, extractTransaction } from "@/services/transcription/transcription.service";
import { toErrorResponse } from "@/lib/errors/to-error-response";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audio = formData.get("audio");
        validateAudio(audio);
        const text = await transcribeAudio(audio);
        const transaction = await extractTransaction(text);
        return NextResponse.json({ text, transaction });
    } catch (err: unknown) {
        const { status, body } = toErrorResponse(err);
        return NextResponse.json(body, { status });
    }
}
