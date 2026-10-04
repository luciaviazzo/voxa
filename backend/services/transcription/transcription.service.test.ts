import {
    ValidationError,
    validateAudio,
    transcribeAudio,
    extractTransaction,
} from "@/services/transcription/transcription.service";
import { openai } from "@/lib/clients/openai";

jest.mock("@/lib/clients/openai", () => ({
    openai: {
        audio: { transcriptions: { create: jest.fn() } },
        chat: { completions: { create: jest.fn() } },
    },
}));

const transcriptionCreate = openai.audio.transcriptions.create as unknown as jest.Mock;
const chatCreate = openai.chat.completions.create as unknown as jest.Mock;

function audioFile(content = "audio data", type = "audio/m4a"): File {
    return new File([content], "recording.m4a", { type });
}

function expectValidationError(fn: () => void, httpStatus: number, message: string) {
    try {
        fn();
        throw new Error("Se esperaba un ValidationError");
    } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).httpStatus).toBe(httpStatus);
        expect((err as ValidationError).message).toBe(message);
    }
}

describe("ValidationError", () => {
    it("conserva el status HTTP y el mensaje", () => {
        const err = new ValidationError(418, "teapot");

        expect(err).toBeInstanceOf(Error);
        expect(err.httpStatus).toBe(418);
        expect(err.message).toBe("teapot");
    });
});

describe("validateAudio", () => {
    it("acepta un audio válido", () => {
        expect(() => validateAudio(audioFile())).not.toThrow();
    });

    it("rechaza null", () => {
        expectValidationError(() => validateAudio(null), 400, "Missing or invalid 'audio' field");
    });

    it("rechaza un string que no es File", () => {
        expectValidationError(() => validateAudio("texto"), 400, "Missing or invalid 'audio' field");
    });

    it("rechaza un archivo vacío", () => {
        expectValidationError(() => validateAudio(audioFile("")), 400, "Audio file is empty");
    });

    it("rechaza un tipo MIME que no es audio", () => {
        expectValidationError(
            () => validateAudio(audioFile("x", "image/png")),
            400,
            "Invalid file type. Only audio files are allowed"
        );
    });

    it("rechaza archivos mayores a 25MB", () => {
        const big = audioFile("x");
        Object.defineProperty(big, "size", { value: 25 * 1024 * 1024 + 1 });

        expectValidationError(() => validateAudio(big), 413, "File too large. Maximum size is 25MB");
    });

    it("acepta un archivo de exactamente 25MB", () => {
        const limit = audioFile("x");
        Object.defineProperty(limit, "size", { value: 25 * 1024 * 1024 });

        expect(() => validateAudio(limit)).not.toThrow();
    });
});

describe("transcribeAudio", () => {
    beforeEach(() => transcriptionCreate.mockReset());

    it("pide la transcripción en español al modelo de Whisper", async () => {
        transcriptionCreate.mockResolvedValue({ text: "hola" });
        const file = audioFile();

        await transcribeAudio(file);

        expect(transcriptionCreate).toHaveBeenCalledWith({
            file,
            model: "whisper-large-v3-turbo",
            language: "es",
        });
    });

    it("devuelve el texto sin espacios sobrantes", async () => {
        transcriptionCreate.mockResolvedValue({ text: "  gasté 500  \n" });

        await expect(transcribeAudio(audioFile())).resolves.toBe("gasté 500");
    });

    it("lanza ValidationError 422 si la transcripción queda vacía", async () => {
        transcriptionCreate.mockResolvedValue({ text: "   " });

        await expect(transcribeAudio(audioFile())).rejects.toMatchObject({
            httpStatus: 422,
            message: "Could not transcribe audio. Please try again",
        });
    });

    it("propaga los errores del proveedor", async () => {
        transcriptionCreate.mockRejectedValue(new Error("boom"));

        await expect(transcribeAudio(audioFile())).rejects.toThrow("boom");
    });
});

describe("extractTransaction", () => {
    beforeEach(() => chatCreate.mockReset());

    it("devuelve el JSON parseado del modelo", async () => {
        const transaction = { monto: 8500, tipo: "gasto", categoria: "Salud", descripcion: "Farmacia" };
        chatCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(transaction) } }] });

        await expect(extractTransaction("gasté 8500 en la farmacia")).resolves.toEqual(transaction);
    });

    it("envía el texto del usuario y pide formato JSON", async () => {
        chatCreate.mockResolvedValue({ choices: [{ message: { content: "{}" } }] });

        await extractTransaction("cobré la jubilación");

        const args = chatCreate.mock.calls[0][0];
        expect(args.model).toBe("llama-3.1-8b-instant");
        expect(args.response_format).toEqual({ type: "json_object" });
        expect(args.messages[0].role).toBe("system");
        expect(args.messages[1]).toEqual({ role: "user", content: "cobré la jubilación" });
    });

    it("devuelve un objeto vacío si el modelo no devuelve contenido", async () => {
        chatCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

        await expect(extractTransaction("hola")).resolves.toEqual({});
    });

    it("falla si el modelo devuelve un JSON inválido", async () => {
        chatCreate.mockResolvedValue({ choices: [{ message: { content: "no es json" } }] });

        await expect(extractTransaction("hola")).rejects.toThrow(SyntaxError);
    });

    it("propaga los errores del proveedor", async () => {
        chatCreate.mockRejectedValue(new Error("boom"));

        await expect(extractTransaction("hola")).rejects.toThrow("boom");
    });
});
