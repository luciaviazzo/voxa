export interface ApiErrorResponse {
  error: string;
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