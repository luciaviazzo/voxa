export type ApiErrorCode =
  | 'AUDIO_MISSING'
  | 'AUDIO_EMPTY'
  | 'AUDIO_INVALID_TYPE'
  | 'AUDIO_TOO_LARGE'
  | 'TRANSCRIPTION_EMPTY'
  | 'TRANSACTION_EXTRACTION_FAILED'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
}

export interface TransactionData {
  monto: number;
  tipo: 'gasto' | 'ingreso';
  categoria: string;
  descripcion: string;
}

export interface TranscribeResponse {
  text: string;
  transaction: TransactionData;
}
