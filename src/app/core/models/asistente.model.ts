export interface AsistenteRequest {
  usuarioId?: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  email: string;
  funciones: string;
  password?: string;
}

export interface AsistenteResponse {
  id: number;
  usuarioId: number | null;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  email: string;
  funciones: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
