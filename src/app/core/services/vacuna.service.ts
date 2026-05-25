import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  VacunaRequest, VacunaResponse,
  VacunaMascotaRequest, VacunaMascotaResponse
} from '../models/vacuna.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class VacunaService {
  private base = `${API_URL}/vacunas`;

  constructor(private http: HttpClient) {}

  create(req: VacunaRequest): Observable<VacunaResponse> {
    return this.http.post<VacunaResponse>(this.base, req);
  }

  findAll(search?: string, active?: boolean): Observable<VacunaResponse[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<VacunaResponse[]>(this.base, { params });
  }

  findById(id: number): Observable<VacunaResponse> {
    return this.http.get<VacunaResponse>(`${this.base}/${id}`);
  }

  update(id: number, req: VacunaRequest): Observable<VacunaResponse> {
    return this.http.put<VacunaResponse>(`${this.base}/${id}`, req);
  }

  activate(id: number): Observable<VacunaResponse> {
    return this.http.patch<VacunaResponse>(`${this.base}/${id}/activar`, {});
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  registerForMascota(mascotaId: number, req: VacunaMascotaRequest): Observable<VacunaMascotaResponse> {
    return this.http.post<VacunaMascotaResponse>(`${API_URL}/mascotas/${mascotaId}/vacunas`, req);
  }

  findByMascota(mascotaId: number): Observable<VacunaMascotaResponse[]> {
    return this.http.get<VacunaMascotaResponse[]>(`${API_URL}/mascotas/${mascotaId}/vacunas`);
  }

  findProximas(dias?: number): Observable<VacunaMascotaResponse[]> {
    let params = new HttpParams();
    if (dias) params = params.set('dias', dias);
    return this.http.get<VacunaMascotaResponse[]>(`${this.base}/proximas`, { params });
  }

  findAlertas(dias?: number): Observable<VacunaMascotaResponse[]> {
    let params = new HttpParams();
    if (dias) params = params.set('dias', dias);
    return this.http.get<VacunaMascotaResponse[]>(`${API_URL}/alertas/vacunas`, { params });
  }
}
