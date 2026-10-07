import OpenAI from "openai";
import { AppError, ErrorCode, ExtractionError, ValidationError } from "@/lib/errors/app-error";
import { toErrorResponse } from "@/lib/errors/to-error-response";

function providerError(status: number | undefined, message: string) {
    return new OpenAI.APIError(status, { error: { message } }, message, new Headers());
}

describe("AppError", () => {
    it("conserva status HTTP, código y mensaje", () => {
        const err = new AppError(418, ErrorCode.INTERNAL_ERROR, "teapot");

        expect(err).toBeInstanceOf(Error);
        expect(err.httpStatus).toBe(418);
        expect(err.code).toBe("INTERNAL_ERROR");
        expect(err.message).toBe("teapot");
    });

    it("ValidationError y ExtractionError son AppError", () => {
        expect(new ValidationError(400, ErrorCode.AUDIO_EMPTY, "x")).toBeInstanceOf(AppError);
        expect(new ExtractionError()).toMatchObject({ httpStatus: 502, code: "TRANSACTION_EXTRACTION_FAILED" });
    });
});

describe("toErrorResponse", () => {
    it("usa status, código y mensaje de un AppError", () => {
        const result = toErrorResponse(new ValidationError(413, ErrorCode.AUDIO_TOO_LARGE, "too big"));

        expect(result).toEqual({ status: 413, body: { error: "too big", code: "AUDIO_TOO_LARGE" } });
    });

    it("traduce el 429 del proveedor a RATE_LIMITED sin exponer su mensaje", () => {
        const result = toErrorResponse(providerError(429, "org-123 exceeded quota"));

        expect(result).toEqual({
            status: 429,
            body: { error: "Rate limit exceeded. Please try again later", code: "RATE_LIMITED" },
        });
    });

    it("traduce otros errores del proveedor a PROVIDER_ERROR sin exponer su mensaje", () => {
        const result = toErrorResponse(providerError(401, "invalid key sk-secret"));

        expect(result).toEqual({
            status: 401,
            body: { error: "Transcription provider error", code: "PROVIDER_ERROR" },
        });
        expect(JSON.stringify(result)).not.toContain("sk-secret");
    });

    it("usa 500 si el error del proveedor no trae status", () => {
        expect(toErrorResponse(providerError(undefined, "sin conexión")).status).toBe(500);
    });

    it("oculta el mensaje de errores inesperados", () => {
        const result = toErrorResponse(new Error("detalle interno: /var/secret"));

        expect(result).toEqual({ status: 500, body: { error: "Internal server error", code: "INTERNAL_ERROR" } });
    });

    it("maneja valores lanzados que no son Error", () => {
        expect(toErrorResponse("fallo raro").body.code).toBe("INTERNAL_ERROR");
    });
});
