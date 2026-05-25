export interface AlertaCitaResponse {
  citaId: number;
  duenioId: number;
  duenioNombreCompleto: string;
  mascotaId: number;
  mascotaNombre: string;
  veterinarioId: number;
  veterinarioNombreCompleto: string;
  fecha: string;
  horaInicio: string;
  estado: string;
  motivo: string;
}

export interface AlertaVacunaResponse {
  vacunaMascotaId: number;
  mascotaId: number;
  mascotaNombre: string;
  vacunaId: number;
  vacunaNombre: string;
  fechaProximaDosis: string;
  estadoAlerta: string;
}

export interface PanelAlertasDiaResponse {
  fecha: string;
  totalCitasProgramadasHoy: number;
  totalCitasSinConfirmar: number;
  totalCitasConfirmadasPendientesAtencion: number;
  totalCitasNoAsistidasHoy: number;
  totalVacunasProximas: number;
  totalVacunasVencidas: number;
  totalControlesMensualesPendientes: number;
  citasProgramadasHoy: AlertaCitaResponse[];
  citasSinConfirmar: AlertaCitaResponse[];
  citasConfirmadasPendientesAtencion: AlertaCitaResponse[];
  citasNoAsistidasHoy: AlertaCitaResponse[];
  vacunasProximas: AlertaVacunaResponse[];
  vacunasVencidas: AlertaVacunaResponse[];
  controlesMensualesPendientes: any[];
}
