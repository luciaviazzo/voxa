import { POST } from "@/app/api/transcribe/route";
import { NextRequest } from "next/server";
import OpenAI from "openai";

jest.mock("openai", () => {
    const actual = jest.requireActual<typeof import("openai")>("openai");
    const createMock = jest.fn();
    const MockOpenAI = jest.fn().mockImplementation(() => ({
        audio: { transcriptions: { create: createMock } },
    })) as unknown as typeof actual.default & {
        APIError: typeof actual.default.APIError;
        _createMock: jest.Mock;
    };
    MockOpenAI.APIError = actual.default.APIError;
    MockOpenAI._createMock = createMock;
    return { __esModule: true, default: MockOpenAI };
});


const mockCreate = (): jest.Mock => (OpenAI as unknown as { _createMock: jest.Mock })._createMock;

function makeRequest(formData: FormData): NextRequest {
    return new NextRequest("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
    });
}

function audioFormData(): FormData {
    const formData = new FormData();
    const file = new File(["audio data"], "recording.m4a", { type: "audio/m4a" });
    formData.set("audio", file);
    return formData;
}

describe("POST /api/transcribe", () => {
    beforeEach(() => {
        mockCreate().mockReset();
    });

    it("devuelve 400 si no se envía el campo audio", async () => {
        const res = await POST(makeRequest(new FormData()));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ error: "Missing or invalid 'audio' field" });
    });

    it("devuelve 400 si el campo audio no es un File", async () => {
        const formData = new FormData();
        formData.set("audio", "texto plano");
        const res = await POST(makeRequest(formData));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ error: "Missing or invalid 'audio' field" });
    });

    it("devuelve 200 con el texto transcripto", async () => {
        mockCreate().mockResolvedValueOnce({ text: "hola mundo" });

        const res = await POST(makeRequest(audioFormData()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ text: "hola mundo" });
    });

    it("llama a Whisper con model whisper-large-v3-turbo y language es", async () => {
        mockCreate().mockResolvedValueOnce({ text: "prueba" });

        await POST(makeRequest(audioFormData()));

        expect(mockCreate()).toHaveBeenCalledWith(
            expect.objectContaining({ model: "whisper-large-v3-turbo", language: "es" })
        );
    });

    it("devuelve 500 si la API lanza un error genérico", async () => {
        mockCreate().mockRejectedValueOnce(new Error("network failure"));

        const res = await POST(makeRequest(audioFormData()));
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: "network failure" });
    });

    it("devuelve el status si la API lanza un APIError", async () => {
        const apiError = new OpenAI.APIError(
            401,
            { error: { message: "invalid key", type: "auth" } },
            "invalid key",
            new Headers()
        );
        mockCreate().mockRejectedValueOnce(apiError);

        const res = await POST(makeRequest(audioFormData()));
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body.error).toBeTruthy();
    });

    it("devuelve 400 si el archivo tiene tamaño 0 bytes", async () => {
        const formData = new FormData();
        const file = new File([], "recording.m4a", { type: "audio/m4a" });
        formData.set("audio", file);

        const res = await POST(makeRequest(formData));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ error: "Audio file is empty" });
    });

    it("devuelve 400 si el tipo MIME no es audio", async () => {
        const formData = new FormData();
        const file = new File(["data"], "image.png", { type: "image/png" });
        formData.set("audio", file);

        const res = await POST(makeRequest(formData));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ error: "Invalid file type. Only audio files are allowed" });
    });

    it("devuelve 413 si el archivo supera 25MB", async () => {
        const formData = new FormData();
        const bigFile = new File([new ArrayBuffer(26 * 1024 * 1024)], "big.m4a", { type: "audio/m4a" });
        formData.set("audio", bigFile);

        const res = await POST(makeRequest(formData));
        const body = await res.json();

        expect(res.status).toBe(413);
        expect(body).toEqual({ error: "File too large. Maximum size is 25MB" });
    });

    it("devuelve 422 si Whisper devuelve texto vacío", async () => {
        mockCreate().mockResolvedValueOnce({ text: "" });

        const res = await POST(makeRequest(audioFormData()));
        const body = await res.json();

        expect(res.status).toBe(422);
        expect(body).toEqual({ error: "Could not transcribe audio. Please try again" });
    });

    it("devuelve 422 si Whisper devuelve solo espacios", async () => {
        mockCreate().mockResolvedValueOnce({ text: "    " });

        const res = await POST(makeRequest(audioFormData()));
        const body = await res.json();

        expect(res.status).toBe(422);
        expect(body).toEqual({ error: "Could not transcribe audio. Please try again" });
    });

    it("devuelve 429 si la API lanza rate limit", async () => {
        const apiError = new OpenAI.APIError(
            429,
            { error: { message: "rate limit exceeded", type: "rate_limit_error" } },
            "rate limit exceeded",
            new Headers()
        );
        mockCreate().mockRejectedValueOnce(apiError);

        const res = await POST(makeRequest(audioFormData()));
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(body.error).toBeTruthy();
    });
});