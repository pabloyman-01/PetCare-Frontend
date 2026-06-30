import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AlertaService } from '../../core/services/alerta.service';
import { AuthService } from '../../core/services/auth.service';
import { PanelAlertasDiaResponse, AlertaCitaResponse } from '../../core/models/alerta.model';
import { CitaResponse } from '../../core/models/cita.model';
import { finalize } from 'rxjs';
import { CallModalComponent, CallResult } from '../../shared/components/call-modal/call-modal.component';
import { NotaModalComponent } from '../../shared/components/nota-modal/nota-modal.component';
import { CitaService } from '../../core/services/cita.service';

type FilterType = 'todas' | 'criticas' | 'recordatorios' | 'seguimiento';
type ItemType = 'critica' | 'recordatorio' | 'seguimiento';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, CallModalComponent, NotaModalComponent],
  template: `
  <div class="p-6 lg:p-8">
    <div class="flex flex-col lg:flex-row gap-8">

      <!-- Center Column: Alerts Flow -->
      <div class="flex-1 space-y-8">

        <!-- Header & Summary -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 class="text-headline-lg font-extrabold text-on-surface">Alertas del D&iacute;a</h2>
            <p class="text-body-md text-on-surface-variant">{{ todayDate }}</p>
          </div>
          <div class="flex gap-4">
            <div class="bg-error-container text-on-error-container px-4 py-2 rounded-xl flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1">error</span>
              <span class="font-label-md text-label-md">{{ criticalCount() }} Cr&iacute;ticas</span>
            </div>
            <div class="bg-surface-container-high text-primary px-4 py-2 rounded-xl flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px]">info</span>
              <span class="font-label-md text-label-md">{{ infoCount() }} Informativas</span>
            </div>
          </div>
        </div>

        <!-- Priority Filters -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <button (click)="filter.set('todas')"
                  class="px-6 py-2.5 rounded-full font-label-md text-label-md shadow-md transition-all whitespace-nowrap"
                  [class.bg-primary]="filter() === 'todas'"
                  [class.text-on-primary]="filter() === 'todas'"
                  [class.bg-surface-container-lowest]="filter() !== 'todas'"
                  [class.text-on-surface-variant]="filter() !== 'todas'"
                  [class.border]="filter() !== 'todas'"
                  [class.border-outline-variant]="filter() !== 'todas'">Todas</button>
          <button (click)="filter.set('criticas')"
                  class="px-6 py-2.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap"
                  [class.bg-error-container]="filter() === 'criticas'"
                  [class.text-on-error-container]="filter() === 'criticas'"
                  [class.bg-surface-container-lowest]="filter() !== 'criticas'"
                  [class.text-on-surface-variant]="filter() !== 'criticas'"
                  [class.border]="filter() !== 'criticas'"
                  [class.border-outline-variant]="filter() !== 'criticas'"
                  [class.hover:bg-error-container]="filter() !== 'criticas'"
                  [class.hover:text-on-error-container]="filter() !== 'criticas'">Cr&iacute;ticas</button>
          <button (click)="filter.set('recordatorios')"
                  class="px-6 py-2.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap"
                  [class.bg-primary-fixed]="filter() === 'recordatorios'"
                  [class.text-on-primary-fixed]="filter() === 'recordatorios'"
                  [class.bg-surface-container-lowest]="filter() !== 'recordatorios'"
                  [class.text-on-surface-variant]="filter() !== 'recordatorios'"
                  [class.border]="filter() !== 'recordatorios'"
                  [class.border-outline-variant]="filter() !== 'recordatorios'">Recordatorios</button>
          <button (click)="filter.set('seguimiento')"
                  class="px-6 py-2.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap"
                  [class.bg-secondary-container]="filter() === 'seguimiento'"
                  [class.text-on-secondary-container]="filter() === 'seguimiento'"
                  [class.bg-surface-container-lowest]="filter() !== 'seguimiento'"
                  [class.text-on-surface-variant]="filter() !== 'seguimiento'"
                  [class.border]="filter() !== 'seguimiento'"
                  [class.border-outline-variant]="filter() !== 'seguimiento'">Seguimiento</button>
        </div>

        <!-- Alerts List -->
        <div class="space-y-4">
          @if (loading()) {
            <div class="flex items-center justify-center py-20">
              <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
          } @else if (filteredAlerts().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
              <span class="material-symbols-outlined text-5xl text-outline-variant">notifications_off</span>
              <p class="mt-3 text-body-md text-on-surface-variant">No hay alertas</p>
            </div>
          } @else {
            @for (alert of filteredAlerts(); track alert.id) {
              <div class="bg-surface-container-lowest border-l-4 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-5 items-start"
                   [class.border-error]="alert.alertType === 'critica'"
                   [class.border-primary]="alert.alertType === 'recordatorio'"
                   [class.border-secondary]="alert.alertType === 'seguimiento'">
                <div class="p-3 rounded-full shrink-0"
                     [class.bg-error-container]="alert.alertType === 'critica'"
                     [class.text-error]="alert.alertType === 'critica'"
                     [class.bg-primary-fixed]="alert.alertType === 'recordatorio'"
                     [class.text-primary]="alert.alertType === 'recordatorio'"
                     [class.bg-secondary-container]="alert.alertType === 'seguimiento'"
                     [class.text-secondary]="alert.alertType === 'seguimiento'">
                  <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">{{ alert.icon }}</span>
                </div>
                <div class="flex-1">
                  <div class="flex justify-between items-start mb-1">
                    <h3 class="font-label-md text-label-md text-on-surface">{{ alert.title }}</h3>
                    <span class="font-label-sm text-label-sm shrink-0 ml-4"
                          [class.text-error]="alert.alertType === 'critica'"
                          [class.font-bold]="alert.alertType === 'critica'"
                          [class.text-on-surface-variant]="alert.alertType !== 'critica'">{{ alert.time }}</span>
                  </div>
                  <p class="text-body-sm text-on-surface-variant mb-4">{{ alert.description }}</p>
                  <div class="flex flex-wrap gap-3">
                    @if (alert.alertType === 'critica') {
                      <div class="flex flex-col gap-1">
                        <button (click)="abrirModalLlamada(alert.citaId)"
                                class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors bg-primary text-on-primary hover:opacity-90">
                          <span class="material-symbols-outlined text-[18px]">call</span>
                          Llamar
                        </button>
                        @if (intentosLlamada(alert.citaId); as info) {
                          <span class="text-xs text-gray-400">{{ info.intentos }} intento{{ info.intentos !== 1 ? 's' : '' }}</span>
                        }
                      </div>
                    }
                    @if (alert.alertType === 'recordatorio') {
                      <button (click)="abrirWhatsApp(alert)"
                              class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors border border-outline-variant text-on-surface-variant hover:bg-surface-container">
                        <span class="material-symbols-outlined text-[18px]">chat</span>
                        WhatsApp
                      </button>
                    }
                    @if (alert.alertType === 'seguimiento') {
                      <button (click)="abrirNotaModal(alert.citaId)"
                              class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors bg-primary text-on-primary hover:opacity-90">
                        <span class="material-symbols-outlined text-[18px]">note_add</span>
                        Anotación
                      </button>
                    }
                    <button (click)="marcarLeida(alert.id)"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors border border-outline-variant text-on-surface-variant hover:bg-surface-container">
                      Marcar como leída
                    </button>
                    <button (click)="abrirDetalle(alert.citaId)"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors text-primary hover:underline">
                      <span class="material-symbols-outlined text-[18px]">visibility</span>
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </div>

      @if (alertaSeleccionada(); as alerta) {
        <app-call-modal [alerta]="alerta"
                        (cerrar)="cerrarModalLlamada()"
                        (resultado)="guardarResultadoLlamada($event)" />
      }

      @if (notaCitaId(); as citaId) {
        <app-nota-modal [citaId]="citaId" (cerrar)="cerrarNotaModal()" />
      }

      @if (detalleAlerta(); as detalle) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="cerrarDetalle()">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-gray-900">Detalle de alerta</h3>
              <button (click)="cerrarDetalle()" class="text-gray-400 hover:text-gray-600">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="space-y-3 mb-4">
              <div class="flex justify-between p-3 bg-blue-50 rounded-xl">
                <span class="text-sm text-gray-500">Mascota</span>
                <span class="font-semibold">{{ detalle.mascotaNombre }}</span>
              </div>
              <div class="flex justify-between p-3 bg-blue-50 rounded-xl">
                <span class="text-sm text-gray-500">Propietario</span>
                <span class="font-semibold">{{ detalle.duenioNombreCompleto }}</span>
              </div>
              <div class="flex justify-between p-3 bg-blue-50 rounded-xl">
                <span class="text-sm text-gray-500">Motivo</span>
                <span class="font-semibold">{{ detalle.motivo }}</span>
              </div>
              <div class="flex justify-between p-3 bg-blue-50 rounded-xl">
                <span class="text-sm text-gray-500">Fecha / Hora</span>
                <span class="font-semibold">{{ detalle.fecha }} {{ detalle.horaInicio }}</span>
              </div>
              <div class="flex justify-between p-3 bg-yellow-50 rounded-xl">
                <span class="text-sm text-gray-500">Estado</span>
                <span class="font-semibold">{{ detalle.estado }}</span>
              </div>
            </div>

            @if (intentosLlamada(detalle.citaId); as llamadas) {
              <div class="border-t pt-4">
                <h4 class="font-semibold text-gray-700 mb-2">Historial de llamadas</h4>
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Intentos:</span>
                    <span class="font-semibold">{{ llamadas.intentos }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Último intento:</span>
                    <span class="font-semibold">{{ llamadas.ultimo }}</span>
                  </div>
                </div>
              </div>
            } @else {
              <div class="border-t pt-4 text-center text-sm text-gray-400">
                Sin llamadas registradas
              </div>
            }
          </div>
        </div>
      }

      <!-- Right Sidebar: Widgets -->
      <aside class="w-full lg:w-80 space-y-6">
        <!-- Immediate Summary -->
        <div class="bg-inverse-surface text-inverse-on-surface rounded-2xl p-6 shadow-xl">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-label-md text-label-md font-bold uppercase tracking-widest opacity-80">Pr&oacute;ximas 2 Horas</h3>
            <span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
          </div>
          <div class="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/20">
            @if (proximasActividades().length === 0) {
              <div class="relative pl-8">
                <p class="text-body-sm opacity-80">No hay actividades programadas para las pr&oacute;ximas 2 horas.</p>
              </div>
            } @else {
              @for (act of proximasActividades(); track act.id) {
                <div class="relative pl-8">
                  <span class="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-4 border-inverse-surface">
                    <span class="w-1.5 h-1.5 bg-on-primary rounded-full"></span>
                  </span>
                  <p class="font-label-sm text-label-sm opacity-60">{{ act.hora }}</p>
                  <p class="font-label-md text-label-md">{{ act.tipo }}</p>
                  <p class="text-body-sm opacity-80">{{ act.descripcion }}</p>
                </div>
              }
            }
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="bg-surface-container-high rounded-2xl p-6">
          <h4 class="font-label-md text-label-md text-on-surface mb-4">Estado del Turno</h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
              <p class="text-[24px] font-bold text-primary">{{ efficiency() }}%</p>
              <p class="font-label-sm text-label-sm text-on-surface-variant">Eficiencia</p>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
              <p class="text-[24px] font-bold text-secondary">{{ resolvedCount() }}</p>
              <p class="font-label-sm text-label-sm text-on-surface-variant">Resueltas</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
  `
})
export class AlertasComponent implements OnInit {
  private alertaService = inject(AlertaService);
  protected auth = inject(AuthService);
  private router = inject(Router);
  private citaService = inject(CitaService);

