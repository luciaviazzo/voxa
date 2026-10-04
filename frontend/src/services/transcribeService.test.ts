import { transcribeAudio } from './transcribeService';
import { mockBackend } from '../../jest/networkMock';

const RESPONSE = {
  text: 'gasté 8500 en la farmacia',
  transaction: { monto: 8500, tipo: 'gasto', categoria: 'Salud', descripcion: 'Farmacia' },
};

describe('transcribeAudio', () => {
  it('envía el audio por POST a /api/transcribe como multipart', async () => {
    const calls = mockBackend({ status: 200, data: RESPONSE });

    await transcribeAudio('file:///tmp/recording.m4a');

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('post');
    expect(calls[0].url).toBe('/api/transcribe');
    expect(String(calls[0].headers?.['Content-Type'])).toContain('multipart/form-data');
  });

  it('adjunta el archivo con uri, tipo y nombre', async () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    mockBackend({ status: 200, data: RESPONSE });

    await transcribeAudio('file:///tmp/recording.m4a');

    expect(append).toHaveBeenCalledWith('audio', {
      uri: 'file:///tmp/recording.m4a',
      type: 'audio/m4a',
      name: 'recording.m4a',
    });
    append.mockRestore();
  });

  it('devuelve el texto y la transacción del backend', async () => {
    mockBackend({ status: 200, data: RESPONSE });

    await expect(transcribeAudio('file:///tmp/recording.m4a')).resolves.toEqual(RESPONSE);
  });

  it('propaga el error cuando el backend responde con falla', async () => {
    mockBackend({ status: 422, data: { error: 'Could not transcribe' } });

    await expect(transcribeAudio('file:///tmp/recording.m4a')).rejects.toBeDefined();
  });
});
