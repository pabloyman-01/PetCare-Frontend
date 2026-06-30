import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AsistenteService } from '../../core/services/asistente.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { AsistenteResponse, AsistenteRequest } from '../../core/models/asistente.model';
import { catchError, EMPTY } from 'rxjs';
import { PlanificadorSemanalComponent } from '../../shared/components/planificador-semanal/planificador-semanal.component';
import { HorarioSemanalService, HorarioSemanalResponse } from '../../core/services/horario-semanal.service';

type RolAsistente = 'Enfermeria' | 'Recepcion' | 'Apoyo';
type TurnoAsistente = 'morning' | 'afternoon' | 'night' | 'absent';

const ROL_LABELS: Record<RolAsistente, string> = {
  Enfermeria: 'Enfermería',
  Recepcion: 'Recepción',
  Apoyo: 'Apoyo',
};

const ROL_ICONS: Record<RolAsistente, string> = {
  Enfermeria: 'medical_services',
  Recepcion: 'desk',
  Apoyo: 'cleaning_services',
};

const ROL_BORDER: Record<RolAsistente, string> = {
  Enfermeria: 'border border-primary/20 bg-primary-container/10 text-primary',
  Recepcion: 'border border-tertiary/20 bg-tertiary-container/10 text-tertiary',
  Apoyo: 'border border-outline-variant bg-surface-variant text-on-surface-variant',
};

const TURNO_CONFIG: Record<TurnoAsistente, { dot: string; label: string }> = {
  morning: { dot: 'bg-secondary', label: 'Mañana (08:00 - 16:00)' },
  afternoon: { dot: 'bg-tertiary', label: 'Tarde (14:00 - 22:00)' },
  night: { dot: 'bg-primary', label: 'Noche (22:00 - 08:00)' },
  absent: { dot: 'bg-error', label: 'Descanso' },
};

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

