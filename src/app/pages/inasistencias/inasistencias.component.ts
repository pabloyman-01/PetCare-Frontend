import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { InasistenciaService } from '../../core/services/inasistencia.service';
import { AuthService } from '../../core/services/auth.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { InasistenciaResponse } from '../../core/models/inasistencia.model';
import { catchError, EMPTY } from 'rxjs';

interface MotivoFrecuente {
  motivo: string;
  porcentaje: number;
  color: string;
}

@Component({
  selector: 'app-inasistencias',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  template: `
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Inasistencias</h2>
        <p class="text-body-md text-on-surface-variant">Gestión de citas no asistidas</p>
      </div>
    </div>

    <!-- KPI Cards -->
    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 min-h-[120px] flex flex-col justify-center">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-xs text-on-surface-variant font-semibold uppercase tracking-widest">Tasa Inasistencia</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5 leading-none">{{ kpiTasa() }}%</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-error/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-error text-[24px]">trending_down</span>
          </div>
        </div>
      </div>
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 min-h-[120px] flex flex-col justify-center">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-xs text-on-surface-variant font-semibold uppercase tracking-widest">Citas Perdidas Hoy</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5 leading-none">{{ kpiPerdidasHoy() }}</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-warning text-[24px]">event_busy</span>
          </div>
        </div>
      </div>
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 min-h-[120px] flex flex-col justify-center">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-xs text-on-surface-variant font-semibold uppercase tracking-widest">Impacto Económico</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5 leading-none">\${{ kpiImpacto() }}</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-primary text-[24px]">payments</span>
          </div>
        </div>
      </div>
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 min-h-[120px] flex flex-col justify-center">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-xs text-on-surface-variant font-semibold uppercase tracking-widest">Recuperación Citas</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5 leading-none">{{ kpiRecuperacion() }}%</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-success text-[24px]">restart_alt</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Table -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Filters -->
        <div class="glass-card rounded-xl p-4">
          <div class="flex flex-wrap items-end gap-3">
            <div class="space-y-1.5 min-w-[160px]">
              <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Inicio</label>
              <input type="date" [ngModel]="filtroFechaInicio()" (ngModelChange)="filtroFechaInicio.set($event)"
                     class="input input-bordered w-full" />
            </div>
            <div class="space-y-1.5 min-w-[160px]">
              <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Fin</label>
              <input type="date" [ngModel]="filtroFechaFin()" (ngModelChange)="filtroFechaFin.set($event)"
                     class="input input-bordered w-full" />
            </div>
            <button (click)="loadInasistencias()"
                    class="btn btn-primary h-[42px]">
              <span class="material-symbols-outlined text-[18px]">search</span>
              Filtrar
            </button>
            <button (click)="clearFilters()"
                    class="btn btn-ghost h-[42px]">
              Limpiar
            </button>
          </div>
        </div>

        @if (loading()) {
          <app-loading-spinner message="Cargando inasistencias..." />
        } @else {
          @if (filteredInasistencias().length === 0) {
            <app-empty-state icon="event_available" title="Sin inasistencias"
                             message="No se encontraron inasistencias registradas." />
          } @else {
            <div class="glass-card rounded-xl overflow-hidden shadow-sm">
              <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-outline-variant/20 bg-surface-container-low/30">
                      <th class="text-left px-5 py-3.5 text-label-xs font-semibold text-on-surface-variant uppercase tracking-widest">Mascota</th>
                      <th class="text-left px-5 py-3.5 text-label-xs font-semibold text-on-surface-variant uppercase tracking-widest">Dueño</th>
                      <th class="text-center px-5 py-3.5 text-label-xs font-semibold text-on-surface-variant uppercase tracking-widest">Fecha / Hora</th>
                      <th class="text-left px-5 py-3.5 text-label-xs font-semibold text-on-surface-variant uppercase tracking-widest">Motivo</th>
                      <th class="text-center px-5 py-3.5 text-label-xs font-semibold text-on-surface-variant uppercase tracking-widest">Estado</th>
                      <th class="text-right px-5 py-3.5 text-label-xs font-semibold text-on-surface-variant uppercase tracking-widest">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant/10">
                    @for (i of filteredInasistencias(); track i.id) {
                      <tr class="hover:bg-surface-container-low/50 transition-all">
                        <td class="px-5 py-4">
                          <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                              <span class="material-symbols-outlined text-error text-[20px]">pets</span>
                            </div>
                            <span class="text-body-md font-semibold text-on-surface">{{ i.mascotaNombre }}</span>
                          </div>
                        </td>
                        <td class="px-5 py-4">
                          <span class="text-body-md text-on-surface">{{ i.duenioNombreCompleto }}</span>
                        </td>
                        <td class="px-5 py-4 text-center">
                          <span class="text-body-md text-on-surface">{{ i.fechaCita }}</span>
                          <span class="text-label-sm text-on-surface-variant block">{{ i.horaInicioCita.slice(0, 5) }}</span>
                        </td>
                        <td class="px-5 py-4">
                          <span class="text-body-md text-on-surface-variant max-w-[160px] truncate block">{{ i.observacion || '—' }}</span>
                        </td>
                        <td class="px-5 py-4 text-center">
                          <span class="badge badge-error badge-outline gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-error"></span>
                            No Asistió
                          </span>
                        </td>
                        <td class="px-5 py-4">
                          <div class="flex items-center justify-end gap-1">
                            <button (click)="llamarDuenio(i)"
                                    class="btn btn-ghost btn-square btn-sm text-primary"
                                    title="Llamar">
                              <span class="material-symbols-outlined text-[20px]">call</span>
                            </button>
                            <button (click)="reprogramar(i)"
                                    class="btn btn-ghost btn-square btn-sm text-secondary"
                                    title="Reprogramar">
                              <span class="material-symbols-outlined text-[20px]">calendar_month</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Alertas de Reincidencia -->
        <div class="glass-card rounded-2xl shadow-sm p-5">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-error text-[20px]">notification_important</span>
            </div>
            <div>
              <h3 class="text-title-md font-bold text-on-surface">Alertas de Reincidencia</h3>
              <p class="text-label-sm text-on-surface-variant">Pacientes con múltiples inasistencias</p>
            </div>
          </div>
          <div class="space-y-2">
            @for (r of reincidencias(); track r.mascota) {
              <div class="p-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/10">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-label-md font-semibold text-on-surface">{{ r.mascota }}</p>
                  <span class="badge badge-error badge-outline text-label-xs font-bold px-2.5">{{ r.veces }}x</span>
                </div>
                <p class="text-body-sm text-on-surface-variant">{{ r.duenio }}</p>
                <p class="text-label-sm text-on-surface-variant mt-1">Última: {{ r.ultimaFecha }}</p>
              </div>
            } @empty {
              <div class="flex flex-col items-center justify-center py-8 text-center">
                <span class="material-symbols-outlined text-[40px] text-success/30">verified</span>
                <p class="text-body-sm text-on-surface-variant mt-2">No hay reincidencias</p>
              </div>
            }
          </div>
        </div>

        <!-- Motivos Frecuentes -->
        <div class="glass-card rounded-2xl shadow-sm p-5">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-secondary text-[20px]">bar_chart</span>
            </div>
            <div>
              <h3 class="text-title-md font-bold text-on-surface">Motivos Frecuentes</h3>
              <p class="text-label-sm text-on-surface-variant">Distribución de causas</p>
            </div>
          </div>
          <div class="space-y-4">
            @for (m of motivosFrecuentes(); track m.motivo) {
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-label-md text-on-surface">{{ m.motivo }}</span>
                  <span class="text-label-md font-bold tabular-nums" [style.color]="m.color">{{ m.porcentaje }}%</span>
                </div>
                <div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500" [style.width.%]="m.porcentaje" [style.background-color]="m.color"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  </div>
  `
})
export class InasistenciasComponent implements OnInit {
  private inasistenciaService = inject(InasistenciaService);
  protected auth = inject(AuthService);

