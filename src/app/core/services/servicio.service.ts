import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServicioRequest, ServicioResponse, CalculoCostoCitaRequest, CalculoCostoCitaResponse } from '../models/servicio.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ServicioService {
  private base = `${API_URL}/servicios`;

  constructor(private http: HttpClient) {}

  create(req: ServicioRequest): Observable<ServicioResponse> {
    return this.http.post<ServicioResponse>(this.base, req);
  }

  findAll(search?: string, active?: boolean): Observable<ServicioResponse[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<ServicioResponse[]>(this.base, { params });
  }

  findById(id: number): Observable<ServicioResponse> {
    return this.http.get<ServicioResponse>(`${this.base}/${id}`);
  }

  update(id: number, req: ServicioRequest): Observable<ServicioResponse> {
    return this.http.put<ServicioResponse>(`${this.base}/${id}`, req);
  }

  activate(id: number): Observable<ServicioResponse> {
    return this.http.patch<ServicioResponse>(`${this.base}/${id}/activar`, {});
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  calcularCosto(req: CalculoCostoCitaRequest): Observable<CalculoCostoCitaResponse> {
    return this.http.post<CalculoCostoCitaResponse>(`${this.base}/calcular-costo`, req);
  }
}
