import { openai } from "@/lib/clients/openai";
import { ErrorCode, ExtractionError, ValidationError } from "@/lib/errors/app-error";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const TRANSACTION_EXTRACTION_PROMPT = `Eres un asistente financiero para adultos mayores. Analiza la siguiente frase de voz y extrae la información en formato JSON estricto con las siguientes claves:
- "monto": número (ej: 8500). Si no hay monto, pon 0.
- "tipo": "gasto" o "ingreso".
- "categoria": una de estas exactas: "Salud", "Comida", "Transporte", "Servicios", "Ingreso", "Otro".
- "descripcion": texto corto resumiendo en qué fue (ej: "Farmacia").
Devuelve ÚNICAMENTE el JSON válido, sin texto adicional.`;

export function validateAudio(audio: FormDataEntryValue | null): asserts audio is File {
    if (!audio || !(audio instanceof File)) {
        throw new ValidationError(400, ErrorCode.AUDIO_MISSING, "Missing or invalid 'audio' field");
    }
    if (audio.size === 0) {
        throw new ValidationError(400, ErrorCode.AUDIO_EMPTY, "Audio file is empty");
    }
    if (!audio.type.startsWith("audio/")) {
        throw new ValidationError(400, ErrorCode.AUDIO_INVALID_TYPE, "Invalid file type. Only audio files are allowed");
    }
    if (audio.size > MAX_SIZE_BYTES) {
        throw new ValidationError(413, ErrorCode.AUDIO_TOO_LARGE, "File too large. Maximum size is 25MB");
    }
}

export async function transcribeAudio(audio: File): Promise<string> {
    const transcription = await openai.audio.transcriptions.create({
        file: audio,
        model: "whisper-large-v3-turbo",
        language: "es",
    });

    const text = transcription.text.trim();

    if (!text) {
        throw new ValidationError(422, ErrorCode.TRANSCRIPTION_EMPTY, "Could not transcribe audio. Please try again");
    }

    return text;
}

export async function extractTransaction(text: string): Promise<object> {
    const completion = await openai.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
            { role: "system", content: TRANSACTION_EXTRACTION_PROMPT },
            { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
    });
    const content = completion.choices[0].message.content;
    try {
        return JSON.parse(content || "{}");
    } catch {
        throw new ExtractionError();
    }
}
