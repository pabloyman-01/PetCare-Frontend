export interface InasistenciaRequest {
  observacion: string;
}

export interface InasistenciaResponse {
  id: number;
  citaId: number;
  duenioId: number;
  duenioNombreCompleto: string;
  mascotaId: number;
  mascotaNombre: string;
  fechaCita: string;
  horaInicioCita: string;
  observacion: string;
  registradoPor: string;
  fechaRegistro: string;
}
