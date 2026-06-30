import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitaService } from '../../core/services/cita.service';
import { VeterinarioService } from '../../core/services/veterinario.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { CitaResponse } from '../../core/models/cita.model';
import { UsuarioResponse } from '../../core/models/usuario.model';
import { VeterinarioResponse, VeterinarioRequest, HorarioVeterinarioRequest } from '../../core/models/veterinario.model';
import { catchError, EMPTY } from 'rxjs';

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] as const;
const DAY_MAP: Record<string, string> = {
  LUNES: 'MONDAY', MARTES: 'TUESDAY', MIERCOLES: 'WEDNESDAY',
  JUEVES: 'THURSDAY', VIERNES: 'FRIDAY', SABADO: 'SATURDAY', DOMINGO: 'SUNDAY',
};

@Component({
  selector: 'app-veterinarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  template: `
  <div class="space-y-6 pb-8">
    <!-- Header -->
    <div>
      <h2 class="text-headline-lg font-extrabold text-on-surface">Gesti&oacute;n de Veterinarios</h2>
      <p class="text-body-md text-on-surface-variant">Administra el equipo m&eacute;dico, especialidades y horarios.</p>
    </div>

    <!-- Summary Widgets -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Personal Activo</p>
          <p class="text-display-lg text-display-lg text-primary">{{ activeCount() }}</p>
        </div>
        <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
          <span class="material-symbols-outlined text-[28px]">group</span>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Especialidades</p>
          <p class="text-display-lg text-display-lg text-on-surface">{{ specialtyCount() }}</p>
        </div>
        <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <span class="material-symbols-outlined text-[28px]">local_hospital</span>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">Citas Hoy</p>
          <p class="text-display-lg text-display-lg text-on-surface">{{ placeholderCitasHoy() }}</p>
        </div>
        <div class="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
          <span class="material-symbols-outlined text-[28px]">calendar_today</span>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">En Quir&oacute;fano</p>
          <p class="text-display-lg text-display-lg text-tertiary-container">{{ placeholderQuirofano() }}</p>
        </div>
        <div class="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
          <span class="material-symbols-outlined text-[28px]">medical_services</span>
        </div>
      </div>
    </div>

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div class="flex gap-2">
        <button class="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">filter_list</span>
          Filtros
        </button>
        <button class="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">sort</span>
          Ordenar
        </button>
      </div>
      @if (!auth.isDuenioOnly()) {
        <button (click)="openCreate()"
                class="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center">
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          A&ntilde;adir datos
        </button>
      }
    </div>

    <!-- Loading -->
    @if (loading()) {
      <app-loading-spinner message="Cargando veterinarios..." />
    } @else {
      <!-- Card Grid -->
      @if (filteredVeterinarios().length === 0) {
        <app-empty-state icon="group_off" title="No hay veterinarios"
                         message="No se encontraron veterinarios registrados." />
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @for (v of filteredVeterinarios(); track v.id) {
            <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                 [class.opacity-75]="!v.active">
              <div class="p-6 flex flex-col items-center text-center border-b border-outline-variant bg-surface-bright">
                <div class="relative mb-4">
                  <div class="w-24 h-24 rounded-full flex items-center justify-center text-on-primary text-headline-md font-bold border-4 border-surface-container-lowest shadow-sm"
                       [style.background-color]="avatarColor(v.id)"
                       [class.grayscale]="!v.active">
                    {{ getInitials(v.nombres, v.apellidos) }}
                  </div>
                  <span class="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-surface-container-lowest"
                        [class.bg-secondary]="vetStatus(v.id) === 'available'"
                        [class.bg-tertiary]="vetStatus(v.id) === 'surgery'"
                        [class.bg-outline]="vetStatus(v.id) === 'away'"
                        [title]="statusLabel(vetStatus(v.id))"></span>
                </div>
                <h3 class="text-headline-md font-bold text-on-surface mb-1">{{ v.nombres }} {{ v.apellidos }}</h3>
                <p class="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">{{ v.especialidad }}</p>
              </div>
              <div class="p-5 flex-1 flex flex-col gap-4">
                <div class="flex justify-between items-center font-body-sm text-body-sm">
                  <span class="text-on-surface-variant flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">schedule</span> Turno Hoy</span>
                  <span class="font-medium text-on-surface">{{ randomShift(v.id) }}</span>
                </div>
                <div class="flex justify-between items-center font-body-sm text-body-sm">
                  <span class="text-on-surface-variant flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">event</span> Citas Hoy</span>
                  <span class="font-medium text-on-surface">{{ randomAppointments(v.id) }} agendadas</span>
                </div>
              </div>
              <div class="p-4 bg-surface-container-low border-t border-outline-variant flex gap-2">
                @if (!auth.isDuenioOnly()) {
                  <button (click)="openEdit(v)"
                          class="flex-1 px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                    Perfil
                  </button>
                  <button (click)="openSchedule(v)"
                          class="flex-1 px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-primary hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">calendar_month</span>
                    Horario
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">
              {{ editingVeterinario() ? 'Editar Veterinario' : 'A&ntilde;adir datos' }}
            </h3>
            <button (click)="closeForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="veterinarioForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
            <!-- Select Usuario -->
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Usuario</label>
              <select formControlName="usuarioId" class="input input-bordered w-full">
                <option value="">Seleccionar usuario veterinario...</option>
                @for (u of usuariosDisponibles(); track u.id) {
                  <option [value]="u.id">{{ u.fullName }} ({{ u.email }})</option>
                }
              </select>
              @if (submitted && veterinarioForm.get('usuarioId')?.invalid) {
                <p class="text-error text-body-sm mt-1">Debe seleccionar un usuario veterinario.</p>
              }
              @if (usuariosDisponibles().length === 0) {
                <p class="text-body-sm text-on-surface-variant mt-1">No hay usuarios veterinarios disponibles. Cree uno en Usuarios primero.</p>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">N&uacute;mero Colegiatura</label>
                <input type="text" formControlName="numeroColegiatura" placeholder="Ej: CMP-12345"
                       class="input input-bordered w-full" />
              </div>
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Especialidad</label>
                <input type="text" formControlName="especialidad" placeholder="Ej: Cirug&iacute;a"
                       class="input input-bordered w-full" />
              </div>
            </div>

            <div class="pt-4 border-t border-outline-variant/20">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-title-md font-bold text-on-surface">Horarios</h4>
                <button type="button" (click)="addHorario()"
                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-label-md hover:bg-primary/20 transition-all">
                  <span class="material-symbols-outlined text-[18px]">add</span>
                  Agregar Horario
                </button>
              </div>
              <div formArrayName="horarios" class="space-y-3">
                @for (h of horarios.controls; track $index; let idx = $index) {
                  <div [formGroupName]="idx" class="grid grid-cols-12 gap-3 items-start p-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/10">
                    <div class="col-span-12 sm:col-span-3 space-y-1">
                      <label class="text-label-xs text-on-surface-variant">D&iacute;a</label>
                      <select formControlName="diaSemana" class="select select-bordered w-full">
                        <option value="">Seleccione</option>
                        @for (d of diasSemana; track d) {
                          <option [value]="d">{{ d }}</option>
                        }
                      </select>
                    </div>
                    <div class="col-span-6 sm:col-span-2 space-y-1">
                      <label class="text-label-xs text-on-surface-variant">Inicio</label>
                      <input type="time" formControlName="horaInicio" class="input input-bordered w-full" />
                    </div>
                    <div class="col-span-6 sm:col-span-2 space-y-1">
                      <label class="text-label-xs text-on-surface-variant">Fin</label>
                      <input type="time" formControlName="horaFin" class="input input-bordered w-full" />
                    </div>
                    <div class="col-span-8 sm:col-span-3 space-y-1">
                      <label class="text-label-xs text-on-surface-variant">Bloque (min)</label>
                      <input type="number" formControlName="duracionBloqueMinutos" min="15" max="240" step="5"
                             class="input input-bordered w-full" />
                    </div>
                    <div class="col-span-4 sm:col-span-2 flex items-end justify-end pt-5">
                      <button type="button" (click)="removeHorario(idx)"
                              class="p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all">
                        <span class="material-symbols-outlined text-[20px]">remove_circle</span>
                      </button>
                    </div>
                  </div>
                }
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
                {{ editingVeterinario() ? 'Guardar Cambios' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- View Detail Panel -->
    @if (viewingVeterinario()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="viewingVeterinario.set(null)">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">Perfil del Veterinario</h3>
            <button (click)="viewingVeterinario.set(null)" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-6 space-y-5">
            <div class="flex items-center gap-4 pb-4 border-b border-outline-variant/10">
              <div class="w-14 h-14 rounded-full flex items-center justify-center text-on-primary text-title-md font-bold"
                   [style.background-color]="avatarColor(viewingVeterinario()!.id)">
                {{ getInitials(viewingVeterinario()!.nombres, viewingVeterinario()!.apellidos) }}
              </div>
              <div>
                <h4 class="text-title-md font-bold text-on-surface">{{ viewingVeterinario()!.nombres }} {{ viewingVeterinario()!.apellidos }}</h4>
                <span class="px-3 py-0.5 bg-primary-container/60 text-on-primary-container rounded-full text-label-sm font-semibold inline-block mt-1">{{ viewingVeterinario()!.especialidad }}</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-label-sm text-on-surface-variant">N&deg; Colegiatura</p>
                <p class="text-body-md font-semibold text-on-surface">{{ viewingVeterinario()!.numeroColegiatura }}</p>
              </div>
              <div>
                <p class="text-label-sm text-on-surface-variant">Tel&eacute;fono</p>
                <p class="text-body-md font-semibold text-on-surface">{{ viewingVeterinario()!.telefono }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-label-sm text-on-surface-variant">Email</p>
                <p class="text-body-md font-semibold text-on-surface">{{ viewingVeterinario()!.email }}</p>
              </div>
            </div>
            @if (viewingVeterinario()!.horarios.length > 0) {
              <div class="pt-2">
                <h5 class="text-label-md font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Horarios</h5>
                <div class="space-y-2">
                  @for (h of viewingVeterinario()!.horarios; track h.id) {
                    <div class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-container-low/50 border border-outline-variant/10">
                      <span class="text-label-sm font-semibold text-on-surface min-w-[120px]">{{ h.diaSemana }}</span>
                      <span class="text-body-sm text-on-surface-variant">{{ h.horaInicio }} - {{ h.horaFin }}</span>
                      <span class="text-label-sm text-on-surface-variant">Bloques de {{ h.duracionBloqueMinutos }} min</span>
                    </div>
                  }
                </div>
              </div>
            }
            <div class="flex items-center gap-2 pt-2">
              <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-semibold"
                    [ngClass]="viewingVeterinario()!.active ? 'bg-primary-container/60 text-on-primary-container' : 'bg-error-container/30 text-error'">
                <span class="w-1.5 h-1.5 rounded-full"
                      [class.bg-primary]="viewingVeterinario()!.active"
                      [class.bg-error]="!viewingVeterinario()!.active"></span>
                {{ viewingVeterinario()!.active ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>
          <div class="flex justify-end p-6 pt-0">
            <button (click)="viewingVeterinario.set(null)"
                    class="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-all">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Delete Dialog -->
    <app-confirm-dialog [visible]="showDeleteConfirm()"
                        title="Desactivar Veterinario"
                        [message]="'¿Estás seguro de desactivar a ' + (deletingVeterinario()?.nombres || '') + '?'"
                        confirmText="Desactivar"
                        cancelText="Cancelar"
                        (onConfirm)="deleteVeterinario()"
                        (onCancel)="showDeleteConfirm.set(false)" />
  </div>
  `
})
export class VeterinariosComponent implements OnInit {
  private veterinarioService = inject(VeterinarioService);
  private usuarioService = inject(UsuarioService);
  private citaService = inject(CitaService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  protected diasSemana = DIAS_SEMANA;

  veterinarios = signal<VeterinarioResponse[]>([]);
  usuariosDisponibles = signal<{ id: number; fullName: string; email: string }[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  showForm = signal(false);
  editingVeterinario = signal<VeterinarioResponse | null>(null);
  viewingVeterinario = signal<VeterinarioResponse | null>(null);
  showDeleteConfirm = signal(false);
  deletingVeterinario = signal<VeterinarioResponse | null>(null);
  citasHoy = signal<CitaResponse[]>([]);
  saving = signal(false);
  submitted = false;
  errorMsg = signal('');

  veterinarioForm = this.fb.group({
    usuarioId: [null as number | null, Validators.required],
    nombres: [''],
    apellidos: [''],
    numeroColegiatura: ['', Validators.required],
    especialidad: ['', Validators.required],
    telefono: [''],
    email: [''],
    horarios: this.fb.array<ReturnType<typeof this.createHorarioGroup>>([]),
  });

  get horarios() {
    return this.veterinarioForm.get('horarios') as FormArray;
  }

  private createHorarioGroup() {
    return this.fb.group({
      diaSemana: [''],
      horaInicio: [''],
      horaFin: [''],
      duracionBloqueMinutos: [30],
    });
  }

  filteredVeterinarios = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.veterinarios();
    return this.veterinarios().filter(
      v =>
        v.nombres.toLowerCase().includes(term) ||
        v.apellidos.toLowerCase().includes(term) ||
        v.especialidad.toLowerCase().includes(term) ||
        v.numeroColegiatura.toLowerCase().includes(term)
    );
  });

  activeCount = computed(() => this.veterinarios().filter(v => v.active).length);

  specialtyCount = computed(() => {
    const set = new Set(this.veterinarios().map(v => v.especialidad.toLowerCase()));
    return set.size;
  });

  placeholderCitasHoy = computed(() => this.citasHoy().length);
  placeholderQuirofano = computed(() => this.citasHoy().filter(c => c.estado === 'ATENDIDA').length);

  ngOnInit(): void {
    this.loadVeterinarios();
    this.loadCitasHoy();
    this.loadUsuariosDisponibles();
  }

  private loadCitasHoy(): void {
    const today = new Date().toISOString().split('T')[0];
    this.citaService.findAll({ fecha: today }).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.citasHoy.set(data),
    });
  }

  private loadUsuariosDisponibles(): void {
    this.usuarioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        const vetUserIds = new Set(this.veterinarios().filter(v => v.usuarioId).map(v => v.usuarioId));
        this.usuariosDisponibles.set(
          data
            .filter(u => u.roles.includes('ROLE_VETERINARIO') && !vetUserIds.has(u.id))
            .map(u => ({ id: u.id, fullName: u.fullName, email: u.email }))
        );
      },
    });
  }

  private loadVeterinarios(): void {
    this.loading.set(true);
    this.veterinarioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.veterinarios.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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

  vetStatus(vetId: number): 'available' | 'away' | 'surgery' {
    const count = this.citasHoy().filter(c => c.veterinarioId === vetId).length;
    if (count >= 3) return 'surgery';
    if (count > 0) return 'available';
    return 'away';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      available: 'Disponible',
      away: 'No Disponible',
      surgery: 'En Quirófano',
    };
    return map[status] || status;
  }

  randomShift(vetId: number): string {
    const todayIndex = new Date().getDay();
    const daysEn = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayName = daysEn[todayIndex];
    const vet = this.veterinarios().find(v => v.id === vetId);
    const horario = vet?.horarios?.find(h => h.diaSemana === todayName);
    return horario ? `${horario.horaInicio} - ${horario.horaFin}` : '—';
  }

  randomAppointments(vetId: number): number {
    return this.citasHoy().filter(c => c.veterinarioId === vetId).length;
  }

  addHorario(): void {
    this.horarios.push(this.createHorarioGroup());
  }

  removeHorario(index: number): void {
    this.horarios.removeAt(index);
  }

  openCreate(): void {
    this.editingVeterinario.set(null);
    this.veterinarioForm.reset({ email: '', especialidad: '', numeroColegiatura: '', telefono: '' });
    while (this.horarios.length) this.horarios.removeAt(0);
    this.submitted = false;
    this.errorMsg.set('');
    this.showForm.set(true);
    this.veterinarioForm.get('usuarioId')?.valueChanges.subscribe(id => {
      if (!id) return;
      const user = this.usuariosDisponibles().find(u => u.id === id);
      if (!user) return;
      const parts = user.fullName.split(/\s+/);
      this.veterinarioForm.patchValue({
        nombres: parts[0] || '',
        apellidos: parts.slice(1).join(' ') || '',
        email: user.email,
        telefono: '',
      });
    });
  }

  openEdit(v: VeterinarioResponse): void {
    this.editingVeterinario.set(v);
    this.veterinarioForm.patchValue({
      nombres: v.nombres,
      apellidos: v.apellidos,
      numeroColegiatura: v.numeroColegiatura,
      especialidad: v.especialidad,
      telefono: v.telefono,
      email: v.email,
    });
    while (this.horarios.length) this.horarios.removeAt(0);
    if (v.horarios?.length) {
      v.horarios.forEach(h => {
        this.horarios.push(this.fb.group({
          diaSemana: [h.diaSemana],
          horaInicio: [h.horaInicio],
          horaFin: [h.horaFin],
          duracionBloqueMinutos: [h.duracionBloqueMinutos],
        }));
      });
    }
    this.submitted = false;
    this.showForm.set(true);
  }

  openSchedule(v: VeterinarioResponse): void {
    this.openEdit(v);
  }

  viewVeterinario(v: VeterinarioResponse): void {
    this.viewingVeterinario.set(v);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingVeterinario.set(null);
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMsg.set('');
    if (this.veterinarioForm.invalid) { this.errorMsg.set('Complete todos los campos obligatorios.'); return; }

    this.saving.set(true);
    const formValue = this.veterinarioForm.value;
    const horarios: HorarioVeterinarioRequest[] = (formValue.horarios || [])
      .filter(h => h.diaSemana && h.horaInicio && h.horaFin)
      .map(h => ({
        diaSemana: DAY_MAP[h.diaSemana!] || h.diaSemana!,
        horaInicio: h.horaInicio!,
        horaFin: h.horaFin!,
        duracionBloqueMinutos: h.duracionBloqueMinutos ?? 30,
      }));

    const req: VeterinarioRequest = {
      usuarioId: formValue.usuarioId || undefined,
      numeroColegiatura: formValue.numeroColegiatura!,
      especialidad: formValue.especialidad!,
      horarios: horarios.length > 0 ? horarios : undefined,
    };

    console.log('Veterinario request:', JSON.stringify(req));

    const obs = this.editingVeterinario()
      ? this.veterinarioService.update(this.editingVeterinario()!.id, req)
      : this.veterinarioService.create(req);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadVeterinarios();
      },
      error: (err) => {
        console.error('Error al guardar veterinario:', err);
        this.saving.set(false);
        this.errorMsg.set(err.error?.message || err.message || 'Error al guardar. Verifique los datos.');
      },
    });
  }

  confirmDelete(v: VeterinarioResponse): void {
    this.deletingVeterinario.set(v);
    this.showDeleteConfirm.set(true);
  }

  deleteVeterinario(): void {
    const id = this.deletingVeterinario()?.id;
    if (!id) return;
    this.veterinarioService.deactivate(id).subscribe({
      next: () => {
        this.showDeleteConfirm.set(false);
        this.deletingVeterinario.set(null);
        this.loadVeterinarios();
      },
      error: () => {
        this.showDeleteConfirm.set(false);
      },
    });
  }
}
