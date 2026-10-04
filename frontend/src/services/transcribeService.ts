import apiClient from './api';
import { TranscribeResponse } from '../types';

export async function transcribeAudio(audioUri: string): Promise<TranscribeResponse> {
  const formData = new FormData();

  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);

  const response = await apiClient.post<TranscribeResponse>('/api/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}