@Component({
  selector: 'app-asistentes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    PlanificadorSemanalComponent,
  ],
  template: `
  <div class="space-y-6 pb-8">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Gesti&oacute;n de Asistentes</h2>
        <p class="text-body-md text-on-surface-variant mt-1">Administra tu equipo, turnos y rendimiento operativo.</p>
      </div>
      @if (auth.isAdmin()) {
        <button (click)="openCreate()"
                class="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95">
          <span class="material-symbols-outlined text-[20px]">person_add</span>
          A&ntilde;adir datos
        </button>
      }
    </div>

    <!-- KPIs Section -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm">
        <div class="flex justify-between items-start mb-4">
          <div class="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary bg-secondary-container/30 px-2 py-1 rounded-md">
            <span class="material-symbols-outlined text-[14px]">trending_up</span> 2%
          </span>
        </div>
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Personal Activo Hoy</p>
          <div class="flex items-baseline gap-2">
            <h3 class="text-display-lg text-display-lg text-on-surface">{{ activeToday() }}</h3>
            <span class="font-body-sm text-body-sm text-on-surface-variant">/ {{ asistentes().length }} Total</span>
          </div>
        </div>
      </div>
      <div class="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm">
        <div class="flex justify-between items-start mb-4">
          <div class="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
          <span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary bg-secondary-container/30 px-2 py-1 rounded-md">
            <span class="material-symbols-outlined text-[14px]">check</span> 94%
          </span>
        </div>
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Tareas Completadas</p>
          <div class="flex items-baseline gap-2">
            <h3 class="text-display-lg text-display-lg text-on-surface">{{ completedTasks() }}</h3>
            <span class="font-body-sm text-body-sm text-on-surface-variant">/ {{ completedTasksTotal() }} Asignadas</span>
          </div>
        </div>
      </div>
      <div class="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-container/10 rounded-full blur-2xl group-hover:bg-tertiary-container/20 transition-all pointer-events-none"></div>
        <div class="flex justify-between items-start mb-4 relative z-10">
          <div class="w-10 h-10 rounded-lg bg-tertiary-container/20 flex items-center justify-center text-tertiary">
            <span class="material-symbols-outlined">pace</span>
          </div>
          <span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-md">
            Promedio
          </span>
        </div>
        <div class="relative z-10">
          <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Tiempo Resp. Recepci&oacute;n</p>
          <div class="flex items-baseline gap-2">
            <h3 class="text-display-lg text-display-lg text-on-surface">{{ responseTime() }}</h3>
            <span class="font-body-sm text-body-sm text-on-surface-variant">minutos</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Table Section -->
      <div class="lg:col-span-8 flex flex-col gap-4">
        <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col h-full">
          <div class="p-5 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-bright">
            <h3 class="text-headline-md font-bold text-on-surface">Directorio de Colaboradores</h3>
            <div class="flex gap-2">
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">search</span>
                <input type="text" placeholder="Buscar..."
                       [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
                       class="bg-surface-container-low border-none rounded-lg py-2 pl-9 pr-4 font-label-sm text-label-sm text-on-surface focus:ring-2 focus:ring-primary w-44" />
              </div>
              <div class="relative">
                <select [ngModel]="rolFilter()" (ngModelChange)="rolFilter.set($event)"
                        class="appearance-none bg-surface-container-low border-none rounded-lg py-2 pl-4 pr-10 font-label-sm text-label-sm text-on-surface cursor-pointer focus:ring-2 focus:ring-primary">
                  <option value="">Todos los Roles</option>
                  <option value="Enfermeria">Enfermer&iacute;a</option>
                  <option value="Recepcion">Recepci&oacute;n</option>
                  <option value="Apoyo">Apoyo</option>
                </select>
                <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          @if (loading()) {
            <app-loading-spinner message="Cargando asistentes..." />
          } @else if (filteredAsistentes().length === 0) {
            <app-empty-state icon="group_off" title="No hay asistentes"
                             message="No se encontraron asistentes registrados." />
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr class="border-b border-outline-variant bg-surface-container-lowest">
                    <th class="py-3 px-5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Colaborador</th>
                    <th class="py-3 px-5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Rol</th>
                    <th class="py-3 px-5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Turno Actual</th>
                    <th class="py-3 px-5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Tareas</th>
                    <th class="py-3 px-5 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/50">
                  @for (a of filteredAsistentes(); track a.id) {
                    <tr class="hover:bg-surface-container-low/50 transition-colors group">
                      <td class="py-4 px-5">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full flex items-center justify-center text-label-md font-bold flex-shrink-0"
                               [style.background-color]="avatarColor(a.id)"
                               [style.color]="'white'">
                            {{ getInitials(a.nombres, a.apellidos) }}
                          </div>
                          <div>
                            <p class="font-label-md text-label-md text-on-surface font-semibold">{{ a.nombres }} {{ a.apellidos }}</p>
                            <p class="font-body-sm text-body-sm text-on-surface-variant">{{ a.email }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-4 px-5">
              <span class="inline-flex items-center gap-1.5 font-label-sm text-label-sm px-2.5 py-1 rounded-md"
                    [ngClass]="rolBorder(a.funciones)">
                <span class="material-symbols-outlined text-[14px]">{{ rolIcon(a.funciones) }}</span>
                {{ rolLabel(a.funciones) }}
                        </span>
                      </td>
                      <td class="py-4 px-5">
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full"
                               [class]="turnoDot(a.id)"></div>
                          <span class="font-body-sm text-body-sm text-on-surface">{{ turnoLabel(a.id) }}</span>
                        </div>
                      </td>
                      <td class="py-4 px-5">
                        <div class="flex flex-col gap-1 w-32">
                          <div class="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                            <span>{{ taskDone(a.id) }}/{{ taskTotal(a.id) }}</span>
                            <span [class.text-secondary]="taskProgress(a.id) >= 80"
                                  [class.text-tertiary]="taskProgress(a.id) < 80 && taskProgress(a.id) >= 50"
                                  [class.text-error]="taskProgress(a.id) < 50">{{ taskProgress(a.id) }}%</span>
                          </div>
                          <div class="w-full bg-surface-container-high rounded-full h-1.5">
                            <div class="h-1.5 rounded-full transition-all"
                                 [class.bg-secondary]="taskProgress(a.id) >= 80"
                                 [class.bg-tertiary]="taskProgress(a.id) < 80 && taskProgress(a.id) >= 50"
                                 [class.bg-error]="taskProgress(a.id) < 50"
                                 [style.width.%]="taskProgress(a.id)"></div>
                          </div>
                        </div>
                      </td>
                      <td class="py-4 px-5 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <button (click)="openEdit(a)"
                                  class="text-on-surface-variant hover:text-primary p-2 rounded-md hover:bg-surface-container-high transition-colors"
                                  title="Editar">
                            <span class="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          @if (auth.isAdmin()) {
                            @if (a.active) {
                              <button (click)="confirmDelete(a)"
                                      class="text-error hover:bg-error-container/20 p-2 rounded-md transition-colors"
                                      title="Desactivar">
                                <span class="material-symbols-outlined text-[20px]">person_remove</span>
                              </button>
                            } @else {
                              <button (click)="activateAsistente(a)"
                                      class="text-secondary hover:bg-secondary-container/20 p-2 rounded-md transition-colors"
                                      title="Activar">
                                <span class="material-symbols-outlined text-[20px]">person_add</span>
                              </button>
                            }
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="p-4 border-t border-outline-variant bg-surface-bright flex justify-center mt-auto">
              <button class="text-primary font-label-md text-label-md hover:underline">Ver todos ({{ asistentes().length }})</button>
            </div>
          }
        </div>
      </div>

      <!-- Staff Roster Widget -->
      <div class="lg:col-span-4 flex flex-col gap-4">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-50 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <span class="material-symbols-outlined text-white text-lg">group</span>
              </div>
              <div>
                <h3 class="font-bold text-gray-900">Personal de Hoy</h3>
                <p class="text-xs text-gray-400">{{ hoyLabel }}</p>
              </div>
            </div>
            <button (click)="showPlanificador.set(true)"
                    class="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">edit_calendar</span>
              Planificar
            </button>
          </div>

          <div class="divide-y divide-gray-50">
            @if (asistentes().length === 0) {
              <div class="p-8 text-center text-gray-400">
                <p class="text-sm">No hay asistentes registrados</p>
              </div>
            }
            @for (a of asistentes(); track a.id) {
              @let turno = turnoActual(a.id);
              <div class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm"
                     [style.background-color]="avatarColor(a.id)">
                  {{ getInitials(a.nombres, a.apellidos) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ a.nombres }} {{ a.apellidos }}</p>
                    @if (turno !== 'absent') {
                      <span class="w-1.5 h-1.5 rounded-full shrink-0"
                            [class.bg-green-500]="turno === 'morning'"
                            [class.bg-orange-500]="turno === 'afternoon'"
                            [class.bg-blue-500]="turno === 'night'"></span>
                    }
                  </div>
                  <p class="text-xs text-gray-400">{{ a.funciones || 'Asistente' }}</p>
                </div>
                <div class="text-right shrink-0">
                  @if (turno !== 'absent') {
                    <span class="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                          [class.bg-green-50]="turno === 'morning'"
                          [class.text-green-700]="turno === 'morning'"
                          [class.bg-orange-50]="turno === 'afternoon'"
                          [class.text-orange-700]="turno === 'afternoon'"
                          [class.bg-blue-50]="turno === 'night'"
                          [class.text-blue-700]="turno === 'night'">
                      {{ turnoConfig[turno].label.replace(' (','\n').split('\n')[0] }}
                    </span>
                  } @else {
                    <span class="text-xs text-gray-300 italic">—</span>
                  }
                </div>
              </div>
            }
          </div>

          <div class="p-3 border-t border-gray-50 bg-gray-50/30">
            <button (click)="showPlanificador.set(true)"
                    class="w-full py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-base">calendar_month</span>
              Gestionar Horario Semanal
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">
              {{ editingAsistente() ? 'Editar Asistente' : 'A&ntilde;adir datos' }}
            </h3>
            <button (click)="closeForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="asistenteForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
            <!-- Select Usuario -->
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Usuario</label>
              <select formControlName="usuarioId" class="input input-bordered w-full">
                <option value="">Seleccionar usuario asistente...</option>
                @for (u of usuariosDisponibles(); track u.id) {
                  <option [value]="u.id">{{ u.fullName }} ({{ u.email }})</option>
                }
              </select>
              @if (usuariosDisponibles().length === 0) {
                <p class="text-body-sm text-on-surface-variant mt-1">No hay usuarios asistentes disponibles. Cree uno en Usuarios primero.</p>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Tipo Documento</label>
                <select formControlName="tipoDocumento" class="select select-bordered w-full">
                  <option value="">Seleccione...</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">N&uacute;mero Documento</label>
                <input type="text" formControlName="numeroDocumento" placeholder="Ingrese n&uacute;mero"
                       class="input input-bordered w-full" />
              </div>
              <div class="space-y-1.5 sm:col-span-2">
                <label class="text-label-sm font-semibold text-on-surface-variant">Rol</label>
                <select formControlName="funciones" class="input input-bordered w-full">
                  <option value="">Seleccionar rol...</option>
                  <option value="Enfermeria">Enfermer&iacute;a</option>
                  <option value="Recepcion">Recepci&oacute;n</option>
                  <option value="Apoyo">Apoyo</option>
                </select>
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20 items-center">
              @if (errorMsg()) {
                <p class="text-body-sm text-error flex-1">{{ errorMsg() }}</p>
              }
              <button type="button" (click)="closeForm()" class="btn btn-ghost">Cancelar</button>
              <button type="submit" [disabled]="saving()" class="btn btn-primary">
                @if (saving()) {
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                }
                {{ editingAsistente() ? 'Guardar Cambios' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Confirm Delete Dialog -->
    <app-confirm-dialog [visible]="showDeleteConfirm()"
                        title="Desactivar Asistente"
                        [message]="'¿Estás seguro de desactivar a ' + (deletingAsistente()?.nombres || '') + '?'"
                        confirmText="Desactivar"
                        cancelText="Cancelar"
                        (onConfirm)="deleteAsistente()"
                         (onCancel)="showDeleteConfirm.set(false)" />
  </div>

  @if (showPlanificador()) {
    <app-planificador-semanal (onCerrar)="showPlanificador.set(false); recargarHorarios()" />
  }
  `
})
export class AsistentesComponent implements OnInit {
  private asistenteService = inject(AsistenteService);
  private usuarioService = inject(UsuarioService);
  private horarioService = inject(HorarioSemanalService);
  protected auth = inject(AuthService);
  protected turnoConfig = TURNO_CONFIG;
  private fb = inject(FormBuilder);

