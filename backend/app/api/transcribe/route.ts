import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ValidationError, validateAudio, transcribeAudio, extractTransaction } from "@/services/transcription/transcription.service";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audio = formData.get("audio");

        validateAudio(audio);

        const text = await transcribeAudio(audio);
        const transaction = await extractTransaction(text);

        return NextResponse.json({ text, transaction });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status =
            err instanceof OpenAI.APIError ? (err.status ?? 500) :
            err instanceof ValidationError ? err.httpStatus :
            500;

        return NextResponse.json({ error: message }, { status });
    }
}
