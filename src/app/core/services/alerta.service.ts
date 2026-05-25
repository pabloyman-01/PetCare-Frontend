import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PanelAlertasDiaResponse } from '../models/alerta.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  constructor(private http: HttpClient) {}

  getDailyPanel(fecha?: string, diasVacunas?: number): Observable<PanelAlertasDiaResponse> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    if (diasVacunas) params = params.set('diasVacunas', diasVacunas);
    return this.http.get<PanelAlertasDiaResponse>(`${API_URL}/alertas/dia`, { params });
  }
}