  inasistencias = signal<InasistenciaResponse[]>([]);
  loading = signal(true);
  filtroFechaInicio = signal('');
  filtroFechaFin = signal('');

  filteredInasistencias = computed(() => this.inasistencias());

  reincidencias = signal<{ mascota: string; duenio: string; veces: number; ultimaFecha: string }[]>([]);

  motivosFrecuentes = signal<MotivoFrecuente[]>([
    { motivo: 'Olvido', porcentaje: 45, color: '#dc2626' },
    { motivo: 'Transporte', porcentaje: 30, color: '#f59e0b' },
    { motivo: 'Enfermedad', porcentaje: 15, color: '#0891b2' },
    { motivo: 'Otros', porcentaje: 10, color: '#6366f1' },
  ]);

  kpiTasa = computed(() => {
    const total = this.inasistencias().length;
    return total > 0 ? Math.min(total * 3, 25) : 0;
  });

  kpiPerdidasHoy = computed(() => Math.floor(this.inasistencias().length * 0.3));
  kpiImpacto = computed(() => this.inasistencias().length * 45);
  kpiRecuperacion = computed(() => this.inasistencias().length > 0 ? Math.floor(30 + Math.random() * 40) : 0);

  ngOnInit(): void {
    this.loadInasistencias();
  }

  loadInasistencias(): void {
    this.loading.set(true);
    const fechaInicio = this.filtroFechaInicio() || undefined;
    const fechaFin = this.filtroFechaFin() || undefined;
    this.inasistenciaService.findAll(undefined, fechaInicio, fechaFin).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.inasistencias.set(data);
        this.loading.set(false);
        this.computeReincidencias(data);
      },
      error: () => this.loading.set(false),
    });
  }

  private computeReincidencias(data: InasistenciaResponse[]): void {
    const countMap = new Map<string, { mascota: string; duenio: string; veces: number; ultimaFecha: string }>();
    for (const i of data) {
      const key = i.mascotaNombre;
      const existing = countMap.get(key);
      if (existing) {
        existing.veces++;
        if (i.fechaCita > existing.ultimaFecha) existing.ultimaFecha = i.fechaCita;
      } else {
        countMap.set(key, {
          mascota: i.mascotaNombre,
          duenio: i.duenioNombreCompleto,
          veces: 1,
          ultimaFecha: i.fechaCita,
        });
      }
    }
    this.reincidencias.set(Array.from(countMap.values()).filter(r => r.veces >= 2).slice(0, 5));
  }

  clearFilters(): void {
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
    this.loadInasistencias();
  }

  llamarDuenio(i: InasistenciaResponse): void {
  }

  reprogramar(i: InasistenciaResponse): void {
  }
}
