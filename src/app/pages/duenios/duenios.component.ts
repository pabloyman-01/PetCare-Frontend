import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DuenioService } from '../../core/services/duenio.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DuenioResponse, DuenioRequest } from '../../core/models/duenio.model';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-duenios',
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Dueños</h2>
        <p class="text-body-md text-on-surface-variant">Gestión de dueños de mascotas</p>
      </div>
      @if (!auth.isDuenioOnly()) {
        <button (click)="openCreate()"
                class="btn btn-primary">
          <span class="material-symbols-outlined text-[20px]">add</span>
          Nuevo Dueño
        </button>
      }
    </div>

    <!-- Search -->
    <div class="glass-card rounded-xl p-4">
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
        <input type="text" placeholder="Buscar por nombre, documento o email..."
               [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
               class="input input-bordered w-full pl-11" />
      </div>
    </div>

    <!-- Loading -->
    @if (loading()) {
      <app-loading-spinner message="Cargando dueños..." />
    } @else {
      <!-- Table -->
      @if (filteredDuenios().length === 0) {
        <app-empty-state icon="group_off" title="No hay dueños"
                         message="No se encontraron dueños registrados." />
      } @else {
        <div class="glass-card rounded-xl overflow-hidden">
          <div class="overflow-x-auto custom-scrollbar">
            <table class="table w-full">
              <thead>
                <tr class="border-b border-outline-variant/20">
                  <th class="text-left px-5 py-4 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Nombre completo</th>
                  <th class="text-left px-5 py-4 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Documento</th>
                  <th class="text-left px-5 py-4 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Teléfono</th>
                  <th class="text-left px-5 py-4 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Email</th>
                  <th class="text-center px-5 py-4 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
                  <th class="text-right px-5 py-4 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10">
                @for (duenio of filteredDuenios(); track duenio.id) {
                  <tr class="hover:bg-surface-container-low/50 transition-all">
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-label-md font-bold flex-shrink-0">
                          {{ getInitials(duenio.nombres, duenio.apellidos) }}
                        </div>
                        <span class="text-body-md font-semibold text-on-surface">{{ duenio.nombres }} {{ duenio.apellidos }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex flex-col">
                        <span class="text-body-md text-on-surface">{{ duenio.numeroDocumento }}</span>
                        <span class="text-label-sm text-on-surface-variant">{{ duenio.tipoDocumento }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <span class="text-body-md text-on-surface">{{ duenio.telefono }}</span>
                    </td>
                    <td class="px-5 py-4">
                      <span class="text-body-md text-on-surface">{{ duenio.email }}</span>
                    </td>
                    <td class="px-5 py-4 text-center">
                      @if (duenio.active) {
                        <span class="badge badge-primary badge-outline">
                          <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          Activo
                        </span>
                      } @else {
                        <span class="badge badge-error badge-outline">
                          <span class="w-1.5 h-1.5 rounded-full bg-error"></span>
                          Inactivo
                        </span>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex items-center justify-end gap-1">
                        <button (click)="viewDuenio(duenio)"
                                class="btn btn-ghost btn-square btn-sm"
                                title="Ver">
                          <span class="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        @if (!auth.isDuenioOnly()) {
                          <button (click)="openEdit(duenio)"
                                  class="btn btn-ghost btn-square btn-sm"
                                  title="Editar">
                            <span class="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button (click)="confirmDelete(duenio)"
                                  class="btn btn-ghost btn-square btn-sm text-error hover:bg-error/10"
                                  title="Eliminar">
                            <span class="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        }
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

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">
              {{ editingDuenio() ? 'Editar Dueño' : 'Nuevo Dueño' }}
            </h3>
            <button (click)="closeForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="duenioForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <!-- Nombres -->
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Nombres</label>
                <input type="text" formControlName="nombres" placeholder="Ingrese nombres"
                       class="input input-bordered w-full" />
                @if (duenioForm.get('nombres')?.invalid && (duenioForm.get('nombres')?.dirty || submitted)) {
                  <p class="text-label-sm text-error">El nombre es obligatorio</p>
                }
              </div>

              <!-- Apellidos -->
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Apellidos</label>
                <input type="text" formControlName="apellidos" placeholder="Ingrese apellidos"
                       class="input input-bordered w-full" />
                @if (duenioForm.get('apellidos')?.invalid && (duenioForm.get('apellidos')?.dirty || submitted)) {
                  <p class="text-label-sm text-error">El apellido es obligatorio</p>
                }
              </div>

              <!-- Tipo Documento -->
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Tipo Documento</label>
                <select formControlName="tipoDocumento"
                        class="select select-bordered w-full">
                  <option value="">Seleccione...</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
                @if (duenioForm.get('tipoDocumento')?.invalid && (duenioForm.get('tipoDocumento')?.dirty || submitted)) {
                  <p class="text-label-sm text-error">Seleccione un tipo de documento</p>
                }
              </div>

              <!-- Número Documento -->
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Número Documento</label>
                <input type="text" formControlName="numeroDocumento" placeholder="Ingrese número"
                       class="input input-bordered w-full" />
                @if (duenioForm.get('numeroDocumento')?.invalid && (duenioForm.get('numeroDocumento')?.dirty || submitted)) {
                  <p class="text-label-sm text-error">El número de documento es obligatorio</p>
                }
              </div>

              <!-- Teléfono -->
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Teléfono</label>
                <input type="text" formControlName="telefono" placeholder="Ingrese teléfono"
                       class="input input-bordered w-full" />
                @if (duenioForm.get('telefono')?.invalid && (duenioForm.get('telefono')?.dirty || submitted)) {
                  <p class="text-label-sm text-error">El teléfono es obligatorio</p>
                }
              </div>

              <!-- Email -->
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Email</label>
                <input type="email" formControlName="email" placeholder="Ingrese email"
                       class="input input-bordered w-full" />
                @if (duenioForm.get('email')?.invalid && (duenioForm.get('email')?.dirty || submitted)) {
                  <p class="text-label-sm text-error">Ingrese un email válido</p>
                }
              </div>

              <!-- Dirección -->
              <div class="space-y-1.5 sm:col-span-2">
                <label class="text-label-sm font-semibold text-on-surface-variant">Dirección</label>
                <input type="text" formControlName="direccion" placeholder="Ingrese dirección (opcional)"
                       class="input input-bordered w-full" />
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="closeForm()"
                      class="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" [disabled]="saving()"
                      class="btn btn-primary">
                @if (saving()) {
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                }
                {{ editingDuenio() ? 'Guardar Cambios' : 'Crear Dueño' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- View Modal -->
    @if (viewingDuenio()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="viewingDuenio.set(null)">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-lg w-full" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">Detalles del Dueño</h3>
            <button (click)="viewingDuenio.set(null)" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div class="flex items-center gap-4 pb-4 border-b border-outline-variant/10">
              <div class="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-title-md font-bold">
                {{ getInitials(viewingDuenio()!.nombres, viewingDuenio()!.apellidos) }}
              </div>
              <div>
                <h4 class="text-title-md font-bold text-on-surface">{{ viewingDuenio()!.nombres }} {{ viewingDuenio()!.apellidos }}</h4>
                <span [class]="viewingDuenio()!.active
                  ? 'inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary-container/60 text-on-primary-container text-label-sm font-semibold mt-1'
                  : 'inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-error-container/30 text-error text-label-sm font-semibold mt-1'">
                  <span class="w-1.5 h-1.5 rounded-full" [class.bg-primary]="viewingDuenio()!.active" [class.bg-error]="!viewingDuenio()!.active"></span>
                  {{ viewingDuenio()!.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-label-sm text-on-surface-variant">Tipo Documento</p>
                <p class="text-body-md font-semibold text-on-surface">{{ viewingDuenio()!.tipoDocumento }}</p>
              </div>
              <div>
                <p class="text-label-sm text-on-surface-variant">Número Documento</p>
                <p class="text-body-md font-semibold text-on-surface">{{ viewingDuenio()!.numeroDocumento }}</p>
              </div>
              <div>
                <p class="text-label-sm text-on-surface-variant">Teléfono</p>
                <p class="text-body-md font-semibold text-on-surface">{{ viewingDuenio()!.telefono }}</p>
              </div>
              <div>
                <p class="text-label-sm text-on-surface-variant">Email</p>
                <p class="text-body-md font-semibold text-on-surface">{{ viewingDuenio()!.email }}</p>
              </div>
              @if (viewingDuenio()!.direccion) {
                <div class="col-span-2">
                  <p class="text-label-sm text-on-surface-variant">Dirección</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ viewingDuenio()!.direccion }}</p>
                </div>
              }
            </div>
          </div>
          <div class="flex justify-end p-6 pt-0">
            <button (click)="viewingDuenio.set(null)"
                    class="btn btn-primary">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Delete Dialog -->
    <app-confirm-dialog [visible]="showDeleteConfirm()"
                        title="Eliminar Dueño"
                        [message]="'¿Estás seguro de eliminar a ' + (deletingDuenio()?.nombres || '') + ' ' + (deletingDuenio()?.apellidos || '') + '?'"
                        confirmText="Eliminar"
                        cancelText="Cancelar"
                        (onConfirm)="deleteDuenio()"
                        (onCancel)="showDeleteConfirm.set(false)" />
  </div>
  `
})
export class DueniosComponent implements OnInit {
  private duenioService = inject(DuenioService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  duenios = signal<DuenioResponse[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  showForm = signal(false);
  editingDuenio = signal<DuenioResponse | null>(null);
  viewingDuenio = signal<DuenioResponse | null>(null);
  showDeleteConfirm = signal(false);
  deletingDuenio = signal<DuenioResponse | null>(null);
  saving = signal(false);
  submitted = false;

  duenioForm = this.fb.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    tipoDocumento: ['', Validators.required],
    numeroDocumento: ['', Validators.required],
    telefono: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    direccion: [''],
  });

  filteredDuenios = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.duenios();
    return this.duenios().filter(
      d =>
        d.nombres.toLowerCase().includes(term) ||
        d.apellidos.toLowerCase().includes(term) ||
        d.numeroDocumento.toLowerCase().includes(term) ||
        d.email.toLowerCase().includes(term) ||
        d.telefono.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadDuenios();
  }

  private loadDuenios(): void {
    this.loading.set(true);
    if (this.auth.isDuenioOnly()) {
      this.duenioService.findOwn().pipe(catchError(() => EMPTY)).subscribe({
        next: (data) => {
          this.duenios.set([data]);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.duenioService.findAll().subscribe({
        next: (data) => {
          this.duenios.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  getInitials(nombres: string, apellidos: string): string {
    return (nombres.charAt(0) + apellidos.charAt(0)).toUpperCase();
  }

  openCreate(): void {
    this.editingDuenio.set(null);
    this.duenioForm.reset({ tipoDocumento: '' });
    this.submitted = false;
    this.showForm.set(true);
  }

  openEdit(duenio: DuenioResponse): void {
    this.editingDuenio.set(duenio);
    this.duenioForm.patchValue({
      nombres: duenio.nombres,
      apellidos: duenio.apellidos,
      tipoDocumento: duenio.tipoDocumento,
      numeroDocumento: duenio.numeroDocumento,
      telefono: duenio.telefono,
      email: duenio.email,
      direccion: duenio.direccion ?? '',
    });
    this.submitted = false;
    this.showForm.set(true);
  }

  viewDuenio(duenio: DuenioResponse): void {
    this.viewingDuenio.set(duenio);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingDuenio.set(null);
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.duenioForm.invalid) return;

    this.saving.set(true);
    const formValue = this.duenioForm.value;
    const req: DuenioRequest = {
      nombres: formValue.nombres!,
      apellidos: formValue.apellidos!,
      tipoDocumento: formValue.tipoDocumento!,
      numeroDocumento: formValue.numeroDocumento!,
      telefono: formValue.telefono!,
      email: formValue.email!,
      direccion: formValue.direccion || undefined,
    };

    const obs = this.editingDuenio()
      ? this.duenioService.update(this.editingDuenio()!.id, req)
      : this.duenioService.create(req);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadDuenios();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(duenio: DuenioResponse): void {
    this.deletingDuenio.set(duenio);
    this.showDeleteConfirm.set(true);
  }

  deleteDuenio(): void {
    const id = this.deletingDuenio()?.id;
    if (!id) return;
    this.duenioService.deactivate(id).subscribe({
      next: () => {
        this.showDeleteConfirm.set(false);
        this.deletingDuenio.set(null);
        this.loadDuenios();
      },
      error: () => {
        this.showDeleteConfirm.set(false);
      },
    });
  }
}
