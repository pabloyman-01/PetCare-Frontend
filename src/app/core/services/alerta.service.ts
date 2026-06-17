import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_URL } from './auth.service';
import { CitaResponse } from '../models/cita.model';
import { PanelAlertasDiaResponse, AlertaCitaResponse, AlertaVacunaResponse } from '../models/alerta.model';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  constructor(private http: HttpClient) {}

  getDailyPanel(): Observable<PanelAlertasDiaResponse> {
    const today = new Date().toISOString().split('T')[0];

    const citasHoy$ = this.http.get<CitaResponse[]>(`${API_URL}/citas`, { params: { fecha: today } })
      .pipe(catchError(() => of([])));

    const citasProximas$ = this.http.get<CitaResponse[]>(`${API_URL}/citas`)
      .pipe(catchError(() => of([])));

    const alertasConfirmacion$ = this.http.get<CitaResponse[]>(`${API_URL}/citas/alertas-confirmacion`)
      .pipe(catchError(() => of([])));

    return forkJoin([citasHoy$, citasProximas$, alertasConfirmacion$]).pipe(
      map(([citasHoy, citasProximas, alertasConfirmacion]) =>
        this.buildPanel(citasHoy, citasProximas, alertasConfirmacion, today)
      )
    );
  }

  private buildPanel(
    citasHoy: CitaResponse[],
    citasProximas: CitaResponse[],
    alertasConfirmacion: CitaResponse[],
    fecha: string
  ): PanelAlertasDiaResponse {
    const toAlert = (c: CitaResponse): AlertaCitaResponse => ({
      citaId: c.id,
      duenioId: c.duenioId,
      duenioNombreCompleto: c.duenioNombreCompleto,
      duenioTelefono: '',
      mascotaId: c.mascotaId,
      mascotaNombre: c.mascotaNombre,
      veterinarioId: c.veterinarioId,
      veterinarioNombreCompleto: c.veterinarioNombreCompleto,
      fecha: c.fecha,
      horaInicio: c.horaInicio,
      estado: c.estado,
      motivo: c.motivo,
    });

    const programadasHoy = citasHoy.filter(c => c.estado === 'PROGRAMADA');
    const confirmadasHoy = citasHoy.filter(c => c.estado === 'CONFIRMADA');
    const noAsistidasHoy = citasHoy.filter(c => c.estado === 'NO_ASISTIO');

    const hoy = new Date(fecha);
    const sinConfirmar = citasProximas.filter(c =>
      c.estado === 'PROGRAMADA' &&
      c.requiereConfirmacion &&
      new Date(c.fecha) >= hoy
    );

    const alertaIds = new Set(alertasConfirmacion.map(c => c.id));
    const sinConfirmarAlertas = citasProximas.filter(c => alertaIds.has(c.id));
    const citasSinConfirmar = sinConfirmarAlertas.length > 0 ? sinConfirmarAlertas : sinConfirmar;

    return {
      fecha,
      totalCitasProgramadasHoy: programadasHoy.length,
      totalCitasSinConfirmar: citasSinConfirmar.length,
      totalCitasConfirmadasPendientesAtencion: confirmadasHoy.length,
      totalCitasNoAsistidasHoy: noAsistidasHoy.length,
      totalVacunasProximas: 0,
      totalVacunasVencidas: 0,
      totalControlesMensualesPendientes: 0,
      citasProgramadasHoy: [...programadasHoy, ...confirmadasHoy].map(toAlert),
      citasSinConfirmar: citasSinConfirmar.map(toAlert),
      citasConfirmadasPendientesAtencion: confirmadasHoy.map(toAlert),
      citasNoAsistidasHoy: noAsistidasHoy.map(toAlert),
      vacunasProximas: [],
      vacunasVencidas: [],
      controlesMensualesPendientes: [],
    };
  }
}
