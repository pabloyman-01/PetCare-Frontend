import { ClinicaPlan } from './clinica.model';

export type ManagedPlan = 'CONSULTORIO' | 'PRO';
export type ClinicEstado = 'ACTIVA' | 'SUSPENDIDA';
export type MonthlyOperation = 'ACTIVATE' | 'RENEW';

export interface MonthlyPaymentRequest {
  plan: ManagedPlan;
  operation: MonthlyOperation;
  paymentReference: string;
  reason: string;
  paymentConfirmed: true;
  expectedPaymentId: number | null;
}

export interface MonthlyPaymentResponse {
  id: number;
  clinicId: number;
  plan: ManagedPlan;
  operation: MonthlyOperation;
  paymentReference: string;
  amount: number;
  currency: string;
  billingCycle: 'MONTHLY';
  periodStartedAt: string;
  periodEndsAt: string;
  confirmedAt: string;
  anchorDay: number;
  actorId: number;
  actorEmail: string;
  reason: string;
  previousPaymentId: number | null;
  auditId: number;
}

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
  monthlyPayment: MonthlyPaymentResponse | null;
}
