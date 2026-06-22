import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MascotaService } from '../../../core/services/mascota.service';
import { AuthService } from '../../../core/services/auth.service';
import { DuenioService } from '../../../core/services/duenio.service';
import { CitaService } from '../../../core/services/cita.service';
import { MascotaResponse, MascotaRequest, SexoMascota } from '../../../core/models/mascota.model';
import { DuenioResponse } from '../../../core/models/duenio.model';
import { CitaResponse } from '../../../core/models/cita.model';
import { catchError, EMPTY } from 'rxjs';
import { obtenerConsejoDelDia, Consejo } from '../../../data/consejosDelDia';

type EspecieFilter = '' | 'CANINO' | 'FELINO' | 'EXOTICO';
type EstadoFilter = '' | 'SALUDABLE' | 'EN_TRATAMIENTO' | 'EN_OBSERVACION' | 'CRITICO' | 'URGENTE';

const ESTADOS = ['SALUDABLE', 'EN_TRATAMIENTO', 'EN_OBSERVACION', 'CRITICO'] as const;

const ESTADO_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  SALUDABLE: { bg: 'bg-secondary-container', text: 'text-on-secondary-container', dot: 'bg-secondary' },
  EN_TRATAMIENTO: { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed-variant', dot: 'bg-tertiary' },
  EN_OBSERVACION: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant', dot: 'bg-outline' },
  CRITICO: { bg: 'bg-error-container', text: 'text-on-error-container', dot: 'bg-error' },
};

