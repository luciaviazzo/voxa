import axios, { AxiosError, AxiosResponse } from 'axios';

interface BackendError {
  error?: string;
  friendlyMessage?: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<BackendError>) => {
    if (error.response) {
      const status = error.response.status;
      const data = (error.response.data as BackendError) || {};
      const backendDetail = data.error;

      switch (status) {
        case 400:
          data.friendlyMessage = backendDetail || 'Los datos enviados son incorrectos.';
          break;
        case 413:
          data.friendlyMessage = 'El archivo de audio es demasiado pesado (máximo 25MB).';
          break;
        case 422:
          data.friendlyMessage = 'No se pudo procesar el audio. Intentá de nuevo.';
          break;
        case 500:
        case 502:
        case 503:
          data.friendlyMessage = 'Ocurrió un error en el servidor. Intentalo más tarde.';
          break;
        default:
          data.friendlyMessage = backendDetail || 'Ocurrió un error inesperado.';
      }

      error.response.data = data;
    } else if (error.request) {
      error.message = 'No se pudo conectar con el servidor. Verificá tu conexión.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;