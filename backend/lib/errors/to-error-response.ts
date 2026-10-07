import OpenAI from "openai";
import { AppError, ErrorCode } from "@/lib/errors/app-error";

export interface ErrorResponse {
    status: number;
    body: { error: string; code: ErrorCode };
}

export function toErrorResponse(err: unknown): ErrorResponse {
    if (err instanceof AppError) {
        return { status: err.httpStatus, body: { error: err.message, code: err.code } };
    }

    if (err instanceof OpenAI.APIError) {
        const status = err.status ?? 500;
        if (status === 429) {
            return {
                status,
                body: { error: "Rate limit exceeded. Please try again later", code: ErrorCode.RATE_LIMITED },
            };
        }
        return { status, body: { error: "Transcription provider error", code: ErrorCode.PROVIDER_ERROR } };
    }

    return { status: 500, body: { error: "Internal server error", code: ErrorCode.INTERNAL_ERROR } };
}
