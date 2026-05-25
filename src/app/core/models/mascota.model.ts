export type SexoMascota = 'MACHO' | 'HEMBRA';

export interface MascotaRequest {
  duenioId: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: SexoMascota;
  fechaNacimiento: string;
  color?: string;
  pesoKg?: number;
  observaciones?: string;
  fotoUrl?: string;
}

export interface MascotaResponse {
  id: number;
  duenioId: number;
  duenioNombreCompleto: string;
  nombre: string;
  especie: string;
  raza: string;
  sexo: SexoMascota;
  fechaNacimiento: string;
  edadAnios: number;
  color: string | null;
  pesoKg: number | null;
  observaciones: string | null;
  fotoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
