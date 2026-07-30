import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audio = formData.get("audio");

        if (!audio || !(audio instanceof File)) {
            return NextResponse.json(
                { error: "Missing or invalid 'audio' field" },
                { status: 400 }
            );
        }

        if (audio.size === 0) {
            return NextResponse.json(
                { error: "Audio file is empty" },
                { status: 400 }
            );
        }

        if (!audio.type.startsWith("audio/")) {
            return NextResponse.json(
                { error: "Invalid file type. Only audio files are allowed" },
                { status: 400 }
            );
        }

        if (audio.size > MAX_SIZE_BYTES) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 25MB" },
                { status: 413 }
            );
        }

        const transcription = await openai.audio.transcriptions.create({
            file: audio,
            model: "whisper-large-v3-turbo",
            language: "es",
        });

        if (!transcription.text.trim()) {
            return NextResponse.json(
                { error: "Could not transcribe audio. Please try again" },
                { status: 422 }
            );
        }

        return NextResponse.json({ text: transcription.text });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status =
            err instanceof OpenAI.APIError ? (err.status ?? 500) : 500;

        return NextResponse.json({ error: message }, { status });
    }
}