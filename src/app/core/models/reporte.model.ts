export interface ReporteCitaResponse {
  id: number;
  fecha: string;
  horaInicio: string;
  estado: string;
  duenioId: number;
  duenioNombreCompleto: string;
  mascotaId: number;
  mascotaNombre: string;
  veterinarioId: number;
  veterinarioNombreCompleto: string;
  motivo: string;
  total: number;
}

export interface ReporteCostoCitaResponse {
  citaId: number;
  subtotal: number;
  descuento: number;
  total: number;
  detalles: DetalleCostoResponse[];
}

export interface DetalleCostoResponse {
  servicioId: number;
  nombreServicio: string;
  costoUnitario: number;
  cantidad: number;
  subtotal: number;
  descuento: number;
  total: number;
}

export interface ServicioSolicitadoResponse {
  nombreServicio: string;
  cantidadSolicitada: number;
  totalGenerado: number;
}

import { InasistenciaResponse } from './inasistencia.model';
import { VacunaMascotaResponse } from './vacuna.model';
import { HistoriaClinicaResponse } from './atencion-clinica.model';

export { InasistenciaResponse, VacunaMascotaResponse, HistoriaClinicaResponse };