  asistentes = signal<AsistenteResponse[]>([]);
  usuariosDisponibles = signal<{ id: number; fullName: string; email: string }[]>([]);
  horariosSemanales = signal<HorarioSemanalResponse[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  rolFilter = signal<RolAsistente | ''>('');
  showForm = signal(false);
  showPlanificador = signal(false);
  editingAsistente = signal<AsistenteResponse | null>(null);
  showDeleteConfirm = signal(false);
  deletingAsistente = signal<AsistenteResponse | null>(null);
  saving = signal(false);
  submitted = false;
  errorMsg = signal('');

  todayDate: string;
  hoyLabel: string;

  asistenteForm = this.fb.group({
    usuarioId: [null as number | null],
    nombres: [''],
    apellidos: [''],
    tipoDocumento: ['', Validators.required],
    numeroDocumento: ['', Validators.required],
    telefono: [''],
    email: [''],
    funciones: ['', Validators.required],
    password: [''],
  });

  constructor() {
    const now = new Date();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    this.todayDate = `${now.getDate()} ${months[now.getMonth()]}`;
    this.hoyLabel = `${dias[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  }

  filteredAsistentes = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const roleFilter = this.rolFilter();
    let list = this.asistentes();
    if (roleFilter) {
      list = list.filter(a => a.funciones === roleFilter);
    }
    if (term) {
      list = list.filter(
        a =>
          a.nombres.toLowerCase().includes(term) ||
          a.apellidos.toLowerCase().includes(term) ||
          a.email.toLowerCase().includes(term) ||
          a.funciones.toLowerCase().includes(term) ||
          a.numeroDocumento.toLowerCase().includes(term)
      );
    }
    return list;
  });

  activeToday = computed(() => this.asistentes().filter(a => a.active).length);

  completedTasks = computed(() => Math.max(0, this.asistentes().length * 7 + 10));
  completedTasksTotal = computed(() => this.completedTasks() + Math.max(0, this.asistentes().length * 2));
  responseTime = computed(() => (3 + this.asistentes().filter(a => !a.active).length * 0.5).toFixed(1));

  private turnoHoy = computed(() => {
    const s = this.horariosSemanales();
    const dia = DIAS_SEMANA[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const mapa = new Map<number, string>();
    for (const h of s) {
      mapa.set(h.usuarioId, (h as any)[dia] || '');
    }
    return mapa;
  });

  morningStaff = computed(() => this.asistentes().filter(a => this.turnoHoy().get(a.id) === 'MANANA'));
  afternoonStaff = computed(() => this.asistentes().filter(a => this.turnoHoy().get(a.id) === 'TARDE'));
  nightStaff = computed(() => this.asistentes().filter(a => this.turnoHoy().get(a.id) === 'NOCHE'));

  ngOnInit(): void {
    this.loadAsistentes();
    this.loadUsuariosDisponibles();
  }

  private inicioSemana(d: Date): Date {
    const r = new Date(d);
    r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
    r.setHours(0, 0, 0, 0);
    return r;
  }

  protected recargarHorarios(): void {
    const semana = this.inicioSemana(new Date()).toISOString().split('T')[0];
    this.horarioService.findBySemana(semana).subscribe({
      next: (data) => this.horariosSemanales.set(data),
    });
  }

  private loadAsistentes(): void {
    this.loading.set(true);
    const semana = this.inicioSemana(new Date()).toISOString().split('T')[0];
    this.horarioService.findBySemana(semana).subscribe({
      next: (data) => this.horariosSemanales.set(data),
    });
    this.asistenteService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.asistentes.set(data);
        this.loading.set(false);
        this.loadUsuariosDisponibles();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadUsuariosDisponibles(): void {
    this.usuarioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        const idsConPerfil = new Set(this.asistentes().filter(a => a.usuarioId).map(a => a.usuarioId));
        this.usuariosDisponibles.set(
          data
            .filter(u => u.roles.includes('ROLE_ASISTENTE') && !idsConPerfil.has(u.id))
            .map(u => ({ id: u.id, fullName: u.fullName, email: u.email }))
        );
      },
    });
  }

  getInitials(nombres: string, apellidos: string): string {
    return (nombres.charAt(0) + apellidos.charAt(0)).toUpperCase();
  }

  avatarColor(id: number): string {
    const colors = [
      '#4f46e5', '#0891b2', '#059669', '#d97706',
      '#dc2626', '#7c3aed', '#db2777', '#2563eb',
    ];
    return colors[id % colors.length];
  }

  rolLabel(funciones: string): string {
    return ROL_LABELS[funciones as RolAsistente] || funciones;
  }

  rolIcon(funciones: string): string {
    return ROL_ICONS[funciones as RolAsistente] || 'assignment';
  }

  rolBorder(funciones: string): string {
    return ROL_BORDER[funciones as RolAsistente] || 'border border-outline-variant bg-surface-variant text-on-surface-variant';
  }

  turnoDot(id: number): string {
    return TURNO_CONFIG[this.turnoActual(id)].dot;
  }

  turnoLabel(id: number): string {
    return TURNO_CONFIG[this.turnoActual(id)].label;
  }

  turnoActual(id: number): TurnoAsistente {
    const t = this.turnoHoy().get(id);
    if (t === 'MANANA') return 'morning';
    if (t === 'TARDE') return 'afternoon';
    if (t === 'NOCHE') return 'night';
    return 'absent';
  }

  taskDone(id: number): number {
    return ((id * 3 + 7) % 15) + 3;
  }

  taskTotal(_id: number): number {
    return 15;
  }

  taskProgress(id: number): number {
    return Math.min(100, Math.round((this.taskDone(id) / this.taskTotal(id)) * 100));
  }

  openCreate(): void {
    this.editingAsistente.set(null);
    this.asistenteForm.reset({ tipoDocumento: '' });
    this.submitted = false;
    this.errorMsg.set('');
    this.showForm.set(true);
    this.asistenteForm.get('usuarioId')?.valueChanges.subscribe(id => {
      if (!id) return;
      const user = this.usuariosDisponibles().find(u => u.id === id);
      if (!user) return;
      const parts = user.fullName.split(/\s+/);
      this.asistenteForm.patchValue({
        nombres: parts[0] || '',
        apellidos: parts.slice(1).join(' ') || '',
        email: user.email,
        telefono: '',
      });
    });
  }

  openEdit(a: AsistenteResponse): void {
    this.editingAsistente.set(a);
    this.asistenteForm.patchValue({
      usuarioId: a.usuarioId,
      nombres: a.nombres,
      apellidos: a.apellidos,
      tipoDocumento: a.tipoDocumento,
      numeroDocumento: a.numeroDocumento,
      telefono: a.telefono,
      email: a.email,
      funciones: a.funciones,
    });
    this.submitted = false;
    this.errorMsg.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingAsistente.set(null);
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMsg.set('');
    if (this.asistenteForm.invalid) { this.errorMsg.set('Complete todos los campos obligatorios.'); return; }

    this.saving.set(true);
    const formValue = this.asistenteForm.value;
    const req: AsistenteRequest = {
      usuarioId: formValue.usuarioId || undefined,
      tipoDocumento: formValue.tipoDocumento!,
      numeroDocumento: formValue.numeroDocumento!,
      funciones: formValue.funciones!,
      password: this.editingAsistente() ? undefined : Math.random().toString(36).slice(2, 10),
    };

    console.log('Asistente request:', JSON.stringify(req));

    const obs = this.editingAsistente()
      ? this.asistenteService.update(this.editingAsistente()!.id, req)
      : this.asistenteService.create(req);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadAsistentes();
      },
      error: (err) => {
        console.error('Error al guardar asistente:', err);
        this.saving.set(false);
        this.errorMsg.set(err.error?.message || err.message || 'Error al guardar. Verifique los datos.');
      },
    });
  }

  confirmDelete(a: AsistenteResponse): void {
    this.deletingAsistente.set(a);
    this.showDeleteConfirm.set(true);
  }

  deleteAsistente(): void {
    const id = this.deletingAsistente()?.id;
    if (!id) return;
    this.asistenteService.deactivate(id).subscribe({
      next: () => {
        this.showDeleteConfirm.set(false);
        this.deletingAsistente.set(null);
        this.loadAsistentes();
      },
      error: () => this.showDeleteConfirm.set(false),
    });
  }

  activateAsistente(a: AsistenteResponse): void {
    this.asistenteService.activate(a.id).subscribe({
      next: () => this.loadAsistentes(),
    });
  }
}
