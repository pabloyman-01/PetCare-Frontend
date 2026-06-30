import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './auth.service';
import { NotaSeguimientoRequest, NotaSeguimientoResponse } from '../models/nota-seguimiento.model';

@Injectable({ providedIn: 'root' })
export class NotaSeguimientoService {
  constructor(private http: HttpClient) {}

  create(req: NotaSeguimientoRequest): Observable<NotaSeguimientoResponse> {
    return this.http.post<NotaSeguimientoResponse>(`${API_URL}/notas-seguimiento`, req);
  }

  findByCitaId(citaId: number): Observable<NotaSeguimientoResponse[]> {
    return this.http.get<NotaSeguimientoResponse[]>(`${API_URL}/notas-seguimiento/${citaId}`);
  }
}
