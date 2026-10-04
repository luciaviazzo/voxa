import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../app/index';
import { transcribeAudio } from '@/services/transcribeService';

jest.mock('@/services/transcribeService', () => ({ transcribeAudio: jest.fn() }));

jest.mock('@/components/RecordButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onRecordComplete, isLoading }: { onRecordComplete: (uri: string) => void; isLoading: boolean }) => (
      <TouchableOpacity accessibilityRole="button" onPress={() => onRecordComplete('file:///audio.m4a')}>
        <Text>{isLoading ? 'cargando' : 'grabar'}</Text>
      </TouchableOpacity>
    ),
  };
});

const mockTranscribe = transcribeAudio as jest.Mock;

const balance = (amount: number) =>
  screen.getByText(new RegExp(`^\\$${Math.floor(amount / 1000)}[.,]${String(amount % 1000).padStart(3, '0')}$`));

function respondWith(transaction: unknown, text = 'texto reconocido') {
  mockTranscribe.mockResolvedValue({ text, transaction });
}

async function record() {
  fireEvent.press(screen.getByRole('button'));
  await screen.findByText('grabar');
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('muestra el título y el saldo inicial', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Voxa')).toBeTruthy();
    expect(screen.getByText('Tus finanzas con la voz')).toBeTruthy();
    expect(screen.getByText('Disponible este mes')).toBeTruthy();
    expect(balance(45000)).toBeTruthy();
  });

  it('no muestra texto reconocido ni errores al inicio', () => {
    render(<HomeScreen />);

    expect(screen.queryByText('Último audio reconocido:')).toBeNull();
  });

  it('envía la uri grabada al servicio de transcripción', async () => {
    respondWith({ monto: 100, tipo: 'gasto' });
    render(<HomeScreen />);

    await record();

    await waitFor(() => expect(mockTranscribe).toHaveBeenCalledWith('file:///audio.m4a'));
  });

  it('muestra el texto reconocido', async () => {
    respondWith({ monto: 100, tipo: 'gasto' }, 'gasté 100 en el kiosco');
    render(<HomeScreen />);

    await record();

    expect(await screen.findByText('"gasté 100 en el kiosco"')).toBeTruthy();
    expect(screen.getByText('Último audio reconocido:')).toBeTruthy();
  });

  it('resta el monto del saldo cuando es un gasto', async () => {
    respondWith({ monto: 8500, tipo: 'gasto' });
    render(<HomeScreen />);

    await record();

    await waitFor(() => expect(balance(36500)).toBeTruthy());
  });

  it('suma el monto al saldo cuando es un ingreso', async () => {
    respondWith({ monto: 5000, tipo: 'ingreso' });
    render(<HomeScreen />);

    await record();

    await waitFor(() => expect(balance(50000)).toBeTruthy());
  });

  it('no cambia el saldo si el tipo es desconocido', async () => {
    respondWith({ monto: 5000, tipo: 'otro' });
    render(<HomeScreen />);

    await record();

    await screen.findByText('"texto reconocido"');
    expect(balance(45000)).toBeTruthy();
  });

  it('no cambia el saldo si el monto es cero', async () => {
    respondWith({ monto: 0, tipo: 'gasto' });
    render(<HomeScreen />);

    await record();

    await screen.findByText('"texto reconocido"');
    expect(balance(45000)).toBeTruthy();
  });

  it('no cambia el saldo si no se extrajo ninguna transacción', async () => {
    respondWith(undefined);
    render(<HomeScreen />);

    await record();

    await screen.findByText('"texto reconocido"');
    expect(balance(45000)).toBeTruthy();
  });

  it('acumula varios movimientos sobre el saldo', async () => {
    respondWith({ monto: 5000, tipo: 'gasto' });
    render(<HomeScreen />);

    await record();
    await waitFor(() => expect(balance(40000)).toBeTruthy());
    await record();

    await waitFor(() => expect(balance(35000)).toBeTruthy());
  });

  it('muestra el estado de carga mientras procesa y lo quita al terminar', async () => {
    let resolve!: (value: unknown) => void;
    mockTranscribe.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<HomeScreen />);

    fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText('cargando')).toBeTruthy();
    resolve({ text: 'listo', transaction: { monto: 1, tipo: 'gasto' } });
    await screen.findByText('grabar');
  });

  it('muestra el mensaje del error cuando falla la transcripción', async () => {
    mockTranscribe.mockRejectedValue(new Error('El servidor no responde'));
    render(<HomeScreen />);

    await record();

    expect(await screen.findByText('El servidor no responde')).toBeTruthy();
    expect(balance(45000)).toBeTruthy();
  });

  it('limpia el error anterior al grabar de nuevo', async () => {
    mockTranscribe.mockRejectedValueOnce(new Error('falló'));
    mockTranscribe.mockResolvedValueOnce({ text: 'segundo intento', transaction: { monto: 100, tipo: 'gasto' } });
    render(<HomeScreen />);

    await record();
    await screen.findByText('falló');
    await record();

    expect(await screen.findByText('"segundo intento"')).toBeTruthy();
    expect(screen.queryByText('falló')).toBeNull();
  });

  it('limpia el texto reconocido anterior al grabar de nuevo', async () => {
    mockTranscribe.mockResolvedValueOnce({ text: 'primero', transaction: { monto: 1, tipo: 'gasto' } });
    mockTranscribe.mockRejectedValueOnce(new Error('falló'));
    render(<HomeScreen />);

    await record();
    await screen.findByText('"primero"');
    await record();

    await screen.findByText('falló');
    expect(screen.queryByText('"primero"')).toBeNull();
  });
});
