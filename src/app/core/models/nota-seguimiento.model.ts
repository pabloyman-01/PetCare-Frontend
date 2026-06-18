export interface NotaSeguimientoResponse {
  id: number;
  citaId: number;
  observacion: string;
  registradoPor: string;
  createdAt: string;
}

export interface NotaSeguimientoRequest {
  citaId: number;
  observacion: string;
}
