export interface VacunaRequest {
  nombre: string;
  descripcion: string;
  intervaloProximaDosisDias?: number;
}

export interface VacunaResponse {
  id: number;
  nombre: string;
  descripcion: string;
  intervaloProximaDosisDias: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VacunaMascotaRequest {
  vacunaId: number;
  veterinarioId: number;
  citaId?: number;
  fechaAplicacion: string;
  lote?: string;
  fechaProximaDosis?: string;
  observaciones?: string;
}

export type EstadoAlertaVacuna = 'SIN_PROXIMA_DOSIS' | 'VENCIDA' | 'PROXIMA' | 'PROGRAMADA';

export interface VacunaMascotaResponse {
  id: number;
  mascotaId: number;
  mascotaNombre: string;
  vacunaId: number;
  vacunaNombre: string;
  veterinarioId: number;
  veterinarioNombreCompleto: string;
  citaId: number | null;
  fechaAplicacion: string;
  lote: string | null;
  fechaProximaDosis: string | null;
  observaciones: string | null;
  estadoAlerta: EstadoAlertaVacuna;
  createdAt: string;
}
