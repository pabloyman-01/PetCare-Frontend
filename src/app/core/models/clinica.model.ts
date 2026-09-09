export interface Clinica {
  id: number;
  nombre: string;
  slug: string;
  plan: string;
  estado: string;
  direccion?: string | null;
  telefono?: string | null;
  horarioAtencion?: string | null;
  descripcion?: string | null;
  logoUrl?: string | null;
  createdAt: string;
}

export interface ClinicaRequest {
  nombre: string;
  slug: string;
  direccion?: string;
  telefono?: string;
  horarioAtencion?: string;
  descripcion?: string;
  logoUrl?: string;
}

export interface ClinicaPublic {
  id: number;
  nombre: string;
  slug: string;
  direccion?: string | null;
  telefono?: string | null;
  horarioAtencion?: string | null;
  descripcion?: string | null;
  logoUrl?: string | null;
}

export interface ServicioPublic {
  id: number;
  nombre: string;
  descripcion: string;
  costoBase: number;
}

export interface RegisterClinicRequest {
  fullName: string;
  email: string;
  telefono: string;
  password: string;
  clinicaNombre: string;
}