import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ControlMensualMascotaRequest,
  ControlMensualMascotaResponse
} from '../models/atencion-clinica.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ControlMensualService {
  constructor(private http: HttpClient) {}

  create(mascotaId: number, req: ControlMensualMascotaRequest): Observable<ControlMensualMascotaResponse> {
    return this.http.post<ControlMensualMascotaResponse>(`${API_URL}/mascotas/${mascotaId}/controles-mensuales`, req);
  }

  findByMascota(mascotaId: number): Observable<ControlMensualMascotaResponse[]> {
    return this.http.get<ControlMensualMascotaResponse[]>(`${API_URL}/mascotas/${mascotaId}/controles-mensuales`);
  }

  findById(id: number): Observable<ControlMensualMascotaResponse> {
    return this.http.get<ControlMensualMascotaResponse>(`${API_URL}/controles-mensuales/${id}`);
  }

  update(id: number, req: ControlMensualMascotaRequest): Observable<ControlMensualMascotaResponse> {
    return this.http.put<ControlMensualMascotaResponse>(`${API_URL}/controles-mensuales/${id}`, req);
  }
}
