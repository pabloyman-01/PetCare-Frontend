import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './auth.service';

export interface AsignacionHorario {
  usuarioId: number;
  lunes?: string; martes?: string; miercoles?: string;
  jueves?: string; viernes?: string; sabado?: string; domingo?: string;
}

export interface HorarioSemanalResponse {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioRol: string;
  fechaSemana: string;
  lunes?: string; martes?: string; miercoles?: string;
  jueves?: string; viernes?: string; sabado?: string; domingo?: string;
}

export interface HorarioSemanalRequest {
  semana: string;
  asignaciones: AsignacionHorario[];
}

@Injectable({ providedIn: 'root' })
export class HorarioSemanalService {
  constructor(private http: HttpClient) {}

  findBySemana(semana: string): Observable<HorarioSemanalResponse[]> {
    return this.http.get<HorarioSemanalResponse[]>(`${API_URL}/horarios-semanales`, {
      params: new HttpParams().set('semana', semana)
    });
  }

  saveWeek(req: HorarioSemanalRequest): Observable<HorarioSemanalResponse[]> {
    return this.http.post<HorarioSemanalResponse[]>(`${API_URL}/horarios-semanales`, req);
  }

  deleteByUsuario(usuarioId: number, semana: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/horarios-semanales/${usuarioId}`, {
      params: new HttpParams().set('semana', semana)
    });
  }
}
