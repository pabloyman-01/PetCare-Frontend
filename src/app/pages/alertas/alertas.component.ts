import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AlertaService } from '../../core/services/alerta.service';
import { AuthService } from '../../core/services/auth.service';
import { PanelAlertasDiaResponse, AlertaCitaResponse } from '../../core/models/alerta.model';
import { finalize } from 'rxjs';

type FilterType = 'todas' | 'criticas' | 'recordatorios' | 'seguimiento';
type ItemType = 'critica' | 'recordatorio' | 'seguimiento';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
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
                    @if (alert.alertType === 'critica' || alert.alertType === 'seguimiento') {
                      <button (click)="irACita(alert.citaId)"
                              class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors bg-primary text-on-primary hover:opacity-90">
                        <span class="material-symbols-outlined text-[18px]">{{ alert.alertType === 'critica' ? 'call' : 'history_edu' }}</span>
                        {{ alert.alertType === 'critica' ? 'Llamar' : 'Registrar Nota' }}
                      </button>
                    }
                    @if (alert.alertType === 'recordatorio') {
                      <button (click)="irACita(alert.citaId)"
                              class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors border border-outline-variant text-on-surface-variant hover:bg-surface-container">
                        <span class="material-symbols-outlined text-[18px]">chat</span>
                        WhatsApp
                      </button>
                    }
                    <button (click)="marcarLeida(alert.id)"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg font-label-sm text-label-sm transition-colors border border-outline-variant text-on-surface-variant hover:bg-surface-container">
                      Marcar como leída
                    </button>
                    <button (click)="irACita(alert.citaId)"
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

      <!-- Right Sidebar: Widgets -->
      <aside class="w-full lg:w-80 space-y-6">
        <!-- Immediate Summary -->
        <div class="bg-inverse-surface text-inverse-on-surface rounded-2xl p-6 shadow-xl">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-label-md text-label-md font-bold uppercase tracking-widest opacity-80">Pr&oacute;ximas 2 Horas</h3>
            <span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
          </div>
          <div class="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/20">
            <div class="relative pl-8">
              <span class="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-4 border-inverse-surface">
                <span class="w-1.5 h-1.5 bg-on-primary rounded-full"></span>
              </span>
              <p class="font-label-sm text-label-sm opacity-60">10:30 AM</p>
              <p class="font-label-md text-label-md">Llamada Dr. Garc&iacute;a</p>
              <p class="text-body-sm opacity-80">Revisi&oacute;n de resultados laboratorio</p>
            </div>
            <div class="relative pl-8">
              <span class="absolute left-0 top-1 w-6 h-6 rounded-full bg-outline flex items-center justify-center border-4 border-inverse-surface">
                <span class="w-1.5 h-1.5 bg-inverse-on-surface rounded-full"></span>
              </span>
              <p class="font-label-sm text-label-sm opacity-60">11:15 AM</p>
              <p class="font-label-md text-label-md">Entrada de Insumos</p>
              <p class="text-body-sm opacity-80">Recibir pedido de vacunas</p>
            </div>
            <div class="relative pl-8">
              <span class="absolute left-0 top-1 w-6 h-6 rounded-full bg-tertiary-container flex items-center justify-center border-4 border-inverse-surface">
                <span class="w-1.5 h-1.5 bg-on-tertiary-container rounded-full"></span>
              </span>
              <p class="font-label-sm text-label-sm opacity-60">12:00 PM</p>
              <p class="font-label-md text-label-md">Cita: Limpieza Dental</p>
              <p class="text-body-sm opacity-80">Paciente: Simba</p>
            </div>
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

  panel = signal<PanelAlertasDiaResponse | null>(null);
  loading = signal(true);
  filter = signal<FilterType>('todas');

  todayDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  criticalCount = computed(() => this.panel()?.totalCitasSinConfirmar ?? 0);
  infoCount = computed(() => (this.panel()?.totalVacunasProximas ?? 0) + (this.panel()?.totalControlesMensualesPendientes ?? 0));

  efficiency = computed(() => Math.floor(70 + Math.random() * 20));
  resolvedCount = computed(() => Math.floor(Math.random() * 10) + 5);

  filteredAlerts = computed(() => {
    const p = this.panel();
    if (!p) return [];

    const alerts: AlertItem[] = [];

    // Críticas: citas sin confirmar
    for (const c of p.citasSinConfirmar) {
      alerts.push({
        id: `critica-${c.citaId}`,
        citaId: c.citaId,
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
    this.alertaService.getDailyPanel().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.panel.set(data),
    });
  }

  protected leidas = signal<Set<string>>(new Set());

  protected irACita(citaId: number): void {
    this.router.navigate(['/citas', citaId]);
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
  icon: string;
  title: string;
  description: string;
  time: string;
}
