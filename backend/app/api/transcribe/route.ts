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

        const rawText = transcription.text;

        if (!rawText.trim()) {
            return NextResponse.json(
                { error: "Could not transcribe audio. Please try again" },
                { status: 422 }
            );
        }

        // Procesamiento con Llama 3 para extraer los datos de la transacción
        const completion = await openai.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente financiero para adultos mayores. Analiza la siguiente frase de voz y extrae la información en formato JSON estricto con las siguientes claves:
                    - "monto": número (ej: 8500). Si no hay monto, pon 0.
                    - "tipo": "gasto" o "ingreso".
                    - "categoria": una de estas exactas: "Salud", "Comida", "Transporte", "Servicios", "Ingreso", "Otro".
                    - "descripcion": texto corto resumiendo en qué fue (ej: "Farmacia").
                    Devuelve ÚNICAMENTE el JSON válido, sin texto adicional.`
                },
                {
                    role: "user",
                    content: rawText
                }
            ],
            response_format: { type: "json_object" }
        });

        const parsedData = JSON.parse(completion.choices[0].message.content || "{}");

        return NextResponse.json({
            text: rawText,
            transaction: parsedData
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status =
            err instanceof OpenAI.APIError ? (err.status ?? 500) : 500;

        return NextResponse.json({ error: message }, { status });
    }
}