import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiErrorCode } from '../types';

interface BackendError {
  error?: string;
  code?: ApiErrorCode;
  friendlyMessage?: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const GENERIC_ERROR = 'Ocurrió un error al procesar el audio.';
const SERVER_ERROR = 'Ocurrió un error en el servidor. Intentalo más tarde.';

const MESSAGE_BY_CODE: Record<ApiErrorCode, string> = {
  AUDIO_MISSING: 'No se escuchó nada. Mantené presionado el botón y hablá.',
  AUDIO_EMPTY: 'No se escuchó nada. Mantené presionado el botón y hablá.',
  AUDIO_INVALID_TYPE: 'El audio no tiene un formato válido. Intentá grabar de nuevo.',
  AUDIO_TOO_LARGE: 'El audio es demasiado largo. Intentá con uno más corto.',
  TRANSCRIPTION_EMPTY: 'No te pudimos entender. Intentá hablar más cerca del micrófono.',
  TRANSACTION_EXTRACTION_FAILED: 'No pudimos entender el movimiento. Intentá decirlo de otra forma.',
  RATE_LIMITED: 'Hay muchas consultas en este momento. Esperá un momento e intentá de nuevo.',
  PROVIDER_ERROR: SERVER_ERROR,
  INTERNAL_ERROR: SERVER_ERROR,
};

const MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'Los datos enviados son incorrectos.',
  413: 'El archivo de audio es demasiado pesado (máximo 25MB).',
  422: 'No se pudo procesar el audio. Intentá de nuevo.',
  500: SERVER_ERROR,
  502: SERVER_ERROR,
  503: SERVER_ERROR,
};

function friendlyMessageFor(status: number, code?: ApiErrorCode): string {
  return (code && MESSAGE_BY_CODE[code]) || MESSAGE_BY_STATUS[status] || 'Ocurrió un error inesperado.';
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<BackendError>) => {
    if (error.response) {
      const data = (error.response.data as BackendError) || {};
      data.friendlyMessage = friendlyMessageFor(error.response.status, data.code);
      error.response.data = data;
    } else if (error.request) {
      error.message = 'No se pudo conectar con el servidor. Verificá tu conexión.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

export function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<BackendError>(error)) {
    return error instanceof Error && error.message ? error.message : GENERIC_ERROR;
  }
  return error.response?.data?.friendlyMessage || error.message || GENERIC_ERROR;
}
