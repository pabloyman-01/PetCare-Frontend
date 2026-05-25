import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ReporteService } from '../../core/services/reporte.service';
import { CitaService } from '../../core/services/cita.service';
import { MascotaService } from '../../core/services/mascota.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ReporteCitaResponse, ReporteCostoCitaResponse, ServicioSolicitadoResponse } from '../../core/models/reporte.model';
import { InasistenciaResponse } from '../../core/models/inasistencia.model';
import { VacunaMascotaResponse } from '../../core/models/vacuna.model';
import { HistoriaClinicaResponse } from '../../core/models/atencion-clinica.model';
import { CitaResponse } from '../../core/models/cita.model';
import { MascotaResponse } from '../../core/models/mascota.model';
import { catchError, EMPTY } from 'rxjs';

type ReporteTab = 'citas' | 'inasistencias' | 'vacunas' | 'costos' | 'servicios' | 'historia';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LoadingSpinnerComponent,
  ],
  template: `
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-headline-lg font-extrabold text-on-surface">Reportes</h2>
      <p class="text-body-md text-on-surface-variant mt-1">Análisis y estadísticas de la clínica</p>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Ingresos Totales</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5">\${{ kpiIngresos() }}</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-primary text-[24px]">payments</span>
          </div>
        </div>
      </div>
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Citas Completadas</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5">{{ kpiCompletadas() }}</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-success text-[24px]">check_circle</span>
          </div>
        </div>
      </div>
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Nuevas Mascotas</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5">{{ kpiNuevasMascotas() }}</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-secondary text-[24px]">pets</span>
          </div>
        </div>
      </div>
      <div class="glass-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Tasa Inasistencia</p>
            <p class="text-[26px] font-extrabold text-on-surface mt-1.5">{{ kpiTasaInasistencia() }}%</p>
          </div>
          <div class="w-11 h-11 rounded-2xl bg-error/10 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-error text-[24px]">person_off</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex flex-wrap gap-1.5 bg-surface-container/60 rounded-2xl p-1.5 shadow-sm">
      @for (tab of tabs; track tab.value) {
        <button (click)="activeTab.set(tab.value)"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-sm font-semibold transition-all duration-200"
                [class.bg-primary]="activeTab() === tab.value"
                [class.text-on-primary]="activeTab() === tab.value"
                [class.text-on-surface-variant]="activeTab() !== tab.value"
                [class.shadow-sm]="activeTab() === tab.value"
                [class.hover:bg-surface-container-high]="activeTab() !== tab.value">
          {{ tab.label }}
        </button>
      }
    </div>

    <!-- Tab Content -->
    @if (loading()) {
      <app-loading-spinner message="Cargando reporte..." />
    } @else {
      @switch (activeTab()) {
        <!-- Tab 1: Citas -->
        @case ('citas') {
          <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-primary/5 to-transparent border-b border-outline-variant/20 px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                </div>
                <div>
                  <h3 class="text-title-md font-bold text-on-surface">Reporte de Citas</h3>
                  <p class="text-body-sm text-on-surface-variant">Consulta el historial de citas por estado y rango de fechas</p>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Estado</label>
                  <select [ngModel]="reporteCitasEstado()" (ngModelChange)="reporteCitasEstado.set($event)"
                           class="select select-bordered w-full min-w-[150px]">
                    <option value="">Todos</option>
                    <option value="PROGRAMADA">Programada</option>
                    <option value="CONFIRMADA">Confirmada</option>
                    <option value="ATENDIDA">Atendida</option>
                    <option value="CANCELADA">Cancelada</option>
                    <option value="NO_ASISTIO">No Asistió</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Inicio</label>
                  <input type="date" [ngModel]="reporteCitasFechaInicio()" (ngModelChange)="reporteCitasFechaInicio.set($event)"
                         class="input input-bordered w-full" />
                </div>
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Fin</label>
                  <input type="date" [ngModel]="reporteCitasFechaFin()" (ngModelChange)="reporteCitasFechaFin.set($event)"
                         class="input input-bordered w-full" />
                </div>
                <button (click)="loadReporteCitas()" class="btn btn-primary">Consultar</button>
              </div>

              <div class="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/20">
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Mascota</th>
                      <th>Dueño</th>
                      <th>Veterinario</th>
                      <th class="text-center">Estado</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (reporteCitas().length === 0) {
                      <tr>
                        <td colspan="6">
                          <div class="flex flex-col items-center justify-center py-10 text-center">
                            <span class="material-symbols-outlined text-[40px] text-on-surface-variant/20">calendar_month</span>
                            <p class="text-body-sm text-on-surface-variant mt-2">Selecciona filtros y presiona "Consultar"</p>
                          </div>
                        </td>
                      </tr>
                    } @else {
                      @for (r of reporteCitas(); track r.id) {
                        <tr class="hover:bg-surface-container-low/50 transition-colors">
                          <td>{{ r.fecha }} {{ r.horaInicio.slice(0,5) }}</td>
                          <td class="font-semibold text-on-surface">{{ r.mascotaNombre }}</td>
                          <td class="text-on-surface-variant">{{ r.duenioNombreCompleto }}</td>
                          <td class="text-on-surface-variant">{{ r.veterinarioNombreCompleto }}</td>
                          <td class="text-center">
                            <span class="badge badge-ghost">{{ estadoLabel(r.estado) }}</span>
                          </td>
                          <td class="text-right font-bold text-on-surface tabular-nums">\${{ r.total.toFixed(2) }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- Tab 2: Inasistencias -->
        @case ('inasistencias') {
          <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-primary/5 to-transparent border-b border-outline-variant/20 px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-error text-[20px]">event_busy</span>
                </div>
                <div>
                  <h3 class="text-title-md font-bold text-on-surface">Inasistencias</h3>
                  <p class="text-body-sm text-on-surface-variant">Registro de citas no atendidas</p>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Inicio</label>
                  <input type="date" [ngModel]="reporteInasistenciaFechaInicio()" (ngModelChange)="reporteInasistenciaFechaInicio.set($event)"
                         class="input input-bordered w-full" />
                </div>
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Fin</label>
                  <input type="date" [ngModel]="reporteInasistenciaFechaFin()" (ngModelChange)="reporteInasistenciaFechaFin.set($event)"
                         class="input input-bordered w-full" />
                </div>
                <button (click)="loadReporteInasistencias()" class="btn btn-primary">Consultar</button>
              </div>

              <div class="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/20">
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th>Mascota</th>
                      <th>Dueño</th>
                      <th class="text-center">Fecha</th>
                      <th>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (reporteInasistencias().length === 0) {
                      <tr>
                        <td colspan="4">
                          <div class="flex flex-col items-center justify-center py-10 text-center">
                            <span class="material-symbols-outlined text-[40px] text-on-surface-variant/20">event_busy</span>
                            <p class="text-body-sm text-on-surface-variant mt-2">Selecciona filtros y presiona "Consultar"</p>
                          </div>
                        </td>
                      </tr>
                    } @else {
                      @for (r of reporteInasistencias(); track r.id) {
                        <tr class="hover:bg-surface-container-low/50 transition-colors">
                          <td class="font-semibold text-on-surface">{{ r.mascotaNombre }}</td>
                          <td class="text-on-surface-variant">{{ r.duenioNombreCompleto }}</td>
                          <td class="text-center text-on-surface">{{ r.fechaCita }}</td>
                          <td class="text-on-surface-variant">{{ r.observacion }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- Tab 3: Vacunas Próximas -->
        @case ('vacunas') {
          <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-primary/5 to-transparent border-b border-outline-variant/20 px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-tertiary/10 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-tertiary text-[20px]">vaccines</span>
                </div>
                <div>
                  <h3 class="text-title-md font-bold text-on-surface">Vacunas Próximas</h3>
                  <p class="text-body-sm text-on-surface-variant">Control de vacunas programadas y aplicadas</p>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Inicio</label>
                  <input type="date" [ngModel]="reporteVacunasFechaInicio()" (ngModelChange)="reporteVacunasFechaInicio.set($event)"
                         class="input input-bordered w-full" />
                </div>
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Fin</label>
                  <input type="date" [ngModel]="reporteVacunasFechaFin()" (ngModelChange)="reporteVacunasFechaFin.set($event)"
                         class="input input-bordered w-full" />
                </div>
                <button (click)="loadReporteVacunas()" class="btn btn-primary">Consultar</button>
              </div>

              <div class="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/20">
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th>Mascota</th>
                      <th>Vacuna</th>
                      <th>Veterinario</th>
                      <th class="text-center">Fecha Aplicación</th>
                      <th class="text-center">Próxima Dosis</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (reporteVacunas().length === 0) {
                      <tr>
                        <td colspan="5">
                          <div class="flex flex-col items-center justify-center py-10 text-center">
                            <span class="material-symbols-outlined text-[40px] text-on-surface-variant/20">vaccines</span>
                            <p class="text-body-sm text-on-surface-variant mt-2">Selecciona filtros y presiona "Consultar"</p>
                          </div>
                        </td>
                      </tr>
                    } @else {
                      @for (r of reporteVacunas(); track r.id) {
                        <tr class="hover:bg-surface-container-low/50 transition-colors">
                          <td class="font-semibold text-on-surface">{{ r.mascotaNombre }}</td>
                          <td class="text-on-surface">{{ r.vacunaNombre }}</td>
                          <td class="text-on-surface-variant">{{ r.veterinarioNombreCompleto }}</td>
                          <td class="text-center text-on-surface">{{ r.fechaAplicacion }}</td>
                          <td class="text-center text-on-surface">{{ r.fechaProximaDosis || 'N/A' }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- Tab 4: Costos por Cita -->
        @case ('costos') {
          <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-primary/5 to-transparent border-b border-outline-variant/20 px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                </div>
                <div>
                  <h3 class="text-title-md font-bold text-on-surface">Costos por Cita</h3>
                  <p class="text-body-sm text-on-surface-variant">Desglose detallado de costos por cita</p>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">ID de Cita</label>
                  <input type="number" placeholder="Ej: 123"
                         [ngModel]="reporteCostoCitaId()" (ngModelChange)="reporteCostoCitaId.set($event)"
                         class="input input-bordered w-36" />
                </div>
                <button (click)="loadReporteCosto()" [disabled]="!reporteCostoCitaId()"
                        class="btn btn-primary">Consultar</button>
              </div>
              @if (reporteCosto()) {
                @let c = reporteCosto()!;
                <div class="rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 p-6 space-y-3">
                  <h4 class="text-title-md font-bold text-on-surface flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-[20px]">receipt</span>
                    Desglose — Cita #{{ c.citaId }}
                  </h4>
                  <div class="space-y-2">
                    @for (d of c.detalles; track d.servicioId) {
                      <div class="flex items-center justify-between py-2.5 border-b border-outline-variant/10 last:border-0">
                        <div>
                          <p class="text-body-md font-semibold text-on-surface">{{ d.nombreServicio }}</p>
                          <p class="text-label-sm text-on-surface-variant mt-0.5">\${{ d.costoUnitario.toFixed(2) }} x {{ d.cantidad }}</p>
                        </div>
                        <p class="text-body-md font-bold text-on-surface tabular-nums">\${{ d.subtotal.toFixed(2) }}</p>
                      </div>
                    }
                  </div>
                  <div class="flex justify-between pt-2">
                    <span class="text-body-md text-on-surface-variant">Subtotal</span>
                    <span class="text-body-md font-semibold text-on-surface tabular-nums">\${{ c.subtotal.toFixed(2) }}</span>
                  </div>
                  @if (c.descuento > 0) {
                    <div class="flex justify-between">
                      <span class="text-body-md text-on-surface-variant">Descuento</span>
                      <span class="text-body-md font-semibold text-error tabular-nums">-\${{ c.descuento.toFixed(2) }}</span>
                    </div>
                  }
                  <div class="flex justify-between pt-3 border-t border-outline-variant/20">
                    <span class="text-title-md font-bold text-on-surface">Total</span>
                    <span class="text-title-md font-bold text-primary tabular-nums">\${{ c.total.toFixed(2) }}</span>
                  </div>
                </div>
              } @else {
                <div class="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/20">
                  <table class="table w-full">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th class="text-right">Costo Unit.</th>
                        <th class="text-center">Cant.</th>
                        <th class="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colspan="4">
                          <div class="flex flex-col items-center justify-center py-10 text-center">
                            <span class="material-symbols-outlined text-[40px] text-on-surface-variant/20">receipt_long</span>
                            <p class="text-body-sm text-on-surface-variant mt-2">Ingresa un ID de cita para ver el desglose</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }

        <!-- Tab 5: Servicios más Solicitados -->
        @case ('servicios') {
          <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-primary/5 to-transparent border-b border-outline-variant/20 px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-secondary text-[20px]">inventory_2</span>
                </div>
                <div>
                  <h3 class="text-title-md font-bold text-on-surface">Servicios más Solicitados</h3>
                  <p class="text-body-sm text-on-surface-variant">Ranking de servicios por demanda e ingresos</p>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="flex flex-wrap items-end gap-3 mb-6">
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Inicio</label>
                  <input type="date" [ngModel]="reporteServiciosFechaInicio()" (ngModelChange)="reporteServiciosFechaInicio.set($event)"
                         class="input input-bordered" />
                </div>
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Fin</label>
                  <input type="date" [ngModel]="reporteServiciosFechaFin()" (ngModelChange)="reporteServiciosFechaFin.set($event)"
                         class="input input-bordered" />
                </div>
                <button (click)="loadReporteServicios()" class="btn btn-primary">Consultar</button>
              </div>
              @if (reporteServicios().length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-center">
                  <span class="material-symbols-outlined text-[48px] text-on-surface-variant/20">inventory_2</span>
                  <p class="text-body-md text-on-surface-variant mt-3">Selecciona filtros y presiona "Consultar"</p>
                </div>
              } @else {
                @let maxCant = maxServicioCantidad();
                <div class="space-y-6">
                  @for (s of reporteServicios(); track s.nombreServicio) {
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-3">
                          <span class="text-label-md font-semibold text-on-surface">{{ s.nombreServicio }}</span>
                          <span class="text-label-sm text-on-surface-variant bg-surface-container-low px-2.5 py-0.5 rounded-full">{{ s.cantidadSolicitada }} solicitudes</span>
                        </div>
                        <span class="text-label-md font-bold text-primary tabular-nums">\${{ s.totalGenerado.toFixed(2) }}</span>
                      </div>
                      <div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div class="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" 
                             [style.width.%]="maxCant > 0 ? (s.cantidadSolicitada / maxCant) * 100 : 0"></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Tab 6: Historia Clínica -->
        @case ('historia') {
          <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-primary/5 to-transparent border-b border-outline-variant/20 px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-primary text-[20px]">folder_medical</span>
                </div>
                <div>
                  <h3 class="text-title-md font-bold text-on-surface">Historia Clínica</h3>
                  <p class="text-body-sm text-on-surface-variant">Historial completo de atenciones y controles por mascota</p>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div class="space-y-1">
                  <label class="text-label-sm font-semibold text-on-surface-variant">Mascota</label>
                  <div class="flex gap-2 items-center">
                    <input type="text" placeholder="Buscar..."
                           [ngModel]="historiaMascotaSearch()" (ngModelChange)="historiaMascotaSearch.set($event)"
                            class="input input-bordered w-36" />
                     <select [ngModel]="historiaMascotaId()" (ngModelChange)="historiaMascotaId.set($event)"
                             class="select select-bordered w-64">
                       <option [value]="null">Seleccione...</option>
                       @for (m of filteredHistoriaMascotas(); track m.id) {
                         <option [value]="m.id">{{ m.nombre }} — {{ m.duenioNombreCompleto }}</option>
                       }
                     </select>
                     <button (click)="loadReporteHistoria()" [disabled]="!historiaMascotaId()"
                             class="btn btn-primary">Consultar</button>
                  </div>
                </div>
              </div>
              @if (reporteHistoria()) {
                @let h = reporteHistoria()!;
                <div class="space-y-6">
                  <div class="flex items-center gap-4 pb-4 border-b border-outline-variant/20">
                    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span class="material-symbols-outlined text-primary text-[24px]">pets</span>
                    </div>
                    <div>
                      <h4 class="text-title-md font-bold text-on-surface">{{ h.mascotaNombre }}</h4>
                      <p class="text-body-sm text-on-surface-variant">Dueño: {{ h.duenioNombreCompleto }}</p>
                    </div>
                  </div>

                  <div>
                    <h5 class="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]">stethoscope</span>
                      Atenciones
                    </h5>
                    @if (h.atenciones.length === 0) {
                      <p class="text-body-sm text-on-surface-variant">Sin atenciones registradas</p>
                    } @else {
                      <div class="space-y-3">
                        @for (a of h.atenciones; track a.id) {
                          <div class="p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                            <div class="flex items-center justify-between mb-2">
                              <span class="text-label-sm font-semibold text-primary flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">calendar_today</span>
                                {{ a.fechaRegistro }}
                              </span>
                              <span class="text-label-sm text-on-surface-variant">{{ a.veterinarioNombreCompleto }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <p class="text-label-sm text-on-surface-variant">Motivo</p>
                                <p class="text-body-sm font-semibold text-on-surface">{{ a.motivo }}</p>
                              </div>
                              <div>
                                <p class="text-label-sm text-on-surface-variant">Diagnóstico</p>
                                <p class="text-body-sm text-on-surface-variant">{{ a.diagnostico }}</p>
                              </div>
                              <div>
                                <p class="text-label-sm text-on-surface-variant">Tratamiento</p>
                                <p class="text-body-sm text-on-surface-variant">{{ a.tratamiento }}</p>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <div>
                    <h5 class="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]">query_stats</span>
                      Controles Mensuales
                    </h5>
                    @if (h.controlesMensuales.length === 0) {
                      <p class="text-body-sm text-on-surface-variant">Sin controles mensuales registrados</p>
                    } @else {
                      <div class="space-y-3">
                        @for (c of h.controlesMensuales; track c.id) {
                          <div class="p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                            <div class="flex items-center justify-between mb-2">
                              <span class="text-label-sm font-semibold text-primary flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">calendar_today</span>
                                {{ c.fechaControl }}
                              </span>
                              <span class="text-label-sm text-on-surface-variant">{{ c.veterinarioNombreCompleto }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              @if (c.pesoKg) {
                                <div>
                                  <p class="text-label-sm text-on-surface-variant">Peso</p>
                                  <p class="text-body-sm font-semibold text-on-surface">{{ c.pesoKg }} kg</p>
                                </div>
                              }
                              @if (c.alimentacion) {
                                <div>
                                  <p class="text-label-sm text-on-surface-variant">Alimentación</p>
                                  <p class="text-body-sm text-on-surface-variant">{{ c.alimentacion }}</p>
                                </div>
                              }
                              @if (c.observaciones) {
                                <div>
                                  <p class="text-label-sm text-on-surface-variant">Observaciones</p>
                                  <p class="text-body-sm text-on-surface-variant">{{ c.observaciones }}</p>
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/20">
                  <table class="table w-full">
                    <thead>
                      <tr>
                        <th>Mascota</th>
                        <th>Especie</th>
                        <th>Raza</th>
                        <th>Edad</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colspan="4">
                          <div class="flex flex-col items-center justify-center py-10 text-center">
                            <span class="material-symbols-outlined text-[40px] text-on-surface-variant/20">folder_medical</span>
                            <p class="text-body-sm text-on-surface-variant mt-2">Selecciona una mascota para ver su historia clínica</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }
      }
    }
  </div>
  `
})
export class ReportesComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private citaService = inject(CitaService);
  private mascotaService = inject(MascotaService);
  protected auth = inject(AuthService);

  tabs: { label: string; value: ReporteTab }[] = [
    { label: 'Reporte de Citas', value: 'citas' },
    { label: 'Inasistencias', value: 'inasistencias' },
    { label: 'Vacunas Próximas', value: 'vacunas' },
    { label: 'Costos por Cita', value: 'costos' },
    { label: 'Servicios más Solicitados', value: 'servicios' },
    { label: 'Historia Clínica', value: 'historia' },
  ];

  activeTab = signal<ReporteTab>('citas');
  loading = signal(false);

  // KPIs
  kpiIngresos = () => '12,580';
  kpiCompletadas = () => 142;
  kpiNuevasMascotas = () => 28;
  kpiTasaInasistencia = () => 8;

  // Tab 1
  reporteCitas = signal<ReporteCitaResponse[]>([]);
  reporteCitasEstado = signal('');
  reporteCitasFechaInicio = signal('');
  reporteCitasFechaFin = signal('');

  // Tab 2
  reporteInasistencias = signal<InasistenciaResponse[]>([]);
  reporteInasistenciaFechaInicio = signal('');
  reporteInasistenciaFechaFin = signal('');

  // Tab 3
  reporteVacunas = signal<VacunaMascotaResponse[]>([]);
  reporteVacunasFechaInicio = signal('');
  reporteVacunasFechaFin = signal('');

  // Tab 4
  reporteCosto = signal<ReporteCostoCitaResponse | null>(null);
  reporteCostoCitaId = signal<number | null>(null);

  // Tab 5
  reporteServicios = signal<ServicioSolicitadoResponse[]>([]);
  reporteServiciosFechaInicio = signal('');
  reporteServiciosFechaFin = signal('');

  maxServicioCantidad = computed(() => {
    const items = this.reporteServicios();
    return items.length > 0 ? Math.max(...items.map(s => s.cantidadSolicitada)) : 0;
  });

  // Tab 6
  reporteHistoria = signal<HistoriaClinicaResponse | null>(null);
  historiaMascotaId = signal<number | null>(null);
  historiaMascotaSearch = signal('');
  historiaMascotas = signal<MascotaResponse[]>([]);

  filteredHistoriaMascotas = computed(() => {
    const term = this.historiaMascotaSearch().toLowerCase().trim();
    if (!term) return this.historiaMascotas();
    return this.historiaMascotas().filter(m => m.nombre.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.mascotaService.findAll(undefined, undefined, true).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.historiaMascotas.set(data),
    });
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'Programada',
      CONFIRMADA: 'Confirmada',
      ATENDIDA: 'Atendida',
      CANCELADA: 'Cancelada',
      NO_ASISTIO: 'No Asistió',
    };
    return map[estado] || estado;
  }

  loadReporteCitas(): void {
    this.loading.set(true);
    this.reporteService.findCitas({
      estado: this.reporteCitasEstado() || undefined,
      fechaInicio: this.reporteCitasFechaInicio() || undefined,
      fechaFin: this.reporteCitasFechaFin() || undefined,
    }).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.reporteCitas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadReporteInasistencias(): void {
    this.loading.set(true);
    this.reporteService.findInasistencias(
      undefined,
      this.reporteInasistenciaFechaInicio() || undefined,
      this.reporteInasistenciaFechaFin() || undefined,
    ).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.reporteInasistencias.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadReporteVacunas(): void {
    this.loading.set(true);
    this.reporteService.findVacunasProximas(
      this.reporteVacunasFechaInicio() || undefined,
      this.reporteVacunasFechaFin() || undefined,
    ).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.reporteVacunas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadReporteCosto(): void {
    const citaId = this.reporteCostoCitaId();
    if (!citaId) return;
    this.loading.set(true);
    this.reporteService.findCostoCita(citaId).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.reporteCosto.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadReporteServicios(): void {
    this.loading.set(true);
    this.reporteService.findServiciosMasSolicitados(
      this.reporteServiciosFechaInicio() || undefined,
      this.reporteServiciosFechaFin() || undefined,
    ).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.reporteServicios.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadReporteHistoria(): void {
    const mascotaId = this.historiaMascotaId();
    if (!mascotaId) return;
    this.loading.set(true);
    this.reporteService.findHistoriaClinica(mascotaId).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.reporteHistoria.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
