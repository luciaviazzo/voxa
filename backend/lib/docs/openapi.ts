export const openApiSpec = {
    openapi: "3.0.3",
    info: {
        title: "Voxa API",
        version: "1.0.0",
        description:
            "API de Voxa, finanzas personales por voz. Convierte un audio en texto y extrae los datos del movimiento.",
    },
    servers: [{ url: "/", description: "Servidor actual" }],
    paths: {
        "/api/transcribe": {
            post: {
                summary: "Transcribe un audio y extrae la transacción",
                tags: ["Transcripción"],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["audio"],
                                properties: {
                                    audio: {
                                        type: "string",
                                        format: "binary",
                                        description: "Archivo de audio (audio/*, máximo 25 MB)",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Audio transcripto y transacción extraída",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/TranscribeResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "413": { $ref: "#/components/responses/PayloadTooLarge" },
                    "422": { $ref: "#/components/responses/Unprocessable" },
                    "429": { $ref: "#/components/responses/RateLimited" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
    },
    components: {
        schemas: {
            Transaction: {
                type: "object",
                properties: {
                    monto: { type: "number", example: 8500 },
                    tipo: { type: "string", example: "gasto" },
                    categoria: { type: "string", example: "Salud" },
                    descripcion: { type: "string", example: "Farmacia" },
                },
            },
            TranscribeResponse: {
                type: "object",
                properties: {
                    text: { type: "string", example: "gasté 8500 en la farmacia" },
                    transaction: { $ref: "#/components/schemas/Transaction" },
                },
            },
            Error: {
                type: "object",
                properties: { error: { type: "string" } },
            },
        },
        responses: {
            BadRequest: errorResponse("Audio ausente, vacío o de un tipo no válido"),
            PayloadTooLarge: errorResponse("Archivo mayor a 25 MB"),
            Unprocessable: errorResponse("No se pudo transcribir el audio"),
            RateLimited: errorResponse("Se superó el límite de uso de Groq"),
            InternalError: errorResponse("Error interno"),
        },
    },
};

function errorResponse(description: string) {
    return {
        description,
        content: {
            "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
    };
}
