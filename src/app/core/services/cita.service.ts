import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CitaRequest, CitaResponse } from '../models/cita.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CitaService {
  private base = `${API_URL}/citas`;

  constructor(private http: HttpClient) {}

  create(req: CitaRequest): Observable<CitaResponse> {
    return this.http.post<CitaResponse>(this.base, req);
  }

  findAll(params?: {
    estado?: string; fecha?: string; duenioId?: number;
    mascotaId?: number; veterinarioId?: number;
  }): Observable<CitaResponse[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.estado) httpParams = httpParams.set('estado', params.estado);
      if (params.fecha) httpParams = httpParams.set('fecha', params.fecha);
      if (params.duenioId) httpParams = httpParams.set('duenioId', params.duenioId);
      if (params.mascotaId) httpParams = httpParams.set('mascotaId', params.mascotaId);
      if (params.veterinarioId) httpParams = httpParams.set('veterinarioId', params.veterinarioId);
    }
    return this.http.get<CitaResponse[]>(this.base, { params: httpParams });
  }

  findById(id: number): Observable<CitaResponse> {
    return this.http.get<CitaResponse>(`${this.base}/${id}`);
  }

  update(id: number, req: CitaRequest): Observable<CitaResponse> {
    return this.http.put<CitaResponse>(`${this.base}/${id}`, req);
  }

  cancelar(id: number): Observable<CitaResponse> {
    return this.http.patch<CitaResponse>(`${this.base}/${id}/cancelar`, {});
  }

  confirmar(id: number): Observable<CitaResponse> {
    return this.http.patch<CitaResponse>(`${this.base}/${id}/confirmar`, {});
  }

  getAlertasConfirmacion(horas?: number): Observable<CitaResponse[]> {
    let params = new HttpParams();
    if (horas) params = params.set('horas', horas);
    return this.http.get<CitaResponse[]>(`${this.base}/alertas-confirmacion`, { params });
  }
}
