import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MascotaRequest, MascotaResponse } from '../models/mascota.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MascotaService {
  private base = `${API_URL}/mascotas`;

  constructor(private http: HttpClient) {}

  create(req: MascotaRequest): Observable<MascotaResponse> {
    return this.http.post<MascotaResponse>(this.base, req);
  }

  findAll(search?: string, duenioId?: number, active?: boolean): Observable<MascotaResponse[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (duenioId) params = params.set('duenioId', duenioId);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<MascotaResponse[]>(this.base, { params });
  }

  findByDuenio(duenioId: number): Observable<MascotaResponse[]> {
    return this.http.get<MascotaResponse[]>(`${API_URL}/duenios/${duenioId}/mascotas`);
  }

  findById(id: number): Observable<MascotaResponse> {
    return this.http.get<MascotaResponse>(`${this.base}/${id}`);
  }

  update(id: number, req: MascotaRequest): Observable<MascotaResponse> {
    return this.http.put<MascotaResponse>(`${this.base}/${id}`, req);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
