import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ReporteCitaResponse, ReporteCostoCitaResponse,
  ServicioSolicitadoResponse
} from '../models/reporte.model';
import { InasistenciaResponse } from '../models/inasistencia.model';
import { VacunaMascotaResponse } from '../models/vacuna.model';
import { HistoriaClinicaResponse } from '../models/atencion-clinica.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  constructor(private http: HttpClient) {}

  findCitas(params?: {
    estado?: string; fechaInicio?: string; fechaFin?: string;
    veterinarioId?: number; mascotaId?: number; duenioId?: number;
  }): Observable<ReporteCitaResponse[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.estado) httpParams = httpParams.set('estado', params.estado);
      if (params.fechaInicio) httpParams = httpParams.set('fechaInicio', params.fechaInicio);
      if (params.fechaFin) httpParams = httpParams.set('fechaFin', params.fechaFin);
      if (params.veterinarioId) httpParams = httpParams.set('veterinarioId', params.veterinarioId);
      if (params.mascotaId) httpParams = httpParams.set('mascotaId', params.mascotaId);
      if (params.duenioId) httpParams = httpParams.set('duenioId', params.duenioId);
    }
    return this.http.get<ReporteCitaResponse[]>(`${API_URL}/reportes/citas`, { params: httpParams });
  }

  findInasistencias(duenioId?: number, fechaInicio?: string, fechaFin?: string): Observable<InasistenciaResponse[]> {
    let params = new HttpParams();
    if (duenioId) params = params.set('duenioId', duenioId);
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    return this.http.get<InasistenciaResponse[]>(`${API_URL}/reportes/inasistencias`, { params });
  }

  findVacunasProximas(fechaInicio?: string, fechaFin?: string): Observable<VacunaMascotaResponse[]> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    return this.http.get<VacunaMascotaResponse[]>(`${API_URL}/reportes/vacunas-proximas`, { params });
  }

  findCostoCita(citaId: number): Observable<ReporteCostoCitaResponse> {
    return this.http.get<ReporteCostoCitaResponse>(`${API_URL}/reportes/citas/${citaId}/costos`);
  }

  findReporteServicios(): Observable<any> {
    return this.http.get<any>(`${API_URL}/reportes/servicios`);
  }

  findServiciosMasSolicitados(fechaInicio?: string, fechaFin?: string): Observable<ServicioSolicitadoResponse[]> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    return this.http.get<ServicioSolicitadoResponse[]>(`${API_URL}/reportes/servicios-mas-solicitados`, { params });
  }

  findHistoriaClinica(mascotaId: number): Observable<HistoriaClinicaResponse> {
    return this.http.get<HistoriaClinicaResponse>(`${API_URL}/reportes/mascotas/${mascotaId}/historia-clinica`);
  }
}