  panel = signal<PanelAlertasDiaResponse | null>(null);
  loading = signal(true);
  filter = signal<FilterType>('todas');

  todayDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  criticalCount = computed(() => this.panel()?.totalCitasSinConfirmar ?? 0);
  infoCount = computed(() => (this.panel()?.totalVacunasProximas ?? 0) + (this.panel()?.totalControlesMensualesPendientes ?? 0));

  efficiency = computed(() => {
    const p = this.panel();
    if (!p) return 0;
    const total = p.totalCitasProgramadasHoy + p.totalCitasConfirmadasPendientesAtencion + p.totalCitasNoAsistidasHoy;
    if (total === 0) return 0;
    const atendidas = this.citasHoy().filter(c => c.estado === 'ATENDIDA').length;
    return Math.round((atendidas / (total + atendidas)) * 100);
  });
  resolvedCount = computed(() => this.citasHoy().filter(c => c.estado === 'ATENDIDA').length);
  citasHoy = signal<CitaResponse[]>([]);

  protected proximasActividades = computed(() => {
    const ahora = new Date();
    const dentroDe2h = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    const formatHora = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };
    return this.citasHoy()
      .filter(c => {
        const [h, m] = c.horaInicio.split(':').map(Number);
        const citaDate = new Date(ahora);
        citaDate.setHours(h, m, 0, 0);
        return citaDate >= ahora && citaDate <= dentroDe2h;
      })
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .map(c => ({
        id: c.id,
        hora: formatHora(c.horaInicio),
        tipo: c.motivo,
        descripcion: `${c.mascotaNombre} · ${c.duenioNombreCompleto}`,
      }));
  });

  filteredAlerts = computed(() => {
    const p = this.panel();
    if (!p) return [];

    const alerts: AlertItem[] = [];

    // Críticas: citas sin confirmar
    for (const c of p.citasSinConfirmar) {
      alerts.push({
        id: `critica-${c.citaId}`,
        citaId: c.citaId,
        mascotaNombre: c.mascotaNombre,
        motivo: c.motivo,
        alertType: 'critica',
        icon: 'emergency_home',
        title: `Cita sin confirmar - ${c.mascotaNombre}`,
        description: `El dueño ${c.duenioNombreCompleto} no ha confirmado la cita de ${c.motivo}.`,
        time: this.formatTime(c.horaInicio),
      });
    }

    // Recordatorios: citas programadas hoy
    for (const c of p.citasProgramadasHoy) {
      alerts.push({
        id: `recordatorio-${c.citaId}`,
        citaId: c.citaId,
        mascotaNombre: c.mascotaNombre,
        motivo: c.motivo,
        alertType: 'recordatorio',
        icon: 'calendar_clock',
        title: `${c.motivo} - ${c.mascotaNombre}`,
        description: `Programada con ${c.veterinarioNombreCompleto}. Dueño: ${c.duenioNombreCompleto}`,
        time: this.formatTime(c.horaInicio),
      });
    }

    // Seguimiento: pendientes de atención
    for (const c of p.citasConfirmadasPendientesAtencion) {
      alerts.push({
        id: `seguimiento-${c.citaId}`,
        citaId: c.citaId,
        mascotaNombre: c.mascotaNombre,
        motivo: c.motivo,
        alertType: 'seguimiento',
        icon: 'medical_information',
        title: `Pendiente de atención - ${c.mascotaNombre}`,
        description: `${c.motivo}. Dueño: ${c.duenioNombreCompleto}`,
        time: this.formatTime(c.horaInicio),
      });
    }

    const leidasSet = this.leidas();
    const visibles = alerts.filter(a => !leidasSet.has(a.id));

    const f = this.filter();
    if (f === 'todas') return visibles;
    const itemMap: Record<string, ItemType> = { criticas: 'critica', recordatorios: 'recordatorio', seguimiento: 'seguimiento' };
    const target = itemMap[f];
    return target ? visibles.filter(a => a.alertType === target) : visibles;
  });

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.citaService.findAll({ fecha: today }).subscribe({
      next: (data) => this.citasHoy.set(data),
    });
    this.alertaService.getDailyPanel().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.panel.set(data),
    });
  }

  protected leidas = signal<Set<string>>(new Set());
  protected alertaSeleccionada = signal<AlertaCitaResponse | null>(null);
  protected detalleAlerta = signal<AlertaCitaResponse | null>(null);
  protected notaCitaId = signal<number | null>(null);
  protected historialLlamadas = signal<Map<number, { intentos: number; ultimo: string; registros: CallResult[] }>>(new Map());

  protected irACitas(): void {
    this.router.navigate(['/citas']);
  }

  protected abrirWhatsApp(alert: AlertItem): void {
    const msg = encodeURIComponent(`Hola, te escribo de PetCare sobre la cita de ${alert.mascotaNombre}: ${alert.motivo}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  protected abrirModalLlamada(citaId: number): void {
    const p = this.panel();
    if (!p) return;
    const todas = [...p.citasSinConfirmar, ...p.citasProgramadasHoy, ...p.citasConfirmadasPendientesAtencion, ...p.citasNoAsistidasHoy];
    const alerta = todas.find(c => c.citaId === citaId);
    if (alerta) this.alertaSeleccionada.set(alerta);
  }

  protected cerrarModalLlamada(): void {
    this.alertaSeleccionada.set(null);
  }

  protected abrirDetalle(citaId: number): void {
    const p = this.panel();
    if (!p) return;
    const todas = [...p.citasSinConfirmar, ...p.citasProgramadasHoy, ...p.citasConfirmadasPendientesAtencion, ...p.citasNoAsistidasHoy];
    const alerta = todas.find(c => c.citaId === citaId);
    if (alerta) this.detalleAlerta.set(alerta);
  }

  protected cerrarDetalle(): void {
    this.detalleAlerta.set(null);
  }

  protected abrirNotaModal(citaId: number): void {
    this.notaCitaId.set(citaId);
  }

  protected cerrarNotaModal(): void {
    this.notaCitaId.set(null);
  }

  protected intentosLlamada(citaId: number): { intentos: number; ultimo: string } | null {
    const info = this.historialLlamadas().get(citaId);
    if (!info) return null;
    return { intentos: info.intentos, ultimo: info.ultimo };
  }

  protected guardarResultadoLlamada(result: CallResult): void {
    const now = new Date().toLocaleString('es-PE');
    this.historialLlamadas.update(m => {
      const prev = m.get(result.citaId) || { intentos: 0, ultimo: '', registros: [] };
      prev.intentos++;
      prev.ultimo = now;
      prev.registros.push(result);
      m.set(result.citaId, prev);
      return new Map(m);
    });

    const id = result.citaId;

    if (result.resultado === 'confirmada') {
      this.citaService.confirmar(id).subscribe({
        next: () => this.recargarDatos(),
        error: (err) => console.error('Error al confirmar cita:', err),
      });
      this.marcarLeida(`critica-${id}`);
    }

    if (result.resultado === 'cancelada') {
      this.citaService.cancelar(id).subscribe({
        next: () => this.recargarDatos(),
        error: (err) => console.error('Error al cancelar cita:', err),
      });
      this.marcarLeida(`critica-${id}`);
    }

    if (result.resultado === 'reprogramar' && result.nuevaFecha && result.nuevaHora) {
      const alerta = this.alertaSeleccionada();
      if (!alerta) return;
      this.citaService.update(id, {
        duenioId: alerta.duenioId,
        mascotaId: alerta.mascotaId,
        veterinarioId: alerta.veterinarioId,
        fecha: result.nuevaFecha,
        horaInicio: result.nuevaHora,
        duracionMinutos: 30,
        motivo: alerta.motivo,
        servicios: [],
      }).subscribe({
        next: () => this.recargarDatos(),
        error: (err) => console.error('Error al reprogramar cita:', err),
      });
    }

    this.alertaSeleccionada.set(null);
  }

  private recargarDatos(): void {
    const today = new Date().toISOString().split('T')[0];
    this.citaService.findAll({ fecha: today }).subscribe({
      next: (data) => this.citasHoy.set(data),
      error: (err) => console.error('Error al recargar citas:', err),
    });
    this.alertaService.getDailyPanel().subscribe({
      next: (data) => this.panel.set(data),
      error: (err) => console.error('Error al recargar panel:', err),
    });
  }

  protected marcarLeida(id: string): void {
    this.leidas.update(s => { s.add(id); return new Set(s); });
  }

  private formatTime(time: string): string {
    return time ? time.slice(0, 5) : '--:--';
  }
}

interface AlertItem {
  id: string;
  alertType: ItemType;
  citaId: number;
  mascotaNombre: string;
  motivo: string;
  icon: string;
  title: string;
  description: string;
  time: string;
}
