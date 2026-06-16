import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL } from './auth.service';
import { CitaResponse } from '../models/cita.model';
import { PanelAlertasDiaResponse, AlertaCitaResponse, AlertaVacunaResponse } from '../models/alerta.model';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  constructor(private http: HttpClient) {}

  getDailyPanel(): Observable<PanelAlertasDiaResponse> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<CitaResponse[]>(`${API_URL}/citas`, {
      params: { fecha: today }
    }).pipe(
      map(citas => this.buildPanel(citas, today))
    );
  }

  private buildPanel(citas: CitaResponse[], fecha: string): PanelAlertasDiaResponse {
    const toAlert = (c: CitaResponse): AlertaCitaResponse => ({
      citaId: c.id,
      duenioId: c.duenioId,
      duenioNombreCompleto: c.duenioNombreCompleto,
      mascotaId: c.mascotaId,
      mascotaNombre: c.mascotaNombre,
      veterinarioId: c.veterinarioId,
      veterinarioNombreCompleto: c.veterinarioNombreCompleto,
      fecha: c.fecha,
      horaInicio: c.horaInicio,
      estado: c.estado,
      motivo: c.motivo,
    });

    const programadas = citas.filter(c => c.estado === 'PROGRAMADA');
    const confirmadas = citas.filter(c => c.estado === 'CONFIRMADA');
    const noAsistidas = citas.filter(c => c.estado === 'NO_ASISTIO');

    return {
      fecha,
      totalCitasProgramadasHoy: programadas.length,
      totalCitasSinConfirmar: programadas.filter(c => c.requiereConfirmacion).length,
      totalCitasConfirmadasPendientesAtencion: confirmadas.length,
      totalCitasNoAsistidasHoy: noAsistidas.length,
      totalVacunasProximas: 0,
      totalVacunasVencidas: 0,
      totalControlesMensualesPendientes: 0,
      citasProgramadasHoy: [...programadas, ...confirmadas].map(toAlert),
      citasSinConfirmar: programadas.filter(c => c.requiereConfirmacion).map(toAlert),
      citasConfirmadasPendientesAtencion: confirmadas.map(toAlert),
      citasNoAsistidasHoy: noAsistidas.map(toAlert),
      vacunasProximas: [],
      vacunasVencidas: [],
      controlesMensualesPendientes: [],
    };
  }
}
