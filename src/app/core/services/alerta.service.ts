import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PanelAlertasDiaResponse } from '../models/alerta.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  constructor(private http: HttpClient) {}

  getDailyPanel(): Observable<PanelAlertasDiaResponse> {
    return this.http.get<PanelAlertasDiaResponse>(`${API_URL}/alertas/dia`);
  }
}
