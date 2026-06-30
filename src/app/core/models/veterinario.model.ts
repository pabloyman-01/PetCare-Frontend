export interface HorarioVeterinarioRequest {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  duracionBloqueMinutos: number;
}

export interface VeterinarioRequest {
  usuarioId?: number;
  nombres?: string;
  apellidos?: string;
  numeroColegiatura: string;
  especialidad: string;
  telefono?: string;
  email?: string;
  horarios?: HorarioVeterinarioRequest[];
}

export interface HorarioVeterinarioResponse {
  id: number;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  duracionBloqueMinutos: number;
  active: boolean;
}

export interface VeterinarioResponse {
  id: number;
  usuarioId: number | null;
  nombres: string;
  apellidos: string;
  numeroColegiatura: string;
  especialidad: string;
  telefono: string;
  email: string;
  active: boolean;
  horarios: HorarioVeterinarioResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface DisponibilidadVeterinarioResponse {
  veterinarioId: number;
  veterinarioNombreCompleto: string;
  fecha: string;
  horariosDisponibles: string[];
}
