export const ErrorCode = {
    AUDIO_MISSING: "AUDIO_MISSING",
    AUDIO_EMPTY: "AUDIO_EMPTY",
    AUDIO_INVALID_TYPE: "AUDIO_INVALID_TYPE",
    AUDIO_TOO_LARGE: "AUDIO_TOO_LARGE",
    TRANSCRIPTION_EMPTY: "TRANSCRIPTION_EMPTY",
    TRANSACTION_EXTRACTION_FAILED: "TRANSACTION_EXTRACTION_FAILED",
    RATE_LIMITED: "RATE_LIMITED",
    PROVIDER_ERROR: "PROVIDER_ERROR",
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
    constructor(
        public readonly httpStatus: number,
        public readonly code: ErrorCode,
        message: string
    ) {
        super(message);
    }
}

export class ValidationError extends AppError {}

export class ExtractionError extends AppError {
    constructor() {
        super(502, ErrorCode.TRANSACTION_EXTRACTION_FAILED, "Could not extract transaction data");
    }
}
