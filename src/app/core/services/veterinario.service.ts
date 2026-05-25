import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VeterinarioRequest, VeterinarioResponse, DisponibilidadVeterinarioResponse } from '../models/veterinario.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class VeterinarioService {
  private base = `${API_URL}/veterinarios`;

  constructor(private http: HttpClient) {}

  create(req: VeterinarioRequest): Observable<VeterinarioResponse> {
    return this.http.post<VeterinarioResponse>(this.base, req);
  }

  findAll(search?: string, active?: boolean): Observable<VeterinarioResponse[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<VeterinarioResponse[]>(this.base, { params });
  }

  findById(id: number): Observable<VeterinarioResponse> {
    return this.http.get<VeterinarioResponse>(`${this.base}/${id}`);
  }

  update(id: number, req: VeterinarioRequest): Observable<VeterinarioResponse> {
    return this.http.put<VeterinarioResponse>(`${this.base}/${id}`, req);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getDisponibilidad(id: number, fecha: string, duracionMinutos?: number): Observable<DisponibilidadVeterinarioResponse> {
    let params = new HttpParams().set('fecha', fecha);
    if (duracionMinutos) params = params.set('duracionMinutos', duracionMinutos);
    return this.http.get<DisponibilidadVeterinarioResponse>(`${this.base}/${id}/disponibilidad`, { params });
  }
}