@Component({
  selector: 'app-mascotas-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
  <div class="space-y-6 pb-8">
    @if (auth.isDuenioOnly()) {
      <!-- DUEÑO VIEW -->
      <div class="max-w-[1200px] mx-auto space-y-8">
        <!-- Header -->
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div class="space-y-1">
            <h1 class="text-headline-lg font-extrabold text-on-surface">Mis Mascotas</h1>
            <p class="text-body-lg text-on-surface-variant">Gestiona la salud y citas de tus mejores amigos.</p>
          </div>
        </header>

        <!-- Bento Content -->
        <div class="grid grid-cols-12 gap-6">
          <!-- Pets Grid -->
          <div class="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            @if (loading()) {
              <div class="col-span-2 flex items-center justify-center py-20">
                <div class="flex flex-col items-center gap-4">
                  <span class="loading loading-spinner loading-lg text-primary"></span>
                  <p class="text-body-sm text-on-surface-variant">Cargando mascotas...</p>
                </div>
              </div>
            } @else {
              @for (m of activeMascotas(); track m.id) {
                <div class="group relative bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-outline-variant/30">
                  <div class="h-48 overflow-hidden relative bg-primary-container/10 flex items-center justify-center">
                    @if (m.fotoUrl) {
                      <img [src]="m.fotoUrl" class="w-full h-full object-cover" />
                    } @else {
                      <span class="material-symbols-outlined text-8xl text-primary-container/30" style="font-variation-settings:'FILL' 1">pets</span>
                    }
                    <div class="absolute top-4 right-4 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1"
                         [ngClass]="cardStatus(m.id).bg">
                      <span class="w-2 h-2 rounded-full"
                           [class]="cardStatus(m.id).dot"></span>
                      <span class="text-label-sm font-label-sm">{{ cardStatus(m.id).label }}</span>
                    </div>
                  </div>
                  <div class="p-6 space-y-4">
                    <div>
                      <h3 class="text-headline-md font-bold text-on-surface">{{ m.nombre }}</h3>
                      <p class="text-body-md text-on-surface-variant">{{ especieLabel(m.especie) }} &bull; {{ m.raza }} &bull; {{ m.edadAnios }} {{ m.edadAnios === 1 ? 'a&ntilde;o' : 'a&ntilde;os' }}</p>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                      <div class="flex -space-x-2">
                        <a [routerLink]="['/vacunas']"
                           class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                          <span class="material-symbols-outlined text-[18px]">vaccines</span>
                        </a>
                        <a [routerLink]="['/controles-mensuales']"
                           class="w-8 h-8 rounded-full bg-tertiary-fixed-dim/30 flex items-center justify-center text-tertiary hover:bg-tertiary-fixed-dim/50 transition-colors">
                          <span class="material-symbols-outlined text-[18px]">monitor_heart</span>
                        </a>
                      </div>
                      <div class="flex items-center gap-2">
                        <a [routerLink]="['/mascotas', m.id]"
                           class="text-primary font-bold text-label-md hover:underline flex items-center gap-1">
                          Ver Ficha <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </a>
                        <button (click)="openEdit(m)"
                                class="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-colors"
                                title="Editar mascota">
                          <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button (click)="confirmDeleteMascota(m)"
                                class="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                                title="Eliminar mascota">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }
              <!-- Add Pet Card -->
              <div (click)="openCreate()" class="group relative border-2 border-dashed border-outline-variant rounded-3xl flex flex-col items-center justify-center p-8 space-y-4 hover:border-primary transition-colors cursor-pointer bg-surface/50">
                <div class="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[32px]">add_circle</span>
                </div>
                <div class="text-center">
                  <p class="text-headline-md font-bold text-on-surface">A&ntilde;adir Mascota</p>
                  <p class="text-body-sm text-on-surface-variant">&iquest;Tienes un nuevo integrante en la familia?</p>
                </div>
              </div>
            }
          </div>

          <!-- Side Widgets -->
          <div class="col-span-12 lg:col-span-4 space-y-6">
            <!-- Próximas Citas -->
            <section class="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-headline-md font-bold text-on-surface">Pr&oacute;ximas Citas</h2>
                <span class="material-symbols-outlined text-primary">event</span>
              </div>
              @if (nextAppointment(); as cita) {
                <div class="space-y-4">
                  <div class="flex gap-4 p-4 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10">
                    <div class="flex flex-col items-center justify-center bg-primary-fixed text-primary px-3 rounded-xl min-w-[60px]">
                      <span class="text-label-sm font-label-sm">{{ cita.fecha | date:'MMM' | uppercase }}</span>
                      <span class="text-headline-md font-bold">{{ cita.fecha | date:'d' }}</span>
                    </div>
                    <div class="flex-1">
                      <p class="text-label-md font-bold text-on-surface">{{ cita.motivo }}</p>
                      <p class="text-body-sm text-on-surface-variant">{{ cita.mascotaNombre }}</p>
                      <div class="flex items-center gap-1 mt-1 text-primary">
                        <span class="material-symbols-outlined text-[14px]">schedule</span>
                        <span class="text-label-sm font-label-sm">{{ cita.horaInicio | slice:0:5 }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center py-8 text-center">
                  <span class="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">event_busy</span>
                  <p class="text-body-sm text-on-surface-variant">No hay citas programadas</p>
                </div>
              }
              <a [routerLink]="['/citas']"
                 class="w-full mt-6 py-2 text-primary font-bold text-label-md border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center">
                Ver Calendario Completo
              </a>
            </section>

            <!-- Consejo del día -->
            <div class="bg-gradient-to-br from-primary to-primary-container p-6 rounded-3xl text-on-primary shadow-lg shadow-primary/30 relative overflow-hidden">
              <div class="relative z-10 flex flex-col justify-center min-h-[120px]">
                <h3 class="text-headline-md font-bold mb-3">Consejo del d&iacute;a</h3>
                <p class="text-body-md leading-relaxed opacity-90">{{ consejoDelDia.texto }}</p>
              </div>
              <div class="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div class="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>

          </div>
        </div>
      </div>
    } @else {
      <!-- ADMIN/VET/ASISTENTE VIEW -->
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 class="text-headline-lg font-extrabold text-on-surface">Gesti&oacute;n de Mascotas</h2>
          <p class="text-body-md text-on-surface-variant">Administra el historial y estado de salud de tus pacientes.</p>
        </div>
        @if (!auth.isDuenioOnly()) {
          <button (click)="openCreate()"
                  class="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-container transition-all active:scale-95">
            <span class="material-symbols-outlined">add</span>
            Registrar Mascota
          </button>
        }
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings:'FILL' 1">pets</span>
        </div>
        <div>
          <p class="text-on-surface-variant text-sm font-medium">Total Pacientes</p>
          <p class="text-2xl font-extrabold text-on-surface">{{ activeMascotas().length }}</p>
        </div>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings:'FILL' 1">medical_information</span>
        </div>
        <div>
          <p class="text-on-surface-variant text-sm font-medium">En Tratamiento</p>
          <p class="text-2xl font-extrabold text-on-surface">{{ kpiEnTratamiento() }}</p>
        </div>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-tertiary-container/10 text-tertiary flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings:'FILL' 1">vaccines</span>
        </div>
        <div>
          <p class="text-on-surface-variant text-sm font-medium">Vacunas Hoy</p>
          <p class="text-2xl font-extrabold text-on-surface">{{ kpiVacunasHoy() }}</p>
        </div>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings:'FILL' 1">emergency</span>
        </div>
        <div>
          <p class="text-on-surface-variant text-sm font-medium">Urgencias</p>
          <p class="text-2xl font-extrabold text-on-surface">{{ kpiUrgencias() }}</p>
        </div>
      </div>
    </div>

    <!-- Filters + Table Card -->
    <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-sm overflow-hidden">
      <!-- Filters Bar -->
      <div class="p-6 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-6">
        <div class="flex flex-wrap items-center gap-4 flex-1">
          <div class="flex flex-col min-w-[160px]">
            <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 ml-1">Especie</label>
            <select [ngModel]="especieFilter()" (ngModelChange)="especieFilter.set($event); currentPage.set(0)"
                    class="bg-surface-container-low border-none rounded-lg text-body-sm px-4 py-2.5 focus:ring-2 focus:ring-primary appearance-none cursor-pointer">
              <option value="">Todas</option>
              <option value="CANINO">Canino</option>
              <option value="FELINO">Felino</option>
              <option value="EXOTICO">Ex&oacute;tico</option>
            </select>
          </div>
          <div class="flex flex-col min-w-[200px]">
            <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 ml-1">Estado de Salud</label>
            <select [ngModel]="estadoFilter()" (ngModelChange)="estadoFilter.set($event); currentPage.set(0)"
                    class="bg-surface-container-low border-none rounded-lg text-body-sm px-4 py-2.5 focus:ring-2 focus:ring-primary appearance-none cursor-pointer">
              <option value="">Cualquier estado</option>
              <option value="SALUDABLE">Saludable</option>
              <option value="EN_TRATAMIENTO">En Tratamiento</option>
              <option value="EN_OBSERVACION">En Observaci&oacute;n</option>
              <option value="CRITICO">Cr&iacute;tico</option>
            </select>
          </div>
          <div class="flex flex-col flex-1 min-w-[240px]">
            <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 ml-1">B&uacute;squeda r&aacute;pida</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input type="text" placeholder="Nombre de mascota o due&ntilde;o..."
                     [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event); currentPage.set(0)"
                     class="w-full bg-surface-container-low border-none rounded-lg pl-9 pr-4 py-2.5 text-body-sm focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant/50" />
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 self-end pb-1">
          <button (click)="exportMascotas()" class="p-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors" title="Exportar">
            <span class="material-symbols-outlined">download</span>
          </button>
          <button (click)="showFiltros.set(!showFiltros())" class="p-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  [class.bg-primary-container]="showFiltros()" [class.text-primary]="showFiltros()" title="M&aacute;s filtros">
            <span class="material-symbols-outlined">tune</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-4">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="text-body-sm text-on-surface-variant">Cargando pacientes...</p>
          </div>
        </div>
      } @else if (filteredMascotas().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <span class="material-symbols-outlined text-6xl text-outline-variant" style="font-variation-settings:'FILL' 1">pets</span>
          <h3 class="mt-4 text-headline-md text-on-surface font-semibold">No hay mascotas</h3>
          <p class="mt-2 text-body-md text-on-surface-variant max-w-md">No se encontraron mascotas registradas.</p>
        </div>
      } @else {
        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr class="bg-surface-container-low/50 border-b border-outline-variant/20">
                <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Mascota</th>
                <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Especie / Raza</th>
                <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Edad / Peso</th>
                <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Due&ntilde;o</th>
                <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Estado</th>
                <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Pr&oacute;xima Cita</th>
                <th class="px-6 py-4 text-right pr-8"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              @for (m of paginatedMascotas(); track m.id) {
                <tr class="hover:bg-surface-container-low transition-colors duration-200 group">
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                        <span class="material-symbols-outlined text-[24px]">pets</span>
                      </div>
                      <div>
                        <p class="font-bold text-on-surface">{{ m.nombre }}</p>
                        <span class="text-[10px] font-bold text-primary bg-primary/5 px-1.5 rounded-md inline-block">#PET-{{ m.id.toString().padStart(4, '0') }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <p class="text-body-sm font-medium">{{ especieLabel(m.especie) }}</p>
                    <p class="text-xs text-on-surface-variant">{{ m.raza }}</p>
                  </td>
                  <td class="px-6 py-5">
                    <p class="text-body-sm font-medium">{{ m.edadAnios }} {{ m.edadAnios === 1 ? 'a&ntilde;o' : 'a&ntilde;os' }}</p>
                    <p class="text-xs text-on-surface-variant">{{ m.pesoKg ? m.pesoKg + ' kg' : '-' }}</p>
                  </td>
                  <td class="px-6 py-5">
                    <p class="text-body-sm font-medium">{{ m.duenioNombre }}</p>
                  </td>
                  <td class="px-6 py-5">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                          [ngClass]="[estadoStyle(m.estadoSalud).bg, estadoStyle(m.estadoSalud).text]">
                      <span class="w-1.5 h-1.5 rounded-full mr-2"
                            [class]="estadoStyle(m.estadoSalud).dot"></span>
                      {{ estadoLabel(m.estadoSalud) }}
                    </span>
                  </td>
                  <td class="px-6 py-5">
                    <p class="text-body-sm font-medium">{{ m.proximaCita || '-' }}</p>
                  </td>
                  <td class="px-6 py-5 text-right pr-8">
                    <div class="flex items-center gap-1 justify-end">
                      <a [routerLink]="['/mascotas', m.id]"
                         class="p-2 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all"
                         title="Ver Expediente">
                        <span class="material-symbols-outlined">description</span>
                      </a>
                      @if (!auth.isDuenioOnly()) {
                        <button (click)="openEdit(m)"
                                class="p-2 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all"
                                title="Editar">
                          <span class="material-symbols-outlined">edit_note</span>
                        </button>
                      }
                      <a [routerLink]="['/citas', m.id]"
                         class="p-2 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all"
                         title="Citas">
                        <span class="material-symbols-outlined">event</span>
                      </a>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="p-6 border-t border-outline-variant/20 flex items-center justify-between bg-surface-container-low/30">
          <p class="text-body-sm text-on-surface-variant font-medium">
            Mostrando <span class="text-on-surface font-bold">{{ paginatedMascotas().length }}</span> de <span class="text-on-surface font-bold">{{ filteredMascotas().length }}</span> mascotas
          </p>
          <div class="flex items-center gap-2">
            <button (click)="prevPage()" [disabled]="currentPage() === 0"
                    class="p-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-30">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            @for (p of pages(); track p) {
              <button (click)="goToPage(p)"
                      class="w-10 h-10 rounded-lg font-bold text-sm transition-colors"
                      [ngClass]="p === currentPage() ? 'bg-primary text-on-primary shadow-md' : 'hover:bg-surface-container-low text-on-surface-variant'">
                {{ p + 1 }}
              </button>
            }
            <button (click)="nextPage()" [disabled]="currentPage() >= totalPages() - 1"
                    class="p-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-30">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      }
    </div>
    }

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto" (click)="closeForm()">
        <div class="bg-surface-container-lowest rounded-[2rem] shadow-xl max-w-4xl w-full my-8 overflow-hidden" (click)="$event.stopPropagation()">
          <!-- Breadcrumbs -->
          <div class="flex items-center gap-2 px-8 pt-6 pb-2 text-on-surface-variant">
            <span class="font-label-sm text-label-sm cursor-pointer hover:text-primary">Pacientes</span>
            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            <span class="font-label-sm text-label-sm font-bold text-primary">{{ editingMascota() ? 'Editar Paciente' : 'Nueva Mascota' }}</span>
          </div>

          <!-- Main Form Card -->
          <div class="flex flex-col md:flex-row">
            <!-- Left: Photo Upload -->
            <div class="w-full md:w-1/3 bg-surface-container-low p-8 flex flex-col items-center justify-center gap-6 border-b md:border-b-0 md:border-r border-outline-variant/30">
              <div class="relative group">
                <label class="cursor-pointer">
                  <input type="file" accept="image/*" (change)="onFotoSelected($event)" class="hidden" />
                  <div class="w-48 h-48 rounded-[2.5rem] bg-surface-container flex items-center justify-center border-4 border-white shadow-xl overflow-hidden relative">
                    @if (fotoPreview()) {
                      <img [src]="fotoPreview()" class="w-full h-full object-cover" />
                    } @else {
                      <div class="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                        <span class="material-symbols-outlined text-4xl text-primary mb-2">add_a_photo</span>
                        <p class="font-label-sm text-label-sm text-primary">Subir foto</p>
                      </div>
                    }
                  </div>
                </label>
              </div>
              <div class="text-center">
                <h3 class="text-headline-md font-bold text-on-surface mb-1">Imagen de Perfil</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[200px]">Recomendado: JPG o PNG, min. 400x400px.</p>
              </div>
              @if (fotoPreview()) {
                <button type="button" (click)="removeFoto()"
                        class="text-label-sm text-error hover:underline">Eliminar foto</button>
              }
              <div class="w-full bg-white/50 p-4 rounded-2xl border border-outline-variant/20 mt-4">
                <div class="flex items-center gap-3 text-secondary">
                  <span class="material-symbols-outlined">verified</span>
                  <span class="font-label-md text-label-md">Ficha Cl&iacute;nica Nueva</span>
                </div>
              </div>
            </div>

            <!-- Right: Form -->
            <div class="flex-1 p-8 lg:p-10">
              <div class="mb-8">
                <h2 class="text-headline-lg font-bold text-on-surface mb-2">Detalles de la Mascota</h2>
                <p class="text-body-md text-on-surface-variant">Completa la informaci&oacute;n b&aacute;sica para dar de alta al nuevo paciente.</p>
              </div>

              <form [formGroup]="mascotaForm" (ngSubmit)="onSubmit()" class="space-y-6">
                <!-- Name -->
                <div class="space-y-2">
                  <label class="font-label-md text-label-md text-on-surface ml-1">Nombre de la mascota</label>
                  <input type="text" formControlName="nombre" placeholder="Ej: Max, Luna..."
                         class="w-full h-12 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md" />
                  @if (mascotaForm.get('nombre')?.invalid && (mascotaForm.get('nombre')?.dirty || submitted)) {
                    <p class="text-label-sm text-error ml-1">El nombre es obligatorio</p>
                  }
                </div>

                @if (!auth.isDuenioOnly()) {
                  <div class="space-y-2">
                    <label class="font-label-md text-label-md text-on-surface ml-1">Due&ntilde;o</label>
                    <select formControlName="duenioId"
                            class="w-full h-12 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md bg-surface-container-lowest">
                      <option value="">Seleccione un due&ntilde;o</option>
                      @for (d of duenios(); track d.id) {
                        <option [value]="d.id">{{ d.nombres }} {{ d.apellidos }}</option>
                      }
                    </select>
                    @if (mascotaForm.get('duenioId')?.invalid && (mascotaForm.get('duenioId')?.dirty || submitted)) {
                      <p class="text-label-sm text-error ml-1">Seleccione un due&ntilde;o</p>
                    }
                  </div>
                }

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Especie -->
                  <div class="space-y-2">
                    <label class="font-label-md text-label-md text-on-surface ml-1">Especie</label>
                    <select formControlName="especie"
                            class="w-full h-12 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md bg-surface-container-lowest">
                      <option value="">Seleccionar</option>
                      <option value="CANINO">Perro</option>
                      <option value="FELINO">Gato</option>
                      <option value="EXOTICO">Otro</option>
                    </select>
                    @if (mascotaForm.get('especie')?.invalid && (mascotaForm.get('especie')?.dirty || submitted)) {
                      <p class="text-label-sm text-error ml-1">Seleccione una especie</p>
                    }
                  </div>
                  <!-- Raza -->
                  <div class="space-y-2">
                    <label class="font-label-md text-label-md text-on-surface ml-1">Raza</label>
                    <input type="text" formControlName="raza" placeholder="Ej: Golden Retriever"
                           class="w-full h-12 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md" />
                    @if (mascotaForm.get('raza')?.invalid && (mascotaForm.get('raza')?.dirty || submitted)) {
                      <p class="text-label-sm text-error ml-1">La raza es obligatoria</p>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Fecha de Nacimiento -->
                  <div class="space-y-2">
                    <label class="font-label-md text-label-md text-on-surface ml-1">Fecha de nacimiento</label>
                    <div class="relative">
                      <input type="date" formControlName="fechaNacimiento"
                             class="w-full h-12 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md" />
                      <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">calendar_today</span>
                    </div>
                    @if (mascotaForm.get('fechaNacimiento')?.invalid && (mascotaForm.get('fechaNacimiento')?.dirty || submitted)) {
                      <p class="text-label-sm text-error ml-1">La fecha de nacimiento es obligatoria</p>
                    }
                  </div>
                  <!-- Sexo -->
                  <div class="space-y-2">
                    <label class="font-label-md text-label-md text-on-surface ml-1">Sexo</label>
                    <div class="flex gap-4">
                      <label class="flex-1 cursor-pointer group">
                        <input type="radio" formControlName="sexo" value="MACHO" class="hidden peer" />
                        <div class="h-12 flex items-center justify-center border border-outline-variant rounded-xl peer-checked:bg-primary-container peer-checked:border-primary peer-checked:text-on-primary-container transition-all gap-2 group-hover:bg-surface-container">
                          <span class="material-symbols-outlined">male</span>
                          <span class="font-label-md text-label-md">Macho</span>
                        </div>
                      </label>
                      <label class="flex-1 cursor-pointer group">
                        <input type="radio" formControlName="sexo" value="HEMBRA" class="hidden peer" />
                        <div class="h-12 flex items-center justify-center border border-outline-variant rounded-xl peer-checked:bg-primary-container peer-checked:border-primary peer-checked:text-on-primary-container transition-all gap-2 group-hover:bg-surface-container">
                          <span class="material-symbols-outlined">female</span>
                          <span class="font-label-md text-label-md">Hembra</span>
                        </div>
                      </label>
                    </div>
                    @if (mascotaForm.get('sexo')?.invalid && (mascotaForm.get('sexo')?.dirty || submitted)) {
                      <p class="text-label-sm text-error ml-1">Seleccione el sexo</p>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Peso -->
                  <div class="space-y-2">
                    <label class="font-label-md text-label-md text-on-surface ml-1">Peso actual (kg)</label>
                    <div class="relative">
                      <input type="number" formControlName="pesoKg" placeholder="0.0" step="0.1"
                             class="w-full h-12 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md" />
                      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-label-md">kg</span>
                    </div>
                  </div>
                  <!-- Color -->
                  <div class="space-y-2">
                    <label class="font-label-md text-label-md text-on-surface ml-1">Color / Marcas</label>
                    <input type="text" formControlName="color" placeholder="Ej: Blanco con manchas"
                           class="w-full h-12 px-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md" />
                  </div>
                </div>

                <!-- Notas -->
                <div class="space-y-2">
                  <label class="font-label-md text-label-md text-on-surface ml-1">Notas adicionales (opcional)</label>
                  <textarea formControlName="observaciones" rows="3" placeholder="Alergias, comportamiento, etc..."
                            class="w-full p-4 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md text-body-md resize-none"></textarea>
                </div>

                <!-- Error message -->
                @if (submitError()) {
                  <div class="p-4 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-3">
                    <span class="material-symbols-outlined text-error">error</span>
                    <p class="text-label-sm text-error font-semibold">{{ submitError() }}</p>
                  </div>
                }
                @if (submitted && mascotaForm.invalid) {
                  <div class="p-4 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-3">
                    <span class="material-symbols-outlined text-error">error</span>
                    <p class="text-label-sm text-error font-semibold">Completa todos los campos obligatorios</p>
                  </div>
                }

                <!-- Footer -->
                <div class="pt-8 flex flex-col sm:flex-row gap-4 items-center justify-end border-t border-outline-variant/20">
                  <button type="button" (click)="closeForm()"
                          class="w-full sm:w-auto px-8 py-3 rounded-xl border border-outline-variant font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high active:scale-95 transition-all">
                    Cancelar
                  </button>
                  <button type="submit" [disabled]="saving()"
                          class="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    @if (saving()) {
                      <span class="loading loading-spinner"></span>
                    }
                    <span class="material-symbols-outlined">save</span>
                    {{ editingMascota() ? 'Guardar Cambios' : 'Guardar Mascota' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Help Tip -->
          <div class="mx-8 mb-8 flex items-start gap-4 p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <span class="material-symbols-outlined text-primary">info</span>
            <div>
              <p class="font-label-md text-label-md text-on-surface mb-1">Informaci&oacute;n de Seguridad</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Todos los datos introducidos se almacenan de forma segura cumpliendo con la normativa de protecci&oacute;n de datos cl&iacute;nicos. Podr&aacute;s editar esta informaci&oacute;n m&aacute;s adelante en el perfil del paciente.</p>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirm Dialog -->
    @if (deletingMascota(); as m) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="deletingMascota.set(null)">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-headline-md font-bold text-on-surface">Eliminar Mascota</h3>
            <button (click)="deletingMascota.set(null)" class="p-1 rounded-full hover:bg-surface-container-high transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <p class="text-body-md text-on-surface-variant mb-6">&iquest;Est&aacute;s seguro de eliminar a <strong>{{ m.nombre }}</strong>? Esta acci&oacute;n no se puede deshacer.</p>
          <div class="flex justify-end gap-3">
            <button (click)="deletingMascota.set(null)"
                    class="px-5 py-2.5 rounded-xl border border-outline-variant font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-all">
              Cancelar
            </button>
            <button (click)="deleteMascota()"
                    class="px-5 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md hover:opacity-90 transition-all">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    }
  </div>
  `
})
export class MascotasListComponent implements OnInit {
  protected cardStatus(id: number): { bg: string; dot: string; label: string } {
    const statuses = [
      { bg: 'bg-secondary-container/90', dot: 'bg-secondary', label: 'Saludable' },
      { bg: 'bg-tertiary-fixed/90', dot: 'bg-tertiary', label: 'En tratamiento' },
      { bg: 'bg-error-container/90', dot: 'bg-error', label: 'Crítico' },
    ];
    return statuses[id % statuses.length];
  }
  private mascotaService = inject(MascotaService);
  private duenioService = inject(DuenioService);
  private citaService = inject(CitaService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  protected allMascotas = signal<MascotaResponse[]>([]);
  nextAppointment = signal<CitaResponse | null>(null);
  activeMascotas = computed(() => {
    const all = this.allMascotas();
    const active = all.filter(p => p.active);
    console.log('activeMascotas', { total: all.length, active: active.length });
    return active;
  });
  loading = signal(true);
  consejoDelDia: Consejo = obtenerConsejoDelDia();
  searchTerm = signal('');
  especieFilter = signal<EspecieFilter>('');
  estadoFilter = signal<EstadoFilter>('');
  duenios = signal<DuenioResponse[]>([]);
  duenioActual = signal<DuenioResponse | null>(null);

  showForm = signal(false);
  showFiltros = signal(false);
  editingMascota = signal<MascotaResponse | null>(null);
  saving = signal(false);
  submitted = false;
  submitError = signal('');
  fotoPreview = signal<string | null>(null);
  deletingMascota = signal<MascotaResponse | null>(null);

  currentPage = signal(0);
  pageSize = 10;

  mascotaForm = this.fb.group({
    duenioId: [0, Validators.required],
    nombre: ['', Validators.required],
    especie: ['', Validators.required],
    raza: ['', Validators.required],
    sexo: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
    color: [''],
    pesoKg: [null as number | null],
    observaciones: [''],
  });

  filteredMascotas = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const especie = this.especieFilter();
    const estado = this.estadoFilter();

    let list = this.allMascotas().filter(p => p.active);

    if (term) {
      list = list.filter(m =>
        m.nombre.toLowerCase().includes(term) ||
        m.raza.toLowerCase().includes(term) ||
        m.duenioNombreCompleto.toLowerCase().includes(term)
      );
    }

    if (especie) {
      list = list.filter(m => m.especie.toLowerCase() === especie.toLowerCase());
    }

    const mapped = list.map((m, i) => ({
      id: m.id,
      nombre: m.nombre,
      especie: m.especie,
      raza: m.raza,
      edadAnios: m.edadAnios,
      pesoKg: m.pesoKg,
      duenioNombre: m.duenioNombreCompleto,
      estadoSalud: m.estado || 'PENDIENTE',
      proximaCita: '',
      active: m.active,
    }));

    if (estado) {
      return mapped.filter(m => m.estadoSalud === estado);
    }

    return mapped;
  });

  paginatedMascotas = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.filteredMascotas().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredMascotas().length / this.pageSize)));

  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxVisible = 5;
    if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i);

    let start = Math.max(0, current - Math.floor(maxVisible / 2));
    let end = start + maxVisible;
    if (end > total) { end = total; start = Math.max(0, end - maxVisible); }
    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  kpiEnTratamiento = computed(() => Math.floor(this.activeMascotas().length * 0.15));
  kpiVacunasHoy = computed(() => Math.max(3, Math.floor(this.activeMascotas().length * 0.02)));
  kpiUrgencias = computed(() => Math.max(0, Math.floor(this.activeMascotas().length * 0.05)));

  ngOnInit(): void {
    if (this.auth.isDuenioOnly()) {
      this.duenioService.findOwn().pipe(catchError(() => EMPTY)).subscribe({
        next: (d) => this.duenioActual.set(d),
      });
      this.loadNextAppointment();
    } else {
      this.loadDuenios();
    }
    this.loadMascotas();
  }

  private loadMascotas(): void {
    this.loading.set(true);
    this.mascotaService.findAll(undefined, undefined, true).subscribe({
      next: (data) => {
        console.log('mascotas loaded', data.length, data.map(m => ({ id: m.id, nombre: m.nombre, active: m.active })));
        this.allMascotas.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('load mascotas error', err);
        this.loading.set(false);
      },
    });
  }

  private loadNextAppointment(): void {
    this.citaService.findAll().subscribe({
      next: (data) => {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = data
          .filter(c => c.fecha >= today && c.estado !== 'CANCELADA' && c.estado !== 'ATENDIDA' && c.estado !== 'NO_ASISTIO')
          .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));
        this.nextAppointment.set(upcoming.length > 0 ? upcoming[0] : null);
      },
    });
  }

  private loadDuenios(): void {
    this.duenioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.duenios.set(data),
    });
  }

  especieLabel(especie: string): string {
    const map: Record<string, string> = { CANINO: 'Canino', FELINO: 'Felino', EXOTICO: 'Exótico' };
    return map[especie] || especie;
  }

  exportMascotas(): void {
    const data = this.filteredMascotas();
    if (data.length === 0) return;
    const BOM = '\uFEFF';
    const rows = [
      ['Nombre', 'Especie', 'Raza', 'Edad', 'Peso', 'Dueño', 'Estado'],
      ...data.map(m => [
        m.nombre, this.especieLabel(m.especie), m.raza,
        m.edadAnios + (m.edadAnios === 1 ? ' año' : ' años'),
        m.pesoKg ? m.pesoKg + ' kg' : '-',
        m.duenioNombre, this.estadoLabel(m.estadoSalud),
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mascotas.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      SALUDABLE: 'Saludable', EN_TRATAMIENTO: 'En Tratamiento',
      EN_OBSERVACION: 'En Observación', CRITICO: 'Crítico',
    };
    return map[estado] || estado;
  }

  estadoStyle(estado: string) {
    return ESTADO_STYLES[estado] || ESTADO_STYLES.SALUDABLE;
  }

  prevPage(): void {
    if (this.currentPage() > 0) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) this.currentPage.update(p => p + 1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  onFotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      this.submitError.set('La imagen es demasiado grande. Máximo 100MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const MAX = 1000;
            let w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
              const ratio = Math.min(MAX / w, MAX / h);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { this.fotoPreview.set(reader.result as string); return; }
            ctx.drawImage(img, 0, 0, w, h);
            this.fotoPreview.set(canvas.toDataURL('image/jpeg', 0.7));
          } catch (e) {
            this.fotoPreview.set(reader.result as string);
          }
        };
        img.onerror = () => this.fotoPreview.set(reader.result as string);
        img.src = reader.result as string;
      } catch (e) {
        this.fotoPreview.set(reader.result as string);
      }
    };
    reader.onerror = () => this.submitError.set('Error al leer la imagen.');
    reader.readAsDataURL(file);
  }

  removeFoto(): void {
    this.fotoPreview.set(null);
  }

  confirmDeleteMascota(m: MascotaResponse): void {
    console.log('confirmDeleteMascota', m.id, m.nombre);
    this.deletingMascota.set(m);
  }

  deleteMascota(): void {
    const m = this.deletingMascota();
    console.log('deleteMascota', m);
    if (!m) return;
    this.mascotaService.deactivate(m.id).subscribe({
      next: () => {
        console.log('deactivate success');
        this.deletingMascota.set(null);
        this.loadMascotas();
      },
      error: (err) => {
        console.error('deactivate error', err);
        this.deletingMascota.set(null);
      },
    });
  }

  openCreate(): void {
    this.editingMascota.set(null);
    this.mascotaForm.reset({ duenioId: 0, nombre: '', especie: '', raza: '', sexo: '', fechaNacimiento: '', color: '', pesoKg: null, observaciones: '' });
    this.fotoPreview.set(null);
    this.submitted = false;
    this.submitError.set('');
    if (this.auth.isDuenioOnly()) {
      const d = this.duenioActual();
      if (d) {
        this.mascotaForm.patchValue({ duenioId: d.id });
      } else {
        this.duenioService.findOwn().pipe(catchError(() => EMPTY)).subscribe({
          next: (duenio) => {
            this.duenioActual.set(duenio);
            this.mascotaForm.patchValue({ duenioId: duenio.id });
          },
        });
      }
    }
    this.showForm.set(true);
  }

  openEdit(m: { id: number }): void {
    const original = this.allMascotas().find(p => p.id === m.id);
    if (!original) return;
    this.editingMascota.set(original);
    this.fotoPreview.set(original.fotoUrl ?? null);
    this.mascotaForm.patchValue({
      duenioId: original.duenioId,
      nombre: original.nombre,
      especie: original.especie,
      raza: original.raza,
      sexo: original.sexo,
      fechaNacimiento: original.fechaNacimiento,
      color: original.color ?? '',
      pesoKg: original.pesoKg,
      observaciones: original.observaciones ?? '',
    });
    this.submitted = false;
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingMascota.set(null);
    this.submitted = false;
    this.submitError.set('');
    this.fotoPreview.set(null);
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.mascotaForm.invalid) return;

    this.saving.set(true);
    const v = this.mascotaForm.value;
    const req: MascotaRequest = {
      duenioId: v.duenioId!,
      nombre: v.nombre!,
      especie: v.especie!,
      raza: v.raza!,
      sexo: v.sexo! as SexoMascota,
      fechaNacimiento: v.fechaNacimiento!,
      color: v.color || undefined,
      pesoKg: v.pesoKg ?? undefined,
      observaciones: v.observaciones || undefined,
      fotoUrl: this.fotoPreview() ?? undefined,
    };

    const obs = this.editingMascota()
      ? this.mascotaService.update(this.editingMascota()!.id, req)
      : this.mascotaService.create(req);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadMascotas();
      },
      error: (err) => {
        this.saving.set(false);
        let msg = 'Error al guardar la mascota. Intenta de nuevo.';
        if (err.error) {
          if (typeof err.error === 'string') msg = err.error;
          else if (err.error.message) msg = err.error.message;
        }
        this.submitError.set(msg);
        console.error('Error al guardar mascota:', err);
      },
    });
  }
}
