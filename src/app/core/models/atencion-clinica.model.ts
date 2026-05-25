export interface AtencionClinicaRequest {
  motivo: string;
  diagnostico: string;
  tratamiento: string;
  recomendaciones?: string;
  observacionesClinicas?: string;
  notasInternas?: string;
}

export interface AtencionClinicaResponse {
  id: number;
  citaId: number;
  mascotaId: number;
  mascotaNombre: string;
  veterinarioId: number;
  veterinarioNombreCompleto: string;
  motivo: string;
  diagnostico: string;
  tratamiento: string;
  recomendaciones: string | null;
  observacionesClinicas: string | null;
  notasInternas: string | null;
  fechaRegistro: string;
}

export interface HistoriaClinicaResponse {
  mascotaId: number;
  mascotaNombre: string;
  duenioId: number;
  duenioNombreCompleto: string;
  atenciones: AtencionClinicaResponse[];
  controlesMensuales: ControlMensualMascotaResponse[];
}

export interface ControlMensualMascotaRequest {
  veterinarioId: number;
  fechaControl: string;
  pesoKg?: number;
  alimentacion?: string;
  observaciones?: string;
  recomendaciones?: string;
}

export interface ControlMensualMascotaResponse {
  id: number;
  mascotaId: number;
  mascotaNombre: string;
  veterinarioId: number;
  veterinarioNombreCompleto: string;
  fechaControl: string;
  anio: number;
  mes: number;
  pesoKg: number | null;
  alimentacion: string | null;
  observaciones: string | null;
  recomendaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ControlMensualPendienteResponse {
  mascotaId: number;
  mascotaNombre: string;
  duenioId: number;
  duenioNombreCompleto: string;
  anio: number;
  mes: number;
}
