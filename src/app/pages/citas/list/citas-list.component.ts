import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CitaService } from '../../../core/services/cita.service';
import { AuthService } from '../../../core/services/auth.service';
import { InasistenciaService } from '../../../core/services/inasistencia.service';
import { VeterinarioService } from '../../../core/services/veterinario.service';
import { ServicioService } from '../../../core/services/servicio.service';
import { CitaResponse, EstadoCita } from '../../../core/models/cita.model';
import { VeterinarioResponse } from '../../../core/models/veterinario.model';
import { ServicioResponse } from '../../../core/models/servicio.model';
import { InasistenciaRequest } from '../../../core/models/inasistencia.model';
import { catchError, EMPTY } from 'rxjs';

type ViewMode = 'month' | 'week' | 'day';

@Component({
  selector: 'app-citas-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #d3e4fe; border-radius: 10px; }
    .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(229, 238, 255, 0.5); }
  `],
  template: `
  <div class="flex flex-col gap-6 pb-8">

    <!-- Section Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Mi Agenda y Consultas</h2>
        <p class="text-body-md text-on-surface-variant">Visualiza y coordina el calendario de atenci&oacute;n cl&iacute;nica.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="bg-white border border-outline-variant rounded-lg p-1 flex gap-1">
          @for (mode of viewModes; track mode.value) {
            <button (click)="viewMode.set(mode.value)"
                    class="px-4 py-1.5 rounded-md font-label-md text-label-md transition-all"
                    [class.bg-surface-container-high]="viewMode() === mode.value"
                    [class.text-primary]="viewMode() === mode.value"
                    [class.text-on-surface-variant]="viewMode() !== mode.value"
                    [class.hover:bg-surface-container-low]="viewMode() !== mode.value">
              {{ mode.label }}
            </button>
          }
        </div>
      </div>
    </div>

    <!-- Main Grid 12-col -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">

      <!-- Filters Sidebar (Left) -->
      <aside class="xl:col-span-3 flex flex-col gap-6">
        <div class="glass-card rounded-xl p-6 shadow-sm">
          <h3 class="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-sm">filter_list</span>
            Filtros de Vista
          </h3>
          <div class="space-y-4">
            <!-- Veterinario -->
            <div>
              <label class="block font-label-sm text-label-sm text-on-surface-variant mb-2">Veterinario</label>
              <select [ngModel]="veterinarioFilter()" (ngModelChange)="veterinarioFilter.set($event)"
                      class="w-full bg-surface border-outline-variant rounded-lg text-body-sm focus:ring-primary focus:border-primary">
                <option [ngValue]="null">Todos los profesionales</option>
                @for (v of veterinarios(); track v.id) {
                  <option [ngValue]="v.id">{{ v.nombres }} {{ v.apellidos }}</option>
                }
              </select>
            </div>

            <!-- Estado -->
            <div>
              <label class="block font-label-sm text-label-sm text-on-surface-variant mb-2">Estado</label>
              <div class="space-y-2">
                @for (est of estadoOptions; track est.value) {
                  <label class="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" [checked]="estadoFilter().includes(est.value)"
                           (change)="toggleEstadoFilter(est.value)"
                           class="rounded text-primary focus:ring-primary" />
                    <span class="text-body-sm text-on-surface-variant group-hover:text-on-surface">{{ est.label }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Tipo Servicio -->
            <div>
              <label class="block font-label-sm text-label-sm text-on-surface-variant mb-2">Tipo de Servicio</label>
              <div class="flex flex-wrap gap-2">
                @for (s of servicios(); track s.id) {
                  <button (click)="toggleServicioFilter(s.id)"
                          class="px-3 py-1 rounded-full text-[12px] font-bold transition-all border"
                          [ngClass]="{
                            'bg-secondary-container/30 text-on-secondary-container border-secondary-container': servicioFilter().includes(s.id),
                            'bg-surface-variant/30 text-on-primary-fixed-variant border-outline-variant': !servicioFilter().includes(s.id)
                          }">
                    {{ s.nombre }}
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Today's Appointments -->
        <div class="glass-card rounded-xl p-6 shadow-sm flex-1">
          <h3 class="font-label-md text-label-md text-on-surface mb-4 flex justify-between items-center">
            <span>Citas de Hoy</span>
            <span class="text-[11px] bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full">{{ citasHoy().length }} hoy</span>
          </h3>
          @if (citasHoy().length === 0) {
            <div class="flex flex-col items-center justify-center py-8 text-center">
              <span class="material-symbols-outlined text-3xl text-outline-variant">event_available</span>
              <p class="mt-2 text-body-sm text-on-surface-variant">No hay citas para hoy</p>
            </div>
          } @else {
            <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              @for (cita of citasHoy(); track cita.id) {
                <div (click)="selectCita(cita)"
                     class="p-3 border-l-4 rounded-r-lg bg-white shadow-sm cursor-pointer hover:shadow-md transition-all"
                     [class.border-secondary]="cita.estado === 'PROGRAMADA'"
                     [class.border-primary]="cita.estado === 'CONFIRMADA'"
                     [class.border-outline]="cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO'"
                     [class.border-success]="cita.estado === 'ATENDIDA'">
                  <p class="text-[11px] font-bold uppercase"
                     [class.text-secondary]="cita.estado === 'PROGRAMADA'"
                     [class.text-primary]="cita.estado === 'CONFIRMADA'"
                     [class.text-outline]="cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO'"
                     [class.text-success]="cita.estado === 'ATENDIDA'">
                    {{ cita.horaInicio.slice(0, 5) }} &middot; {{ estadoLabel(cita.estado) }}
                  </p>
                  <p class="font-label-md text-label-md mt-1">{{ cita.mascotaNombre }}</p>
                  <p class="text-body-sm text-on-surface-variant">{{ cita.motivo }}</p>
                  @if (!auth.isDuenioOnly()) {
                    <button (click)="$event.stopPropagation(); selectCita(cita)"
                            class="mt-2 w-full py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                            [class.bg-secondary]="cita.estado === 'PROGRAMADA'"
                            [class.bg-primary]="cita.estado === 'CONFIRMADA'"
                            [class.border]="cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO'"
                            [class.border-outline]="cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO'"
                            [class.text-white]="cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA'"
                            [class.text-outline]="cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO'"
                            [class.hover:bg-opacity-90]="cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA'">
                      @if (cita.estado === 'PROGRAMADA') {
                        <span class="material-symbols-outlined text-[14px]">play_circle</span>
                        INICIAR ATENCI&Oacute;N
                      } @else if (cita.estado === 'CONFIRMADA') {
                        <span class="material-symbols-outlined text-[14px]">medical_services</span>
                        ATENDER CONSULTA
                      } @else {
                        VER DETALLES
                      }
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
      </aside>

      <!-- Calendar Area (Right) -->
      <div class="xl:col-span-9 flex flex-col gap-4">

        <!-- Calendar Controls -->
        <div class="glass-card rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center gap-4">
            <h4 class="text-headline-md font-bold text-on-surface">{{ periodLabel() }}</h4>
            <div class="flex gap-1">
              <button (click)="prevPeriod()"
                      class="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors">
                <span class="material-symbols-outlined text-on-surface-variant">chevron_left</span>
              </button>
              <button (click)="nextPeriod()"
                      class="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors">
                <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="goToToday()"
                    class="px-3 py-1 bg-surface-container-high text-primary font-label-md text-label-md rounded-lg hover:bg-primary-container/50 transition-all">
              Hoy
            </button>
            <span class="material-symbols-outlined text-outline">calendar_today</span>
          </div>
        </div>

        <!-- Loading -->
        @if (loading()) {
          <div class="flex items-center justify-center py-32">
            <div class="flex flex-col items-center gap-4">
              <span class="loading loading-spinner loading-lg text-primary"></span>
              <p class="text-body-sm text-on-surface-variant">Cargando citas...</p>
            </div>
          </div>
        } @else {
          <!-- Calendar Grid -->
          @if (viewMode() === 'month') {
            <div class="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <div class="grid grid-cols-7 border-b border-outline-variant">
                @for (day of dayHeaders; track day) {
                  <div class="p-3 text-center border-l border-outline-variant first:border-l-0 bg-surface-container-low">
                    <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ day }}</p>
                  </div>
                }
              </div>
              <div class="divide-y divide-outline-variant/10 max-h-[600px] overflow-y-auto custom-scrollbar">
                @for (week of calendarWeeks(); track $index) {
                  <div class="grid grid-cols-7">
                    @for (day of week; track day.toISOString()) {
                       <div class="min-h-[100px] p-2 border-r border-outline-variant/30 last:border-r-0"
                            [ngClass]="{'bg-primary-container/5': isToday(day), 'opacity-50': !isCurrentMonth(day)}">
                        <p class="text-label-sm font-semibold mb-1"
                           [class.text-primary]="isToday(day)"
                           [class.text-on-surface]="!isToday(day)">
                          {{ day.getDate() }}
                        </p>
                        <div class="space-y-1">
                          @for (cita of getCitasForDate(day); track cita.id) {
                            <div (click)="selectCita(cita)"
                                 class="text-[10px] leading-tight px-1.5 py-0.5 rounded cursor-pointer font-bold transition-all truncate flex items-center gap-1"
                                 [ngClass]="{
                                   'bg-primary-container text-primary': cita.estado === 'CONFIRMADA',
                                   'bg-secondary-container/60 text-on-secondary-container': cita.estado === 'PROGRAMADA',
                                   'bg-error-container/30 text-error': cita.estado === 'CANCELADA',
                                   'bg-success-container/60 text-success': cita.estado === 'ATENDIDA',
                                   'bg-surface-container-high text-on-surface-variant': cita.estado === 'NO_ASISTIO'
                                 }">
                              <span>{{ cita.horaInicio.slice(0, 5) }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          } @else if (viewMode() === 'week') {
            <div class="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <!-- Day headers -->
              <div class="grid grid-cols-[100px_repeat(7,1fr)] border-b border-outline-variant">
                <div class="p-3"></div>
                @for (day of calendarDays(); track day.toISOString()) {
                  <div class="p-3 text-center border-l border-outline-variant"
                       [class.bg-surface-container-low]="isToday(day)">
                    <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ dayName(day) }}</p>
                    <p class="text-headline-md font-headline-md"
                       [class.text-primary]="isToday(day)"
                       [class.text-on-surface]="!isToday(day)">{{ day.getDate() }}</p>
                  </div>
                }
              </div>
              <!-- Time slots -->
              <div class="max-h-[600px] overflow-y-auto custom-scrollbar">
                @for (hour of timeSlots; track hour) {
                  <div class="grid grid-cols-[100px_repeat(7,1fr)] border-b border-outline-variant min-h-[80px]">
                    <div class="p-2 text-right text-label-sm text-outline border-r border-outline-variant">
                      {{ formatHour(hour) }}
                    </div>
                    @for (day of calendarDays(); track day.toISOString()) {
                       <div class="border-l border-outline-variant p-1 relative group hover:bg-surface-container-lowest/30 transition-colors"
                            [ngClass]="{'bg-surface-container-low/20': isToday(day)}">
                        @for (cita of getCitasForDateHour(day, hour); track cita.id) {
                          <div (click)="selectCita(cita)"
                               class="absolute inset-x-1 top-1 p-2 rounded-lg shadow-sm border z-10 cursor-pointer hover:scale-[1.01] transition-all"
                               [ngClass]="{
                                 'bg-secondary-container text-on-secondary-container border-secondary/20': cita.estado === 'PROGRAMADA',
                                 'bg-primary-container text-on-primary-container border-primary/20': cita.estado === 'CONFIRMADA',
                                 'bg-tertiary-container text-on-tertiary-container border-tertiary/20': cita.estado === 'ATENDIDA',
                                 'bg-surface-container-high text-on-surface-variant border-outline-variant/30': cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO'
                               }">
                            <div class="flex justify-between items-start">
                              <p class="text-[10px] font-bold uppercase">{{ (cita.motivo || 'Cita').split(' ')[0] }}</p>
                              <span class="material-symbols-outlined text-[14px]">more_vert</span>
                            </div>
                            <p class="text-label-md leading-tight mt-0.5">{{ cita.mascotaNombre }}</p>
                            <p class="text-[10px] opacity-80 truncate">Due&ntilde;o: {{ cita.duenioNombreCompleto }}</p>
                            @if (!auth.isAsistente() && cita.estado !== 'CANCELADA' && cita.estado !== 'NO_ASISTIO' && cita.estado !== 'ATENDIDA') {
                              <button (click)="$event.stopPropagation(); router.navigate(['/atencion-clinica'], {queryParams: {citaId: cita.id}})"
                                      class="mt-2 w-full py-1 bg-on-secondary-container/10 border border-on-secondary-container/20 rounded text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-on-secondary-container/20 transition-all"
                                       [ngClass]="{'text-on-primary-container': cita.estado === 'CONFIRMADA'}">
                                <span class="material-symbols-outlined text-[12px]">play_arrow</span>
                                ATENDER
                              </button>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden p-4">
              @for (day of calendarDays(); track day.toISOString()) {
                <div class="mb-4 last:mb-0">
                  <div class="flex items-center gap-3 mb-3 px-2">
                    <span class="text-headline-md font-extrabold"
                          [class.text-primary]="isToday(day)"
                          [class.text-on-surface]="!isToday(day)">{{ day.getDate() }}</span>
                    <span class="text-label-md text-on-surface-variant">{{ dayName(day) }}, {{ monthName(day) }}</span>
                  </div>
                  @if (getCitasForDate(day).length === 0) {
                    <div class="flex flex-col items-center justify-center py-8 text-center">
                      <span class="material-symbols-outlined text-4xl text-outline-variant">event_busy</span>
                      <p class="mt-2 text-body-sm text-on-surface-variant">No hay citas para este d&iacute;a</p>
                    </div>
                  } @else {
                    <div class="space-y-2">
                      @for (cita of getCitasForDate(day); track cita.id) {
                        <div (click)="selectCita(cita)"
                             class="glass-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4">
                          <div class="w-16 text-center flex-shrink-0">
                            <p class="text-title-md font-bold text-primary">{{ cita.horaInicio.slice(0, 5) }}</p>
                            <p class="text-label-sm text-on-surface-variant">{{ cita.horaFin.slice(0, 5) }}</p>
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-body-md font-semibold text-on-surface truncate">{{ cita.mascotaNombre }}</p>
                            <p class="text-label-sm text-on-surface-variant truncate">{{ cita.veterinarioNombreCompleto }}</p>
                          </div>
                          <span class="px-3 py-1 rounded-full text-label-sm font-bold"
                                [ngClass]="{
                                  'bg-secondary-container/60 text-on-secondary-container': cita.estado === 'PROGRAMADA',
                                  'bg-primary-container/60 text-primary': cita.estado === 'CONFIRMADA',
                                  'bg-error-container/30 text-error': cita.estado === 'CANCELADA',
                                  'bg-success-container/60 text-success': cita.estado === 'ATENDIDA',
                                  'bg-surface-container-high text-on-surface-variant': cita.estado === 'NO_ASISTIO'
                                }">
                            {{ estadoLabel(cita.estado) }}
                          </span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>

    <!-- Stats Footer -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div class="glass-card rounded-xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div>
          <p class="text-headline-md font-headline-md font-bold">{{ statsCompletadasHoy() }}</p>
          <p class="text-body-sm text-on-surface-variant">Completadas hoy</p>
        </div>
      </div>
      <div class="glass-card rounded-xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
          <span class="material-symbols-outlined">schedule</span>
        </div>
        <div>
          <p class="text-headline-md font-headline-md font-bold">{{ statsPendientes() }}</p>
          <p class="text-body-sm text-on-surface-variant">Pendientes</p>
        </div>
      </div>
      <div class="glass-card rounded-xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
          <span class="material-symbols-outlined">warning</span>
        </div>
        <div>
          <p class="text-headline-md font-headline-md font-bold">{{ statsUrgencias() }}</p>
          <p class="text-body-sm text-on-surface-variant">Urgencias</p>
        </div>
      </div>
    </div>

  </div>

  <!-- Detail Modal -->
  @if (selectedCita(); as cita) {
    <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="selectedCita.set(null)">
      <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
          <h3 class="text-headline-md font-bold text-on-surface">Detalles de la Cita</h3>
          <button (click)="selectedCita.set(null)" class="btn btn-ghost btn-square btn-sm">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 space-y-5">
          <!-- Estado Badge -->
          <div class="flex items-center justify-between">
            <span class="badge"
                  [ngClass]="{
                    'bg-warning-container/60': cita.estado === 'PROGRAMADA',
                    'text-warning': cita.estado === 'PROGRAMADA',
                    'bg-primary-container/60': cita.estado === 'CONFIRMADA',
                    'text-primary': cita.estado === 'CONFIRMADA',
                    'bg-error-container/30': cita.estado === 'CANCELADA',
                    'text-error': cita.estado === 'CANCELADA',
                    'bg-success-container/60': cita.estado === 'ATENDIDA',
                    'text-success': cita.estado === 'ATENDIDA',
                    'bg-surface-container-high': cita.estado === 'NO_ASISTIO',
                    'text-on-surface-variant': cita.estado === 'NO_ASISTIO'
                  }">
              <span class="w-1.5 h-1.5 rounded-full"
                    [class.bg-warning]="cita.estado === 'PROGRAMADA'"
                    [class.bg-primary]="cita.estado === 'CONFIRMADA'"
                    [class.bg-error]="cita.estado === 'CANCELADA'"
                    [class.bg-success]="cita.estado === 'ATENDIDA'"
                    [class.bg-on-surface-variant]="cita.estado === 'NO_ASISTIO'"></span>
              {{ estadoLabel(cita.estado) }}
            </span>
          </div>

          <!-- Info Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-label-sm text-on-surface-variant">Mascota</p>
              <p class="text-body-md font-semibold text-on-surface">{{ cita.mascotaNombre }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Dueño</p>
              <p class="text-body-md font-semibold text-on-surface">{{ cita.duenioNombreCompleto }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Veterinario</p>
              <p class="text-body-md font-semibold text-on-surface">{{ cita.veterinarioNombreCompleto }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Fecha</p>
              <p class="text-body-md font-semibold text-on-surface">{{ cita.fecha | date:'dd/MM/yyyy' }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Horario</p>
              <p class="text-body-md font-semibold text-on-surface">{{ cita.horaInicio.slice(0, 5) }} - {{ cita.horaFin.slice(0, 5) }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Duración</p>
              <p class="text-body-md font-semibold text-on-surface">{{ cita.duracionMinutos }} min</p>
            </div>
          </div>

          <!-- Motivo -->
          <div>
            <p class="text-label-sm text-on-surface-variant">Motivo</p>
            <p class="text-body-md text-on-surface mt-1">{{ cita.motivo || 'Sin motivo especificado' }}</p>
          </div>

          <!-- Cost Breakdown -->
          @if (cita.detallesCosto && cita.detallesCosto.length > 0) {
            <div>
              <h4 class="text-title-md font-bold text-on-surface mb-3">Detalle de Costos</h4>
              <div class="space-y-2">
                @for (det of cita.detallesCosto; track det.servicioId) {
                  <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
                    <div>
                      <p class="text-body-md font-semibold text-on-surface">{{ det.nombreServicio }}</p>
                      <p class="text-label-sm text-on-surface-variant">S/ {{ det.costoUnitario.toFixed(2) }} x {{ det.cantidad }}</p>
                    </div>
                    <p class="text-body-md font-semibold text-on-surface">S/ {{ det.subtotal.toFixed(2) }}</p>
                  </div>
                }
              </div>
              <div class="flex items-center justify-between pt-3">
                <p class="text-body-md text-on-surface-variant">Subtotal</p>
                <p class="text-body-md font-semibold text-on-surface">S/ {{ cita.subtotal.toFixed(2) }}</p>
              </div>
              @if (cita.descuento > 0) {
                <div class="flex items-center justify-between pt-1">
                  <p class="text-body-md text-on-surface-variant">Descuento</p>
                  <p class="text-body-md font-semibold text-error">-S/ {{ cita.descuento.toFixed(2) }}</p>
                </div>
              }
              <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <p class="text-title-md font-bold text-on-surface">Total</p>
                <p class="text-title-md font-bold text-primary">S/ {{ cita.total.toFixed(2) }}</p>
              </div>
            </div>
          }

          <!-- Actions -->
          @if (!auth.isDuenioOnly() && cita.estado !== 'CANCELADA' && cita.estado !== 'ATENDIDA' && cita.estado !== 'NO_ASISTIO') {
            <div class="flex flex-wrap gap-3 pt-4 border-t border-outline-variant/20">
              @if (cita.estado === 'PROGRAMADA') {
                <button (click)="confirmarCita(cita.id)"
                        class="btn btn-primary">
                  <span class="material-symbols-outlined text-[18px]">check</span>
                  Confirmar
                </button>
              }
              <button (click)="openCancelarConfirm(cita)"
                      class="btn btn-ghost text-error">
                <span class="material-symbols-outlined text-[18px]">cancel</span>
                Cancelar
              </button>
              <button (click)="openInasistencia(cita)"
                      class="btn btn-ghost">
                <span class="material-symbols-outlined text-[18px]">person_off</span>
                Registrar Inasistencia
              </button>
              @if (!auth.isAsistente()) {
                <a [routerLink]="'/atencion-clinica'" [queryParams]="{citaId: cita.id}"
                   class="btn btn-secondary">
                  <span class="material-symbols-outlined text-[18px]">medical_services</span>
                  Registrar Atención
                </a>
              }
            </div>
          }
        </div>

        <div class="flex justify-end p-6 pt-0">
          <button (click)="selectedCita.set(null)"
                  class="btn btn-primary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  }

  <!-- Cancelar Confirm -->
  @if (showCancelarConfirm()) {
    <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="showCancelarConfirm.set(false)">
      <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
        <h3 class="text-headline-md font-bold text-on-surface mb-2">Cancelar Cita</h3>
        <p class="text-body-md text-on-surface-variant mb-6">¿Estás seguro de cancelar esta cita?</p>
        <div class="flex justify-end gap-3">
          <button (click)="showCancelarConfirm.set(false)"
                  class="btn btn-ghost">
            Volver
          </button>
          <button (click)="cancelarCita()"
                  class="btn btn-error">
            Cancelar Cita
          </button>
        </div>
      </div>
    </div>
  }

  <!-- Inasistencia Modal -->
  @if (showInasistenciaForm(); as inasistenciaData) {
    <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="showInasistenciaForm.set(null)">
      <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
        <h3 class="text-headline-md font-bold text-on-surface mb-2">Registrar Inasistencia</h3>
        <p class="text-body-md text-on-surface-variant mb-4">Ingrese una observación para la inasistencia.</p>
        <div class="space-y-1.5 mb-6">
          <label class="text-label-sm font-semibold text-on-surface-variant">Observación</label>
          <textarea [(ngModel)]="inasistenciaObservacion" rows="3" placeholder="Motivo de la inasistencia..."
                    class="textarea textarea-bordered w-full"></textarea>
        </div>
        <div class="flex justify-end gap-3">
          <button (click)="showInasistenciaForm.set(null)"
                  class="btn btn-ghost">
            Cancelar
          </button>
          <button (click)="registrarInasistencia()"
                  class="btn btn-primary">
            Guardar
          </button>
        </div>
      </div>
    </div>
  }
  `
})
export class CitasListComponent implements OnInit {
  private citaService = inject(CitaService);
  protected auth = inject(AuthService);
  protected router = inject(Router);
  private inasistenciaService = inject(InasistenciaService);
  private veterinarioService = inject(VeterinarioService);
  private servicioService = inject(ServicioService);

  citas = signal<CitaResponse[]>([]);
  loading = signal(true);
  viewMode = signal<ViewMode>('month');
  currentDate = signal(new Date());
  veterinarioFilter = signal<number | null>(null);
  estadoFilter = signal<string[]>([]);
  servicioFilter = signal<number[]>([]);
  selectedCita = signal<CitaResponse | null>(null);
  showCancelarConfirm = signal(false);
  cancelandoCitaId = signal<number | null>(null);
  showInasistenciaForm = signal<{citaId: number} | null>(null);
  inasistenciaObservacion = '';
  veterinarios = signal<VeterinarioResponse[]>([]);
  servicios = signal<ServicioResponse[]>([]);

  dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  viewModes = [
    { label: 'Mes', value: 'month' as ViewMode },
    { label: 'Semana', value: 'week' as ViewMode },
    { label: 'Día', value: 'day' as ViewMode },
  ];
  estadoOptions = [
    { label: 'Confirmada', value: 'CONFIRMADA' },
    { label: 'En Proceso', value: 'PROGRAMADA' },
    { label: 'Pendiente', value: 'PENDIENTE' },
  ];

  filteredCitas = computed(() => {
    let list = this.citas();
    const estado = this.estadoFilter();
    const vetId = this.veterinarioFilter();
    const servId = this.servicioFilter();

    if (estado.length > 0) {
      list = list.filter(c => estado.includes(c.estado));
    }
    if (vetId !== null) {
      list = list.filter(c => c.veterinarioId === vetId);
    }
    if (servId.length > 0) {
      list = list.filter(c =>
        c.detallesCosto?.some(d => servId.includes(d.servicioId))
      );
    }
    return list;
  });

  calendarDays = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();

    if (this.viewMode() === 'day') {
      return [new Date(year, month, date.getDate())];
    }

    if (this.viewMode() === 'week') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(year, month, diff);
      return Array.from({ length: 7 }, (_, i) => new Date(year, month, monday.getDate() + i));
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = startPad; i > 0; i--) {
      days.push(new Date(year, month, -i + 1));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    while (days.length < 42) {
      const next = new Date(days[days.length - 1]);
      next.setDate(next.getDate() + 1);
      days.push(next);
    }
    return days;
  });

  calendarWeeks = computed(() => {
    const days = this.calendarDays();
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  });

  periodLabel = computed(() => {
    const d = this.currentDate();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (this.viewMode() === 'month') return `${months[d.getMonth()]} ${d.getFullYear()}`;
    if (this.viewMode() === 'week') {
      const days = this.calendarDays();
      return `${days[0].getDate()} ${months[days[0].getMonth()]} - ${days[6].getDate()} ${months[days[6].getMonth()]} ${days[6].getFullYear()}`;
    }
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  });

  citasHoy = computed(() => {
    const today = this.formatDate(new Date());
    return this.citas().filter(c => c.fecha === today);
  });

  statsCompletadasHoy = computed(() => {
    const today = this.formatDate(new Date());
    return this.citas().filter(c => c.fecha === today && c.estado === 'ATENDIDA').length;
  });

  statsPendientes = computed(() => {
    return this.citas().filter(c => c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA').length;
  });

  statsUrgencias = computed(() => {
    return this.citas().length;
  });

  ngOnInit(): void {
    if (!this.auth.isDuenioOnly()) {
      this.loadVeterinarios();
      this.loadServicios();
    }
    this.loadCitas();
  }

  private loadVeterinarios(): void {
    this.veterinarioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.veterinarios.set(data),
    });
  }

  private loadServicios(): void {
    this.servicioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.servicios.set(data),
    });
  }

  private loadCitas(): void {
    this.loading.set(true);
    const obs = this.auth.isDuenioOnly()
      ? this.citaService.findAll({ duenioId: 0 }).pipe(catchError(() => EMPTY))
      : this.citaService.findAll();

    obs.subscribe({
      next: (data) => {
        this.citas.set(data.filter(c => c.estado !== 'CANCELADA'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  timeSlots = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

  formatHour(hour: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour;
    return `${h}:00 ${ampm}`;
  }

  getCitasForDateHour(date: Date, hour: number): CitaResponse[] {
    const dateStr = this.formatDate(date);
    return this.filteredCitas().filter(c =>
      c.fecha === dateStr && parseInt(c.horaInicio.split(':')[0]) === hour
    );
  }

  getCitasForDate(date: Date): CitaResponse[] {
    const dateStr = this.formatDate(date);
    return this.filteredCitas().filter(c => c.fecha === dateStr);
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isToday(d: Date): boolean {
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  }

  isCurrentMonth(d: Date): boolean {
    const cur = this.currentDate();
    return d.getMonth() === cur.getMonth() && d.getFullYear() === cur.getFullYear();
  }

  dayName(d: Date): string {
    return this.dayHeaders[d.getDay() === 0 ? 6 : d.getDay() - 1];
  }

  monthName(d: Date): string {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[d.getMonth()];
  }

  prevPeriod(): void {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      if (this.viewMode() === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else if (this.viewMode() === 'week') newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }

  nextPeriod(): void {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      if (this.viewMode() === 'month') newDate.setMonth(newDate.getMonth() + 1);
      else if (this.viewMode() === 'week') newDate.setDate(newDate.getDate() + 7);
      else newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }

  goToToday(): void {
    this.currentDate.set(new Date());
  }

  toggleEstadoFilter(value: string): void {
    this.estadoFilter.update(arr => {
      if (arr.includes(value)) return arr.filter(v => v !== value);
      return [...arr, value];
    });
  }

  toggleServicioFilter(id: number): void {
    this.servicioFilter.update(arr => {
      if (arr.includes(id)) return arr.filter(v => v !== id);
      return [...arr, id];
    });
  }

  selectCita(cita: CitaResponse): void {
    this.selectedCita.set(cita);
  }

  estadoLabel(estado: EstadoCita): string {
    const map: Record<EstadoCita, string> = {
      PROGRAMADA: 'Programada',
      CONFIRMADA: 'Confirmada',
      CANCELADA: 'Cancelada',
      ATENDIDA: 'Atendida',
      NO_ASISTIO: 'No Asistió',
    };
    return map[estado] || estado;
  }

  confirmarCita(id: number): void {
    this.citaService.confirmar(id).pipe(catchError(() => EMPTY)).subscribe({
      next: () => {
        this.selectedCita.set(null);
        this.loadCitas();
      },
    });
  }

  openCancelarConfirm(cita: CitaResponse): void {
    this.cancelandoCitaId.set(cita.id);
    this.showCancelarConfirm.set(true);
  }

  cancelarCita(): void {
    const id = this.cancelandoCitaId();
    if (!id) return;
    this.citaService.cancelar(id).pipe(catchError(() => EMPTY)).subscribe({
      next: () => {
        this.showCancelarConfirm.set(false);
        this.cancelandoCitaId.set(null);
        this.selectedCita.set(null);
        this.loadCitas();
      },
    });
  }

  openInasistencia(cita: CitaResponse): void {
    this.inasistenciaObservacion = '';
    this.showInasistenciaForm.set({ citaId: cita.id });
  }

  registrarInasistencia(): void {
    const data = this.showInasistenciaForm();
    if (!data) return;
    const req: InasistenciaRequest = { observacion: this.inasistenciaObservacion };
    this.inasistenciaService.register(data.citaId, req).pipe(catchError(() => EMPTY)).subscribe({
      next: () => {
        this.showInasistenciaForm.set(null);
        this.selectedCita.set(null);
        this.loadCitas();
      },
    });
  }
}
