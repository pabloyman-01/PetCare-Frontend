export type EstadoCita = 'PROGRAMADA' | 'CONFIRMADA' | 'CANCELADA' | 'ATENDIDA' | 'NO_ASISTIO';

export interface CostoCitaServicioRequest {
  servicioId: number;
  cantidad: number;
}

export interface CitaRequest {
  duenioId: number;
  mascotaId: number;
  veterinarioId: number;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
  motivo: string;
  servicios: CostoCitaServicioRequest[];
  descuento?: number;
}

export interface DetalleCostoCitaResponse {
  servicioId: number;
  nombreServicio: string;
  costoUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface CitaResponse {
  id: number;
  duenioId: number;
  duenioNombreCompleto: string;
  duenioTelefono: string;
  mascotaId: number;
  mascotaNombre: string;
  veterinarioId: number;
  veterinarioNombreCompleto: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionMinutos: number;
  motivo: string;
  estado: EstadoCita;
  detallesCosto: DetalleCostoCitaResponse[];
  subtotal: number;
  descuento: number;
  total: number;
  requiereConfirmacion: boolean;
  fechaConfirmacion: string | null;
  confirmadaPor: string | null;
  createdAt: string;
  updatedAt: string;
}
