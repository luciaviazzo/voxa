import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RecordButton from './RecordButton';

const mockRecorder = {
  prepareToRecordAsync: jest.fn(),
  record: jest.fn(),
  stop: jest.fn(),
  uri: 'file:///tmp/recording.m4a' as string | null,
};
const mockRequestPermissions = jest.fn();
const mockSetAudioMode = jest.fn();

jest.mock('expo-audio', () => ({
  useAudioRecorder: () => mockRecorder,
  requestRecordingPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioMode(...args),
  RecordingPresets: { HIGH_QUALITY: { preset: 'high' } },
}));

const IDLE = 'Mantené presionado para hablar';
const RECORDING = 'Te escucho... (soltá para enviar)';
const LOADING = 'Procesando gasto...';

const button = () => screen.getByRole('button', { name: 'Grabar movimiento' });
const pressIn = () => fireEvent(button(), 'pressIn');
const pressOut = () => fireEvent(button(), 'pressOut');

describe('RecordButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorder.uri = 'file:///tmp/recording.m4a';
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockSetAudioMode.mockResolvedValue(undefined);
    mockRecorder.prepareToRecordAsync.mockResolvedValue(undefined);
    mockRecorder.stop.mockResolvedValue(undefined);
    global.alert = jest.fn();
  });

  it('muestra la indicación inicial', () => {
    render(<RecordButton onRecordComplete={jest.fn()} />);

    expect(screen.getByText(IDLE)).toBeTruthy();
  });

  it('muestra el estado de carga', () => {
    render(<RecordButton onRecordComplete={jest.fn()} isLoading />);

    expect(screen.getByText(LOADING)).toBeTruthy();
  });

  it('empieza a grabar al presionar cuando hay permiso', async () => {
    render(<RecordButton onRecordComplete={jest.fn()} />);

    pressIn();

    await waitFor(() => expect(screen.getByText(RECORDING)).toBeTruthy());
    expect(mockSetAudioMode).toHaveBeenCalledWith({ allowsRecording: true, playsInSilentMode: true });
    expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
    expect(mockRecorder.record).toHaveBeenCalled();
  });

  it('avisa y no graba si se niega el permiso del micrófono', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    render(<RecordButton onRecordComplete={jest.fn()} />);

    pressIn();

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Necesitamos tu permiso para usar el micrófono'));
    expect(mockRecorder.record).not.toHaveBeenCalled();
    expect(screen.getByText(IDLE)).toBeTruthy();
  });

  it('detiene la grabación al soltar y entrega la uri', async () => {
    const onRecordComplete = jest.fn();
    render(<RecordButton onRecordComplete={onRecordComplete} />);
    pressIn();
    await waitFor(() => screen.getByText(RECORDING));

    pressOut();

    await waitFor(() => expect(onRecordComplete).toHaveBeenCalledWith('file:///tmp/recording.m4a'));
    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(mockSetAudioMode).toHaveBeenLastCalledWith({ allowsRecording: false });
    expect(screen.getByText(IDLE)).toBeTruthy();
  });

  it('no entrega nada si la grabación no generó archivo', async () => {
    mockRecorder.uri = null;
    const onRecordComplete = jest.fn();
    render(<RecordButton onRecordComplete={onRecordComplete} />);
    pressIn();
    await waitFor(() => screen.getByText(RECORDING));

    pressOut();

    await waitFor(() => expect(mockRecorder.stop).toHaveBeenCalled());
    expect(onRecordComplete).not.toHaveBeenCalled();
  });

  it('ignora soltar el botón si no se estaba grabando', () => {
    render(<RecordButton onRecordComplete={jest.fn()} />);

    pressOut();

    expect(mockRecorder.stop).not.toHaveBeenCalled();
  });

  it('registra el error si falla el inicio de la grabación', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRecorder.prepareToRecordAsync.mockRejectedValue(new Error('sin micrófono'));
    render(<RecordButton onRecordComplete={jest.fn()} />);

    pressIn();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Error al iniciar la grabación', expect.any(Error))
    );
    expect(screen.getByText(IDLE)).toBeTruthy();
    consoleError.mockRestore();
  });

  it('registra el error si falla la detención y no entrega audio', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onRecordComplete = jest.fn();
    mockRecorder.stop.mockRejectedValue(new Error('fallo al detener'));
    render(<RecordButton onRecordComplete={onRecordComplete} />);
    pressIn();
    await waitFor(() => screen.getByText(RECORDING));

    pressOut();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Error al detener la grabación', expect.any(Error))
    );
    expect(onRecordComplete).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
