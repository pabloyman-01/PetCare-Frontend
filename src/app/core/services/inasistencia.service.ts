import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InasistenciaRequest, InasistenciaResponse } from '../models/inasistencia.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class InasistenciaService {
  constructor(private http: HttpClient) {}

  register(citaId: number, req: InasistenciaRequest): Observable<InasistenciaResponse> {
    return this.http.patch<InasistenciaResponse>(`${API_URL}/citas/${citaId}/inasistencia`, req);
  }

  findAll(duenioId?: number, fechaInicio?: string, fechaFin?: string): Observable<InasistenciaResponse[]> {
    let params = new HttpParams();
    if (duenioId) params = params.set('duenioId', duenioId);
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    return this.http.get<InasistenciaResponse[]>(`${API_URL}/inasistencias`, { params });
  }

  findById(id: number): Observable<InasistenciaResponse> {
    return this.http.get<InasistenciaResponse>(`${API_URL}/inasistencias/${id}`);
  }
}
