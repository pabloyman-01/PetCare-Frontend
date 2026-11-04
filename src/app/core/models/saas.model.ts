import { ClinicaPlan } from './clinica.model';

export type ManagedPlan = 'CONSULTORIO' | 'PRO';
export type ClinicEstado = 'ACTIVA' | 'SUSPENDIDA';

export interface SaasClinic {
  id: number;
  nombre: string;
  slug: string;
  estado: ClinicEstado;
  createdAt: string;
  plan: ClinicaPlan;
}

export interface SaasPage<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalElements: number;
}

export interface SaasAudit {
  id: number;
  actorId: number;
  actorEmail: string;
  action: string;
  previousPlan: ClinicaPlan['plan'] | null;
  newPlan: ClinicaPlan['plan'] | null;
  previousEstado: ClinicEstado | null;
  newEstado: ClinicEstado | null;
  reason: string;
  createdAt: string;
}
