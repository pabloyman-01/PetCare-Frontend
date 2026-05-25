import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AsistenteRequest, AsistenteResponse } from '../models/asistente.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private base = `${API_URL}/asistentes`;

  constructor(private http: HttpClient) {}

  create(req: AsistenteRequest): Observable<AsistenteResponse> {
    return this.http.post<AsistenteResponse>(this.base, req);
  }

  findAll(search?: string, active?: boolean): Observable<AsistenteResponse[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<AsistenteResponse[]>(this.base, { params });
  }

  findById(id: number): Observable<AsistenteResponse> {
    return this.http.get<AsistenteResponse>(`${this.base}/${id}`);
  }

  update(id: number, req: AsistenteRequest): Observable<AsistenteResponse> {
    return this.http.put<AsistenteResponse>(`${this.base}/${id}`, req);
  }

  activate(id: number): Observable<AsistenteResponse> {
    return this.http.patch<AsistenteResponse>(`${this.base}/${id}/activar`, {});
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
