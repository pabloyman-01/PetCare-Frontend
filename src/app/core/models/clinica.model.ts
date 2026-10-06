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
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  readOnly: boolean;
}

export interface ClinicaPlan {
  plan: 'TRIAL' | 'FREE' | 'PRO' | 'CONSULTORIO';
  tier: 'PRO' | 'FREE' | 'CONSULTORIO';
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'READ_ONLY' | 'SUSPENDED';
  readOnly: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  daysRemaining: number;
  staffUsed: number;
  staffLimit: number;
  petsUsed: number;
  petsLimit: number;
  monthlyPrice: number;
  annualPrice: number;
  currency: 'PEN';
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

export interface ClinicaDirectory extends ClinicaPublic {
  servicios: string[];
}

export interface ClinicDirectoryPage {
  items: ClinicaDirectory[];
  page: number;
  totalPages: number;
  totalElements: number;
}

export interface RegisterClinicRequest {
  fullName: string;
  email: string;
  telefono: string;
  password: string;
  clinicaNombre: string;
}
