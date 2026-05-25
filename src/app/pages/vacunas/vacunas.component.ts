import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { VacunaService } from '../../core/services/vacuna.service';
import { AuthService } from '../../core/services/auth.service';
import { MascotaService } from '../../core/services/mascota.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { VacunaResponse, VacunaRequest, VacunaMascotaResponse, VacunaMascotaRequest } from '../../core/models/vacuna.model';
import { MascotaResponse } from '../../core/models/mascota.model';
import { catchError, EMPTY, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-vacunas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ConfirmDialogComponent,
    LoadingSpinnerComponent,
  ],
  styles: [`
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `],
  template: `
  <div class="flex flex-col gap-6 pb-8">

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Gesti&oacute;n de Vacunas</h2>
        <p class="text-body-md text-on-surface-variant mt-1">Control de inmunizaci&oacute;n, refuerzos y calendario cl&iacute;nico preventivo.</p>
      </div>
      <div class="flex items-center gap-3">
        @if (auth.isAdmin()) {
          <button (click)="openCatalogForm()"
                  class="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-all font-label-md text-label-md text-on-surface-variant">
            <span class="material-symbols-outlined">vaccines</span>
            Cat&aacute;logo
          </button>
        }
        @if (!auth.isDuenioOnly()) {
          <button (click)="openAppForm()"
                  class="bg-primary hover:bg-primary-container text-white px-6 py-2.5 rounded-xl font-label-md text-label-md flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined">add_circle</span>
            Registrar Aplicaci&oacute;n
          </button>
        }
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-primary-container/10 text-primary rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined">vaccines</span>
          </div>
          <span class="text-secondary font-label-sm">+12% vs mes ant.</span>
        </div>
        <p class="font-label-md text-label-md text-on-surface-variant">Aplicadas (Mes)</p>
        <h3 class="text-headline-lg font-bold text-on-surface mt-1">{{ kpiAplicadasMes() }}</h3>
      </div>
      <div class="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-tertiary-container/10 text-tertiary rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined">pending_actions</span>
          </div>
          <span class="text-tertiary font-label-sm">Urgente</span>
        </div>
        <p class="font-label-md text-label-md text-on-surface-variant">Pendientes (Hoy)</p>
        <h3 class="text-headline-lg font-bold text-on-surface mt-1">{{ kpiPendientesHoy() < 10 ? '0' + kpiPendientesHoy() : kpiPendientesHoy() }}</h3>
      </div>
      <div class="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-error-container/10 text-error rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined">notification_important</span>
          </div>
          <span class="text-error font-label-sm">Cr&iacute;tico</span>
        </div>
        <p class="font-label-md text-label-md text-on-surface-variant">Vencidas</p>
        <h3 class="text-headline-lg font-bold text-on-surface mt-1">{{ kpiVencidas() < 10 ? '0' + kpiVencidas() : kpiVencidas() }}</h3>
      </div>
      <div class="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-secondary-container/10 text-secondary rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined">verified_user</span>
          </div>
          <span class="text-secondary font-label-sm">Meta: 95%</span>
        </div>
        <p class="font-label-md text-label-md text-on-surface-variant">Inmunizaci&oacute;n Total</p>
        <h3 class="text-headline-lg font-bold text-on-surface mt-1">{{ kpiInmunizacion() }}%</h3>
      </div>
    </div>

    <!-- Main 12-col Grid -->
    <div class="grid grid-cols-12 gap-8">

      <!-- Table Section -->
      <div class="col-span-12 xl:col-span-9 space-y-6">

        <!-- Filters -->
        <div class="bg-surface p-4 rounded-2xl border border-outline-variant flex flex-wrap gap-4 items-center">
          <div class="flex-1 min-w-[200px]">
            <select [ngModel]="vacunaFilter()" (ngModelChange)="vacunaFilter.set($event)"
                    class="w-full bg-surface-container-low border-outline-variant rounded-lg py-2 px-3 text-body-sm font-body-sm focus:ring-primary">
              <option [ngValue]="null">Todas las Vacunas</option>
              @for (v of vacunasCatalog(); track v.id) {
                <option [ngValue]="v.id">{{ v.nombre }}</option>
              }
            </select>
          </div>
          <div class="flex-1 min-w-[200px]">
            <select [ngModel]="selectedMascota()" (ngModelChange)="selectMascota($event)"
                    class="w-full bg-surface-container-low border-outline-variant rounded-lg py-2 px-3 text-body-sm font-body-sm focus:ring-primary">
              <option [ngValue]="null">{{ auth.isDuenioOnly() ? 'Todas mis mascotas' : 'Todas las Mascotas' }}</option>
              @for (m of uniqueMascotas(); track m.id) {
                <option [ngValue]="m.id">{{ m.nombre }} @if (!auth.isDuenioOnly()) { <span>— {{ m.duenioNombreCompleto }}</span> }</option>
              }
            </select>
          </div>
        </div>

        <!-- Loading -->
        @if (loading()) {
          <app-loading-spinner message="Cargando historial de vacunas..." />
        } @else {
          <!-- Table -->
          <div class="bg-surface rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <div class="overflow-x-auto scrollbar-hide">
              <table class="w-full text-left border-collapse">
                <thead class="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Mascota</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Due&ntilde;o</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Vacuna</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Fecha Aplicaci&oacute;n</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Pr&oacute;xima Aplicaci&oacute;n</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Estado</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant">
                  @for (vac of paginatedVacunas(); track vac.id) {
                    <tr class="hover:bg-surface-container-low/50 transition-colors">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                            <span class="material-symbols-outlined text-[20px]">pets</span>
                          </div>
                          <div>
                            <p class="font-label-md text-label-md text-on-surface">{{ vac.mascotaNombre }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-body-sm font-body-sm text-on-surface">{{ getDuenioNombre(vac.mascotaId) }}</td>
                      <td class="px-6 py-4">
                        <p class="font-label-md text-label-md text-on-surface">{{ vac.vacunaNombre }}</p>
                      </td>
                      <td class="px-6 py-4 text-body-sm font-body-sm text-on-surface">{{ vac.fechaAplicacion || '--' }}</td>
                      <td class="px-6 py-4">
                        @if (vac.fechaProximaDosis) {
                          <div class="flex items-center gap-2"
                               [class.text-tertiary]="vac.estadoAlerta === 'PROXIMA'"
                               [class.text-error]="vac.estadoAlerta === 'VENCIDA'"
                               [class.text-on-surface]="vac.estadoAlerta === 'SIN_PROXIMA_DOSIS'">
                            @if (vac.estadoAlerta === 'PROXIMA') {
                              <span class="material-symbols-outlined text-[18px]">event_upcoming</span>
                            }
                            @if (vac.estadoAlerta === 'VENCIDA') {
                              <span class="material-symbols-outlined text-[18px]">warning</span>
                            }
                            <span class="text-body-sm font-body-sm">{{ vac.fechaProximaDosis }}</span>
                          </div>
                        } @else {
                          <span class="text-body-sm text-on-surface-variant">N/A</span>
                        }
                      </td>
                      <td class="px-6 py-4">
                        <span class="px-3 py-1 rounded-full font-label-sm text-label-sm"
                              [ngClass]="{
                                'bg-secondary-container text-on-secondary-container': vac.estadoAlerta === 'SIN_PROXIMA_DOSIS',
                                'bg-tertiary-container text-on-tertiary-container': vac.estadoAlerta === 'PROXIMA',
                                'bg-error-container text-on-error-container': vac.estadoAlerta === 'VENCIDA',
                                'bg-primary-container/60 text-primary': vac.estadoAlerta === 'PROGRAMADA'
                              }">
                          {{ alertaLabel(vac.estadoAlerta) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button class="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
                                  title="Editar">
                            <span class="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button class="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
                                  title="Certificado">
                            <span class="material-symbols-outlined text-[20px]">card_membership</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="px-6 py-12 text-center text-body-sm text-on-surface-variant">
                        No hay vacunas registradas para {{ auth.isDuenioOnly() ? 'sus mascotas' : 'esta mascota' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            <div class="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between">
              <span class="font-body-sm text-body-sm text-on-surface-variant">
                Mostrando {{ (currentPage() * pageSize) + 1 }}-{{ Math.min((currentPage() + 1) * pageSize, filteredVacunas().length) }} de {{ filteredVacunas().length }} resultados
              </span>
              <div class="flex gap-2">
                <button (click)="prevPage()" [disabled]="currentPage() === 0"
                        class="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-low font-label-md text-label-md transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Anterior
                </button>
                @for (p of pageNumbers(); track p) {
                  <button (click)="goToPage(p)"
                          class="px-4 py-2 border border-outline-variant rounded-lg font-label-md text-label-md transition-all"
                          [class.bg-primary-container]="p === currentPage()"
                          [class.text-on-primary-container]="p === currentPage()"
                          [class.hover:bg-surface-container-low]="p !== currentPage()">
                    {{ p + 1 }}
                  </button>
                }
                <button (click)="nextPage()" [disabled]="(currentPage() + 1) * pageSize >= filteredVacunas().length"
                        class="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-low font-label-md text-label-md transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Alertas Sidebar -->
      <aside class="col-span-12 xl:col-span-3">
        <div class="bg-surface rounded-2xl border border-outline-variant p-6 sticky top-24 shadow-sm">
          <div class="flex items-center gap-2 mb-6">
            <span class="material-symbols-outlined text-tertiary">notifications_active</span>
            <h4 class="text-headline-md text-[20px] font-bold text-on-surface">Pr&oacute;ximos Refuerzos</h4>
          </div>
          @if (alertas().length === 0) {
            <div class="flex flex-col items-center justify-center py-8 text-center">
              <span class="material-symbols-outlined text-4xl text-secondary/40">check_circle</span>
              <p class="text-body-sm text-on-surface-variant mt-2">No hay alertas pendientes</p>
            </div>
          } @else {
            <div class="space-y-4">
              @for (a of alertas(); track a.id) {
                <div class="p-4 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary/40 transition-all cursor-pointer">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <span class="material-symbols-outlined text-[18px]">pets</span>
                    </div>
                    <div>
                      <p class="font-label-md text-label-md text-on-surface">{{ a.mascotaNombre }}</p>
                      <p class="font-label-sm text-label-sm text-on-surface-variant">{{ a.vacunaNombre }}</p>
                    </div>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="font-body-sm text-body-sm text-on-surface">
                      @if (a.fechaProximaDosis) {
                        {{ a.fechaProximaDosis }}
                      } @else {
                        Sin fecha
                      }
                    </span>
                    <span class="font-label-sm text-label-sm px-2 py-0.5 rounded"
                          [ngClass]="{
                            'bg-tertiary-container/20 text-tertiary': a.estadoAlerta === 'PROXIMA',
                            'bg-error-container/20 text-error': a.estadoAlerta === 'VENCIDA'
                          }">
                      {{ alertaLabel(a.estadoAlerta) }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </aside>

    </div>

    <!-- Catalog Form Modal -->
    @if (showCatalogForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeCatalogForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-lg w-full" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">
              {{ editingCatalog() ? 'Editar Vacuna' : 'Nueva Vacuna' }}
            </h3>
            <button (click)="closeCatalogForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <form [formGroup]="catalogForm" (ngSubmit)="onCatalogSubmit()" class="p-6 space-y-5">
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Nombre</label>
              <input type="text" formControlName="nombre" placeholder="Ej: Rabia"
                     class="input input-bordered w-full" />
              @if (catalogForm.get('nombre')?.invalid && catalogSubmitted) {
                <p class="text-label-sm text-error">El nombre es obligatorio</p>
              }
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Descripci&oacute;n</label>
              <textarea formControlName="descripcion" rows="3" placeholder="Descripci&oacute;n de la vacuna"
                        class="textarea textarea-bordered w-full"></textarea>
              @if (catalogForm.get('descripcion')?.invalid && catalogSubmitted) {
                <p class="text-label-sm text-error">La descripci&oacute;n es obligatoria</p>
              }
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Intervalo Pr&oacute;xima Dosis (d&iacute;as, opcional)</label>
              <input type="number" formControlName="intervaloProximaDosisDias" min="1" placeholder="Ej: 30"
                     class="input input-bordered w-full" />
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="closeCatalogForm()" class="btn btn-ghost">Cancelar</button>
              <button type="submit" [disabled]="catalogSaving()"
                      class="btn btn-primary" [class.btn-disabled]="catalogSaving()">
                @if (catalogSaving()) {
                  <span class="loading loading-spinner"></span>
                }
                {{ editingCatalog() ? 'Guardar Cambios' : 'Crear Vacuna' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Application Form Modal -->
    @if (showAppForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeAppForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">Registrar Aplicaci&oacute;n</h3>
            <button (click)="closeAppForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <form [formGroup]="appForm" (ngSubmit)="onAppSubmit()" class="p-6 space-y-5">
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Mascota</label>
              <select formControlName="mascotaId"
                      class="select select-bordered w-full">
                <option [ngValue]="0">Seleccione...</option>
                @for (m of uniqueMascotas(); track m.id) {
                  <option [ngValue]="m.id">{{ m.nombre }} &mdash; {{ m.duenioNombreCompleto }}</option>
                }
              </select>
              @if (appSubmitted && !appForm.get('mascotaId')?.value) {
                <p class="text-label-sm text-error">Seleccione una mascota</p>
              }
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Vacuna</label>
              <select formControlName="vacunaId" class="select select-bordered w-full">
                <option [ngValue]="0">Seleccione...</option>
                @for (v of vacunasCatalog(); track v.id) {
                  <option [ngValue]="v.id">{{ v.nombre }}</option>
                }
              </select>
              @if (appForm.get('vacunaId')?.invalid && appSubmitted) {
                <p class="text-label-sm text-error">Seleccione una vacuna</p>
              }
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Fecha Aplicaci&oacute;n</label>
                <input type="date" formControlName="fechaAplicacion" class="input input-bordered w-full" />
                @if (appForm.get('fechaAplicacion')?.invalid && appSubmitted) {
                  <p class="text-label-sm text-error">La fecha es obligatoria</p>
                }
              </div>
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Pr&oacute;xima Dosis (opcional)</label>
                <input type="date" formControlName="fechaProximaDosis" class="input input-bordered w-full" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Lote (opcional)</label>
                <input type="text" formControlName="lote" placeholder="N&ordm; de lote" class="input input-bordered w-full" />
              </div>
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Observaciones (opcional)</label>
                <input type="text" formControlName="observaciones" placeholder="Observaciones" class="input input-bordered w-full" />
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="closeAppForm()" class="btn btn-ghost">Cancelar</button>
              <button type="submit" [disabled]="appSaving()"
                      class="btn btn-primary" [class.btn-disabled]="appSaving()">
                @if (appSaving()) {
                  <span class="loading loading-spinner"></span>
                }
                Registrar
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Confirm Delete Dialog -->
    <app-confirm-dialog [visible]="showDeleteConfirm()"
                        title="Desactivar Vacuna"
                        [message]="'¿Estás seguro de desactivar la vacuna ' + (deletingVacuna()?.nombre || '') + '?'"
                        confirmText="Desactivar"
                        cancelText="Cancelar"
                        (onConfirm)="deleteVacuna()"
                        (onCancel)="showDeleteConfirm.set(false)" />
  </div>
  `
})
export class VacunasComponent implements OnInit {
  private vacunaService = inject(VacunaService);
  private mascotaService = inject(MascotaService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  protected Math = Math;
  protected pageSize = 10;

  // Catalog
  vacunasCatalog = signal<VacunaResponse[]>([]);
  catalogLoading = signal(true);
  searchTerm = signal('');
  showCatalogForm = signal(false);
  editingCatalog = signal<VacunaResponse | null>(null);
  catalogSaving = signal(false);
  catalogSubmitted = false;
  showDeleteConfirm = signal(false);
  deletingVacuna = signal<VacunaResponse | null>(null);

  catalogForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    intervaloProximaDosisDias: [null as number | null],
  });

  // Application
  mascotas = signal<MascotaResponse[]>([]);
  uniqueMascotas = computed(() => {
    const seen = new Set<string>();
    return this.mascotas().filter(m => {
      if (!m.active) return false;
      const key = m.nombre.toLowerCase() + '-' + m.duenioId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  selectedMascota = signal<number | null>(null);
  mascotaVacunas = signal<VacunaMascotaResponse[]>([]);
  loading = signal(false);
  showAppForm = signal(false);
  appSaving = signal(false);
  appSubmitted = false;
  vacunaFilter = signal<number | null>(null);

  appForm = this.fb.group({
    mascotaId: [0],
    vacunaId: [0, Validators.required],
    fechaAplicacion: ['', Validators.required],
    fechaProximaDosis: [''],
    lote: [''],
    observaciones: [''],
  });

  // Alertas
  alertas = signal<VacunaMascotaResponse[]>([]);

  // Dueño: aggregated vacunas across all their pets
  allVacunas = signal<VacunaMascotaResponse[]>([]);

  // Computed
  filteredVacunas = computed(() => {
    let list = this.auth.isDuenioOnly()
      ? this.allVacunas()
      : this.mascotaVacunas();
    const vacFilter = this.vacunaFilter();
    if (vacFilter) {
      list = list.filter(v => v.vacunaId === vacFilter);
    }
    return list;
  });

  // Pagination
  currentPage = signal(0);

  paginatedVacunas = computed(() => {
    const list = this.filteredVacunas();
    const start = this.currentPage() * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredVacunas().length / this.pageSize)));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: Math.min(total, 5) }, (_, i) => i);
  });

  prevPage(): void {
    if (this.currentPage() > 0) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if ((this.currentPage() + 1) * this.pageSize < this.filteredVacunas().length) {
      this.currentPage.update(p => p + 1);
    }
  }

  goToPage(p: number): void {
    this.currentPage.set(p);
  }

  // KPIs
  kpiAplicadasMes = (): number => {
    const list = this.auth.isDuenioOnly() ? this.allVacunas() : this.mascotaVacunas();
    return list.length || 0;
  };
  kpiPendientesHoy = () => this.alertas().filter(a => a.estadoAlerta === 'PROXIMA').length || 0;
  kpiVencidas = () => this.alertas().filter(a => a.estadoAlerta === 'VENCIDA').length || 0;
  kpiInmunizacion = () => this.vacunasCatalog().length > 0 ? 89 : 0;

  ngOnInit(): void {
    this.loadCatalog();
    this.loadAlertas();
    if (this.auth.isDuenioOnly()) {
      this.loadMascotasForDuenio();
    } else {
      this.loadMascotas();
    }
  }

  private loadCatalog(): void {
    this.catalogLoading.set(true);
    this.vacunaService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.vacunasCatalog.set(data);
        this.catalogLoading.set(false);
      },
      error: () => this.catalogLoading.set(false),
    });
  }

  private loadMascotas(): void {
    this.mascotaService.findAll(undefined, undefined, true).subscribe({
      next: (data) => this.mascotas.set(data),
      error: () => {},
    });
  }

  private loadMascotasForDuenio(): void {
    this.loading.set(true);
    this.mascotaService.findAll(undefined, undefined, true).subscribe({
      next: (data) => {
        this.mascotas.set(data);
        if (data.length === 0) {
          this.loading.set(false);
          return;
        }
        const requests = data.map(m =>
          this.vacunaService.findByMascota(m.id).pipe(catchError(() => of([] as VacunaMascotaResponse[])))
        );
        forkJoin(requests).subscribe({
          next: (results) => {
            this.allVacunas.set(results.flat());
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAlertas(): void {
    this.vacunaService.findAlertas(30).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.alertas.set(data),
    });
  }

  getDuenioNombre(mascotaId: number): string {
    const m = this.mascotas().find(m => m.id === mascotaId);
    return m?.duenioNombreCompleto || '--';
  }

  alertaLabel(estado: string): string {
    const map: Record<string, string> = {
      SIN_PROXIMA_DOSIS: 'Aplicada',
      VENCIDA: 'Vencida',
      PROXIMA: 'Pendiente',
      PROGRAMADA: 'Programada',
    };
    return map[estado] || estado;
  }

  // Catalog CRUD
  openCatalogForm(): void {
    this.editingCatalog.set(null);
    this.catalogForm.reset({ nombre: '', descripcion: '', intervaloProximaDosisDias: null });
    this.catalogSubmitted = false;
    this.showCatalogForm.set(true);
  }

  openCatalogEdit(v: VacunaResponse): void {
    this.editingCatalog.set(v);
    this.catalogForm.patchValue({
      nombre: v.nombre,
      descripcion: v.descripcion,
      intervaloProximaDosisDias: v.intervaloProximaDosisDias,
    });
    this.catalogSubmitted = false;
    this.showCatalogForm.set(true);
  }

  closeCatalogForm(): void {
    this.showCatalogForm.set(false);
    this.editingCatalog.set(null);
    this.catalogSubmitted = false;
  }

  onCatalogSubmit(): void {
    this.catalogSubmitted = true;
    if (this.catalogForm.invalid) return;

    this.catalogSaving.set(true);
    const formValue = this.catalogForm.value;
    const req: VacunaRequest = {
      nombre: formValue.nombre!,
      descripcion: formValue.descripcion!,
      intervaloProximaDosisDias: formValue.intervaloProximaDosisDias ?? undefined,
    };

    const obs = this.editingCatalog()
      ? this.vacunaService.update(this.editingCatalog()!.id, req)
      : this.vacunaService.create(req);

    obs.pipe(catchError(() => EMPTY)).subscribe({
      next: () => {
        this.catalogSaving.set(false);
        this.closeCatalogForm();
        this.loadCatalog();
      },
      error: () => this.catalogSaving.set(false),
    });
  }

  confirmCatalogDelete(v: VacunaResponse): void {
    this.deletingVacuna.set(v);
    this.showDeleteConfirm.set(true);
  }

  deleteVacuna(): void {
    const id = this.deletingVacuna()?.id;
    if (!id) return;
    this.vacunaService.deactivate(id).subscribe({
      next: () => {
        this.showDeleteConfirm.set(false);
        this.deletingVacuna.set(null);
        this.loadCatalog();
      },
      error: () => this.showDeleteConfirm.set(false),
    });
  }

  activateVacuna(v: VacunaResponse): void {
    this.vacunaService.activate(v.id).pipe(catchError(() => EMPTY)).subscribe({
      next: () => this.loadCatalog(),
    });
  }

  // Application
  selectMascota(mascotaId: number | null): void {
    this.selectedMascota.set(mascotaId);
    this.vacunaFilter.set(null);
    this.currentPage.set(0);
    if (!mascotaId) {
      this.mascotaVacunas.set([]);
      return;
    }
    this.loading.set(true);
    this.vacunaService.findByMascota(mascotaId).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.mascotaVacunas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openAppForm(): void {
    this.appForm.reset({
      mascotaId: 0,
      vacunaId: 0,
      fechaAplicacion: '',
      fechaProximaDosis: '',
      lote: '',
      observaciones: '',
    });
    this.appSubmitted = false;
    this.showAppForm.set(true);
  }

  closeAppForm(): void {
    this.showAppForm.set(false);
    this.appSubmitted = false;
  }

  onAppSubmit(): void {
    this.appSubmitted = true;
    console.log('appForm values', this.appForm.value);
    console.log('appForm valid', this.appForm.valid);
    console.log('appForm errors', this.appForm.errors);
    if (this.appForm.invalid) { console.log('form invalid'); return; }

    const mascotaId = this.appForm.get('mascotaId')?.value;
    console.log('mascotaId', mascotaId);
    if (!mascotaId) { console.log('no mascotaId'); return; }

    this.appSaving.set(true);
    const fv = this.appForm.value;
    const req: VacunaMascotaRequest = {
      vacunaId: fv.vacunaId!,
      veterinarioId: 0,
      fechaAplicacion: fv.fechaAplicacion!,
      fechaProximaDosis: fv.fechaProximaDosis || undefined,
      lote: fv.lote || undefined,
      observaciones: fv.observaciones || undefined,
    };

    this.vacunaService.registerForMascota(mascotaId, req).subscribe({
      next: () => {
        this.appSaving.set(false);
        this.closeAppForm();
        this.selectMascota(mascotaId);
        this.loadAlertas();
      },
      error: () => this.appSaving.set(false),
    });
  }
}
