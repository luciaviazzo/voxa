import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../app/index';
import { mockBackend } from '../jest/networkMock';
import apiClient from '@/services/api';

const mockRecorder = {
  prepareToRecordAsync: jest.fn(),
  record: jest.fn(),
  stop: jest.fn(),
  uri: 'file:///tmp/recording.m4a' as string | null,
};

jest.mock('expo-audio', () => ({
  useAudioRecorder: () => mockRecorder,
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  RecordingPresets: { HIGH_QUALITY: {} },
}));

const button = () => screen.getByRole('button', { name: 'Grabar movimiento' });

async function speak() {
  fireEvent(button(), 'pressIn');
  await screen.findByText('Te escucho... (soltá para enviar)');
  fireEvent(button(), 'pressOut');
}

const balance = (text: RegExp) => screen.getByText(text);

describe('E2E: de la voz al saldo (pantalla + botón + servicio + cliente HTTP reales)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockRecorder.uri = 'file:///tmp/recording.m4a';
    mockRecorder.prepareToRecordAsync.mockResolvedValue(undefined);
    mockRecorder.stop.mockResolvedValue(undefined);
  });

  it('un gasto dicho por voz se transcribe, se muestra y descuenta del saldo', async () => {
    const calls = mockBackend({
      status: 200,
      data: {
        text: 'gasté 8500 en la farmacia',
        transaction: { monto: 8500, tipo: 'gasto', categoria: 'Salud', descripcion: 'Farmacia' },
      },
    });
    render(<HomeScreen />);

    await speak();

    expect(await screen.findByText('"gasté 8500 en la farmacia"')).toBeTruthy();
    expect(balance(/^\$36[.,]500$/)).toBeTruthy();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/transcribe');
    expect(screen.getByText('Mantené presionado para hablar')).toBeTruthy();
  });

  it('un ingreso dicho por voz suma al saldo', async () => {
    mockBackend({
      status: 200,
      data: {
        text: 'cobré la jubilación 20000',
        transaction: { monto: 20000, tipo: 'ingreso', categoria: 'Ingresos', descripcion: 'Jubilación' },
      },
    });
    render(<HomeScreen />);

    await speak();

    await waitFor(() => expect(balance(/^\$65[.,]000$/)).toBeTruthy());
  });

  it('muestra el estado de procesamiento mientras espera al servidor', async () => {
    let reply!: () => void;
    apiClient.defaults.adapter = (config) =>
      new Promise((resolve) => {
        reply = () =>
          resolve({
            status: 200,
            statusText: '',
            headers: {},
            config,
            data: { text: 'hola', transaction: { monto: 0, tipo: 'gasto' } },
          });
      });
    render(<HomeScreen />);

    await speak();

    expect(await screen.findByText('Procesando gasto...')).toBeTruthy();
    reply();
    await screen.findByText('Mantené presionado para hablar');
  });

  it('muestra el mensaje amigable cuando el audio no se pudo transcribir (422)', async () => {
    mockBackend({ status: 422, data: { error: 'Could not transcribe audio. Please try again' } });
    render(<HomeScreen />);

    await speak();

    expect(await screen.findByText('No se pudo procesar el audio. Intentá de nuevo.')).toBeTruthy();
    expect(balance(/^\$45[.,]000$/)).toBeTruthy();
  });

  it('muestra el mensaje amigable cuando el servidor falla (500)', async () => {
    mockBackend({ status: 500, data: { error: 'Internal server error' } });
    render(<HomeScreen />);

    await speak();

    expect(await screen.findByText('Ocurrió un error en el servidor. Intentalo más tarde.')).toBeTruthy();
  });

  it('muestra el mensaje de conexión cuando no hay red', async () => {
    mockBackend('network-error');
    render(<HomeScreen />);

    await speak();

    expect(await screen.findByText('No se pudo conectar con el servidor. Verificá tu conexión.')).toBeTruthy();
  });

  it('no consulta al servidor si la grabación no generó audio', async () => {
    mockRecorder.uri = null;
    const calls = mockBackend({ status: 200, data: {} });
    render(<HomeScreen />);

    await speak();

    await waitFor(() => expect(mockRecorder.stop).toHaveBeenCalled());
    expect(calls).toHaveLength(0);
    expect(balance(/^\$45[.,]000$/)).toBeTruthy();
  });
});
