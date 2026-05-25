export interface DuenioRequest {
  usuarioId?: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  email: string;
  direccion?: string;
}

export interface DuenioResponse {
  id: number;
  usuarioId: number | null;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  email: string;
  direccion: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
