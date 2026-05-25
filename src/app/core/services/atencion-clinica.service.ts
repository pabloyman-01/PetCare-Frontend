import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AtencionClinicaRequest, AtencionClinicaResponse, HistoriaClinicaResponse } from '../models/atencion-clinica.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AtencionClinicaService {
  constructor(private http: HttpClient) {}

  register(citaId: number, req: AtencionClinicaRequest): Observable<AtencionClinicaResponse> {
    return this.http.post<AtencionClinicaResponse>(`${API_URL}/citas/${citaId}/atencion`, req);
  }

  findById(id: number): Observable<AtencionClinicaResponse> {
    return this.http.get<AtencionClinicaResponse>(`${API_URL}/atenciones/${id}`);
  }

  findHistoriaClinica(mascotaId: number): Observable<HistoriaClinicaResponse> {
    return this.http.get<HistoriaClinicaResponse>(`${API_URL}/mascotas/${mascotaId}/historia-clinica`);
  }
}
