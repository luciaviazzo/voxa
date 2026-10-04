import { AxiosError } from 'axios';
import apiClient, { getErrorMessage } from './api';
import { mockBackend } from '../../jest/networkMock';

async function failWith(status: number, data?: unknown) {
  mockBackend({ status, data });
  try {
    await apiClient.post('/x');
  } catch (error) {
    return error as AxiosError<{ friendlyMessage?: string }>;
  }
  throw new Error('Se esperaba un error');
}

describe('apiClient', () => {
  it('usa localhost:3000 como URL base por defecto', () => {
    expect(apiClient.defaults.baseURL).toBe('http://localhost:3000');
  });

  it('toma la URL base de EXPO_PUBLIC_API_URL cuando está definida', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.10:3000';
    jest.isolateModules(() => {
      const isolated = require('./api').default;
      expect(isolated.defaults.baseURL).toBe('http://192.168.0.10:3000');
    });
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('deja pasar las respuestas exitosas sin modificarlas', async () => {
    mockBackend({ status: 200, data: { ok: true } });

    const response = await apiClient.get('/x');

    expect(response.data).toEqual({ ok: true });
  });

  describe('mensajes amigables por status', () => {
    it.each([
      [400, { error: 'Audio file is empty' }, 'Audio file is empty'],
      [400, {}, 'Los datos enviados son incorrectos.'],
      [413, {}, 'El archivo de audio es demasiado pesado (máximo 25MB).'],
      [422, {}, 'No se pudo procesar el audio. Intentá de nuevo.'],
      [500, {}, 'Ocurrió un error en el servidor. Intentalo más tarde.'],
      [502, {}, 'Ocurrió un error en el servidor. Intentalo más tarde.'],
      [503, {}, 'Ocurrió un error en el servidor. Intentalo más tarde.'],
      [429, { error: 'Rate limit' }, 'Rate limit'],
      [404, {}, 'Ocurrió un error inesperado.'],
    ])('status %i', async (status, data, expected) => {
      const error = await failWith(status, data);

      expect(error.response?.data?.friendlyMessage).toBe(expected);
    });

    it('tolera una respuesta de error sin cuerpo', async () => {
      const error = await failWith(500, undefined);

      expect(error.response?.data?.friendlyMessage).toBe('Ocurrió un error en el servidor. Intentalo más tarde.');
    });
  });

  it('reemplaza el mensaje cuando no hay conexión con el servidor', async () => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config, {});
    };

    await expect(apiClient.get('/x')).rejects.toThrow('No se pudo conectar con el servidor. Verificá tu conexión.');
  });

  it('propaga errores que no tienen ni respuesta ni request', async () => {
    apiClient.defaults.adapter = async () => {
      throw new Error('boom');
    };

    await expect(apiClient.get('/x')).rejects.toThrow('boom');
  });
});

describe('getErrorMessage', () => {
  it('prioriza el mensaje amigable del backend', async () => {
    const error = await failWith(413, {});

    expect(getErrorMessage(error)).toBe('El archivo de audio es demasiado pesado (máximo 25MB).');
  });

  it('usa el mensaje del error de Axios si no hay mensaje amigable', () => {
    expect(getErrorMessage(new AxiosError('sin conexión'))).toBe('sin conexión');
  });

  it('usa el mensaje genérico si el AxiosError no tiene mensaje', () => {
    expect(getErrorMessage(new AxiosError(''))).toBe('Ocurrió un error al procesar el audio.');
  });

  it('usa el mensaje de un Error común', () => {
    expect(getErrorMessage(new Error('fallo local'))).toBe('fallo local');
  });

  it('usa el mensaje genérico para valores desconocidos', () => {
    expect(getErrorMessage('algo')).toBe('Ocurrió un error al procesar el audio.');
    expect(getErrorMessage(new Error(''))).toBe('Ocurrió un error al procesar el audio.');
  });
});
