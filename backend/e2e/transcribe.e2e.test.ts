import http from "node:http";
import { AddressInfo } from "node:net";
import { NextRequest } from "next/server";

type GroqBehavior = {
    transcriptionStatus: number;
    transcriptionBody: unknown;
    chatStatus: number;
    chatBody: unknown;
};

const TRANSACTION = { monto: 8500, tipo: "gasto", categoria: "Salud", descripcion: "Farmacia" };

const happyPath = (): GroqBehavior => ({
    transcriptionStatus: 200,
    transcriptionBody: { text: "  gasté 8500 en la farmacia " },
    chatStatus: 200,
    chatBody: { choices: [{ message: { content: JSON.stringify(TRANSACTION) } }] },
});

let behavior: GroqBehavior;
let receivedPaths: string[];
let server: http.Server;
let POST: (req: NextRequest) => Promise<Response>;

beforeAll(async () => {
    server = http.createServer((req, res) => {
        receivedPaths.push(req.url ?? "");
        req.resume();
        req.on("end", () => {
            const isTranscription = req.url?.endsWith("/audio/transcriptions");
            const status = isTranscription ? behavior.transcriptionStatus : behavior.chatStatus;
            const body = isTranscription ? behavior.transcriptionBody : behavior.chatBody;
            res.writeHead(status, { "Content-Type": "application/json" });
            res.end(JSON.stringify(body));
        });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    const { port } = server.address() as AddressInfo;
    process.env.GROQ_BASE_URL = `http://127.0.0.1:${port}/openai/v1`;
    process.env.GROQ_API_KEY = "test-key";

    ({ POST } = await import("@/app/api/transcribe/route"));
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
    behavior = happyPath();
    receivedPaths = [];
});

function request(audio?: File): NextRequest {
    const formData = new FormData();
    if (audio) formData.set("audio", audio);
    return new NextRequest("http://localhost/api/transcribe", { method: "POST", body: formData });
}

const validAudio = () => new File(["audio data"], "recording.m4a", { type: "audio/m4a" });

describe("E2E POST /api/transcribe (route + servicio + cliente real, Groq simulado por HTTP)", () => {
    it("transcribe el audio, extrae la transacción y devuelve ambos", async () => {
        const res = await POST(request(validAudio()));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ text: "gasté 8500 en la farmacia", transaction: TRANSACTION });
    });

    it("llama primero a Whisper y después al modelo de chat", async () => {
        await POST(request(validAudio()));

        expect(receivedPaths).toHaveLength(2);
        expect(receivedPaths[0]).toMatch(/\/audio\/transcriptions$/);
        expect(receivedPaths[1]).toMatch(/\/chat\/completions$/);
    });

    it("no llama a Groq si el audio es inválido", async () => {
        const res = await POST(request());

        expect(res.status).toBe(400);
        expect(receivedPaths).toHaveLength(0);
    });

    it("devuelve 422 y no llama al modelo de chat si la transcripción está vacía", async () => {
        behavior.transcriptionBody = { text: "" };

        const res = await POST(request(validAudio()));

        expect(res.status).toBe(422);
        expect(receivedPaths).toHaveLength(1);
    });

    it("propaga el 429 cuando Groq limita el uso", async () => {
        behavior.transcriptionStatus = 429;
        behavior.transcriptionBody = { error: { message: "Rate limit" } };

        const res = await POST(request(validAudio()));

        expect(res.status).toBe(429);
    });

    it("devuelve 500 si el modelo responde algo que no es JSON", async () => {
        behavior.chatBody = { choices: [{ message: { content: "no es json" } }] };

        const res = await POST(request(validAudio()));

        expect(res.status).toBe(500);
        expect(await res.json()).toHaveProperty("error");
    });
});
