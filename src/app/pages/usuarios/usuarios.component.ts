import { Component, DestroyRef, OnInit, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsuarioService } from '../../core/services/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { UsuarioResponse } from '../../core/models/usuario.model';
import { defer, finalize, of, switchMap, take } from 'rxjs';

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Admin',
  ROLE_VETERINARIO: 'Veterinario',
  ROLE_ASISTENTE: 'Asistente',
  ROLE_DUENIO: 'Dueño',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ROLE_ADMIN: { bg: 'bg-error-container/30', text: 'text-error' },
  ROLE_VETERINARIO: { bg: 'bg-primary-container/60', text: 'text-on-primary-container' },
  ROLE_ASISTENTE: { bg: 'bg-secondary-container/60', text: 'text-on-secondary-container' },
  ROLE_DUENIO: { bg: 'bg-tertiary-container/60', text: 'text-on-tertiary-container' },
};

const ALL_ROLES = ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE', 'ROLE_DUENIO'];

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  template: `
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Gesti&oacute;n de Usuarios y Roles</h2>
        <p class="text-body-md text-on-surface-variant">Controla los niveles de acceso y personal de la cl&iacute;nica.</p>
      </div>
      <button (click)="openCreate()"
              class="bg-primary-container text-on-primary-container px-6 py-3 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:shadow-lg active:scale-95 transition-all">
        <span class="material-symbols-outlined">person_add</span>
        A&ntilde;adir Nuevo Usuario
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-primary-container/10 rounded-lg text-primary">
            <span class="material-symbols-outlined">group</span>
          </div>
          <span class="text-secondary font-bold text-label-sm bg-secondary-container/30 px-2 py-1 rounded">+{{ usuarios().length }}</span>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">Total de Usuarios</p>
        <h3 class="text-headline-lg font-headline-lg text-on-surface">{{ usuarios().length }}</h3>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-secondary-container/30 rounded-lg text-secondary">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <span class="text-on-surface-variant font-label-sm">En l&iacute;nea: {{ activeCount() }}</span>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">Usuarios Activos</p>
        <h3 class="text-headline-lg font-headline-lg text-on-surface">{{ activeCount() }}</h3>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-surface-container-high rounded-lg text-on-surface">
            <span class="material-symbols-outlined">admin_panel_settings</span>
          </div>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">Roles Definidos</p>
        <h3 class="text-headline-lg font-headline-lg text-on-surface">{{ allRoles.length }}</h3>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-error-container/30 rounded-lg text-error">
            <span class="material-symbols-outlined">priority_high</span>
          </div>
          <div class="flex h-2 w-2 rounded-full bg-error animate-pulse"></div>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">Inactivos</p>
        <h3 class="text-headline-lg font-headline-lg text-on-surface">{{ usuarios().length - activeCount() < 10 ? '0' + (usuarios().length - activeCount()) : usuarios().length - activeCount() }}</h3>
      </div>
    </div>

    <!-- Main Workspace: Table + Sidebar -->
    <div class="grid grid-cols-12 gap-6">
      <!-- Table Section -->
      <div class="col-span-12 xl:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div class="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h4 class="text-headline-md font-bold text-on-surface">Lista de Usuarios</h4>
          <div class="flex items-center gap-4">
            <div class="relative max-w-xs">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input type="text" placeholder="Buscar usuarios..."
                     [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
                     class="w-full bg-surface-container-low border-outline-variant rounded-full py-2 pl-9 pr-4 text-body-sm focus:ring-primary transition-all" />
            </div>
            <button class="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
              <span class="material-symbols-outlined text-[20px] text-on-surface-variant">filter_list</span>
            </button>
          </div>
        </div>
        @if (pageError()) {
          <p role="alert" class="text-error p-4">{{ pageError() }} <button type="button" class="underline" (click)="loadUsuarios()">Reintentar carga</button></p>
        }
        @if (loading()) {
          <app-loading-spinner message="Cargando usuarios..." />
        } @else if (filteredUsuarios().length === 0) {
          <app-empty-state icon="group_off" title="No hay usuarios"
                           message="No se encontraron usuarios con los filtros actuales." />
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low/50">
                  <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Nombre</th>
                  <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Rol</th>
                  <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Correo</th>
                  <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Estado</th>
                  <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                @for (u of filteredUsuarios(); track u.id) {
                  <tr class="hover:bg-surface-container-lowest transition-colors group">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-on-primary text-label-md font-bold flex-shrink-0"
                             [style.background-color]="avatarColor(u.id)">
                          {{ getInitials(u.fullName) }}
                        </div>
                        <div>
                          <p class="font-label-md text-label-md text-on-surface">{{ u.fullName }}</p>
                          <p class="text-body-sm text-outline">{{ roleLabel(primaryRole(u.roles)) }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="px-3 py-1 rounded-full text-[11px] font-bold uppercase"
                            [class]="roleBadgeClass(primaryRole(u.roles))">
                        {{ roleLabel(primaryRole(u.roles)) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-body-sm text-on-surface-variant">{{ u.email }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2"
                           [class.text-secondary]="u.active"
                           [class.text-outline]="!u.active">
                        <div class="w-2 h-2 rounded-full"
                             [class.bg-secondary]="u.active"
                             [class.bg-outline]="!u.active"></div>
                        <span class="text-label-sm font-label-sm">{{ u.active ? 'Activo' : 'Inactivo' }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button (click)="openEdit(u)"
                                class="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/10 rounded-lg transition-all"
                                title="Editar">
                          <span class="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button (click)="openRolesEditor(u)"
                                class="p-2 text-on-surface-variant hover:text-tertiary hover:bg-tertiary-container/10 rounded-lg transition-all"
                                title="Gestionar roles">
                          <span class="material-symbols-outlined text-[20px]">manage_accounts</span>
                        </button>
                        <button (click)="deleteUsuario(u)"
                                class="p-2 text-error hover:bg-error-container/20 rounded-lg transition-all"
                                title="Eliminar usuario">
                          <span class="material-symbols-outlined text-[20px]">person_remove</span>
                        </button>
                        @if (u.active) {
                          <button (click)="confirmToggleActive(u)"
                                  class="p-2 text-error hover:bg-error-container/20 rounded-lg transition-all"
                                  title="Desactivar cuenta">
                            <span class="material-symbols-outlined text-[20px]">block</span>
                          </button>
                        } @else {
                          <button (click)="toggleActive(u)"
                                  class="p-2 text-secondary hover:bg-secondary-container/20 rounded-lg transition-all"
                                  title="Activar cuenta">
                            <span class="material-symbols-outlined text-[20px]">check_circle</span>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="p-4 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
            <p class="text-body-sm text-outline">Mostrando {{ filteredUsuarios().length }} de {{ usuarios().length }} usuarios</p>
            <div class="flex gap-2">
              <button class="px-3 py-1 border border-outline-variant rounded-md text-body-sm hover:bg-white disabled:opacity-50"
                      disabled>Anterior</button>
              <button class="px-3 py-1 border border-outline-variant rounded-md text-body-sm hover:bg-white">Siguiente</button>
            </div>
          </div>
        }
      </div>

      <!-- Sidebar: Roles Configuration -->
      <div class="col-span-12 xl:col-span-4 space-y-6">
        <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h4 class="text-headline-md font-bold text-on-surface">Niveles de Acceso</h4>
          </div>
          <div class="space-y-4">
            @for (role of allRoles; track role) {
              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div class="flex justify-between items-center mb-3">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-on-surface-variant">security</span>
                    <span class="font-bold text-on-surface font-label-md text-label-md">{{ roleLabel(role) }}</span>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        [class]="roleBadgeClass(role)">
                    {{ roleCount(role) }}
                  </span>
                </div>
                <p class="text-body-sm text-on-surface-variant mb-4">{{ roleDescription(role) }}</p>
                <div class="flex gap-4">
                  <div class="flex items-center gap-1"
                       [ngClass]="rolePerms(role).read ? 'text-secondary' : 'text-outline/40'">
                    <span class="material-symbols-outlined text-[18px]">{{ rolePerms(role).read ? 'task_alt' : 'do_not_disturb_on' }}</span>
                    <span class="text-[12px] font-medium">Lectura</span>
                  </div>
                  <div class="flex items-center gap-1"
                       [ngClass]="rolePerms(role).write ? 'text-secondary' : 'text-outline/40'">
                    <span class="material-symbols-outlined text-[18px]">{{ rolePerms(role).write ? 'task_alt' : 'do_not_disturb_on' }}</span>
                    <span class="text-[12px] font-medium">Escritura</span>
                  </div>
                  <div class="flex items-center gap-1"
                       [ngClass]="rolePerms(role).admin ? 'text-secondary' : 'text-outline/40'">
                    <span class="material-symbols-outlined text-[18px]">{{ rolePerms(role).admin ? 'task_alt' : 'do_not_disturb_on' }}</span>
                    <span class="text-[12px] font-medium">Admin</span>
                  </div>
                </div>
              </div>
            }
          </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">
              {{ editingUser() ? 'Editar Usuario' : 'Nuevo Usuario' }}
            </h3>
            <button (click)="closeForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          @if (temporaryPassword()) {
            <div class="p-6 space-y-5">
              <div class="p-4 rounded-xl bg-secondary-container/20 border border-secondary/20 flex items-center gap-3">
                <span class="material-symbols-outlined text-secondary">check_circle</span>
                <div>
                  <p class="text-label-md font-bold text-on-surface">Usuario creado exitosamente</p>
                  <p class="text-body-sm text-on-surface-variant mt-1">El usuario deber&aacute; cambiar su contrase&ntilde;a en el primer inicio de sesi&oacute;n.</p>
                </div>
              </div>
              <div class="p-4 rounded-xl bg-surface-container-high border border-outline-variant space-y-2">
                <p class="text-label-sm font-semibold text-on-surface">Contrase&ntilde;a temporal:</p>
                <div class="flex items-center gap-2">
                  <input [value]="temporaryPassword()" readonly
                         class="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm font-mono text-on-surface" />
                  <button (click)="copyPassword()"
                          class="px-3 py-2 bg-primary text-on-primary rounded-lg text-label-sm hover:opacity-90 transition-all">
                    {{ copiedPassword ? 'Copiado!' : 'Copiar' }}
                  </button>
                </div>
                <p class="text-body-sm text-error mt-1">Guarda esta contrase&ntilde;a. No se mostrar&aacute; nuevamente.</p>
              </div>
              <div class="flex justify-end">
                <button type="button" (click)="closeForm()" class="btn btn-primary">Cerrar</button>
              </div>
            </div>
          } @else {
            <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Nombres</label>
                <input type="text" formControlName="nombres" placeholder="Ingrese nombres" class="input input-bordered w-full" />
                <label class="text-label-sm font-semibold text-on-surface-variant">Apellidos</label>
                <input type="text" formControlName="apellidos" placeholder="Ingrese apellidos" class="input input-bordered w-full" />
              </div>
              <label class="text-label-sm font-semibold text-on-surface-variant">Email</label>
              <input type="email" formControlName="email" placeholder="correo@ejemplo.com" class="input input-bordered w-full" />
              @if (editingUser()) {
                <label class="text-label-sm font-semibold text-on-surface-variant">Tel&eacute;fono</label>
                <input type="tel" formControlName="telefono" class="input input-bordered w-full" />
                <p class="text-body-sm text-on-surface-variant">Obligatorio: 8 a 20 caracteres; solo n&uacute;meros, espacios, + y guiones.</p>
              }
              <label class="text-label-sm font-semibold text-on-surface-variant">Rol</label>
              <div class="grid grid-cols-2 gap-2">
                @for (role of editingUser() ? allRoles : internalRoles; track role) {
                  <div class="flex items-center gap-2 p-2.5 rounded-lg border border-outline-variant/20 cursor-pointer hover:bg-surface-container-low transition-all"
                       [ngClass]="{'border-primary': editingUser() ? selectedRoles().includes(role) : formRole() === role, 'bg-primary/5': editingUser() ? selectedRoles().includes(role) : formRole() === role}"
                       (click)="editingUser() ? toggleRole(role) : formRole.set(role)">
                    <span>{{ roleLabel(role) }}</span>
                  </div>
                }
              </div>
              @if (submitted && (editingUser() ? selectedRoles().length === 0 : !formRole())) {
                <p class="text-label-sm text-error">Seleccione un rol</p>
              }
              @if (submitted && userForm.invalid) {
                <p role="alert" class="text-label-sm text-error">Revise nombres, apellidos y email. En edici&oacute;n, el tel&eacute;fono es obligatorio y debe cumplir el formato indicado.</p>
              }
              @if (submitError()) {
                <div class="p-4 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-3">
                  <span class="material-symbols-outlined text-error">error</span>
                  <p role="alert" class="text-label-sm text-error font-semibold">{{ submitError() }}</p>
                </div>
              }
              <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button type="button" (click)="closeForm()" class="btn btn-ghost">Cancelar</button>
                <button type="submit" [disabled]="saving()" class="btn btn-primary">
                  @if (saving()) {
                    <span class="loading loading-spinner"></span>
                  }
                  {{ editingUser() ? 'Guardar Cambios' : 'Crear Usuario' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }

    <!-- Roles Editor Modal -->
    @if (showRolesEditor() && editRolesUser()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeRolesEditor()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-headline-md font-bold text-on-surface">Editar Roles</h3>
              <p class="text-body-sm text-on-surface-variant mt-0.5">{{ editRolesUser()!.fullName }}</p>
            </div>
            <button (click)="closeRolesEditor()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="space-y-3">
            @for (role of allRoles; track role) {
              <div class="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/20 cursor-pointer hover:bg-surface-container-low transition-all"
                   [ngClass]="{'border-primary': editRolesSelected().includes(role), 'bg-primary/5': editRolesSelected().includes(role)}"
                   (click)="toggleEditRole(role)">
                <input type="checkbox" [checked]="editRolesSelected().includes(role)"
                       (change)="toggleEditRole(role)"
                       class="w-4 h-4 rounded border-outline-variant/30 text-primary focus:ring-primary/30 cursor-pointer pointer-events-none" />
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-label-xs font-semibold"
                        [class]="roleBadgeClass(role)">
                    {{ roleLabel(role) }}
                  </span>
                </div>
              </div>
            }
          </div>
          @if (rolesError()) { <p role="alert" class="text-error text-body-sm mt-4">{{ rolesError() }}</p> }
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/20">
            <button type="button" (click)="closeRolesEditor()" class="btn btn-ghost">Cancelar</button>
            <button type="button" (click)="saveRoles()" [disabled]="savingRoles()"
                    class="btn btn-primary">
              @if (savingRoles()) {
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              }
              Guardar Roles
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Dialog -->
    <app-confirm-dialog [visible]="showConfirmDialog()"
                        [title]="confirmTitle()"
                        [message]="confirmMessage()"
                        confirmText="Confirmar"
                        cancelText="Cancelar"
                        (onConfirm)="onConfirmAction()"
                        (onCancel)="showConfirmDialog.set(false)" />
  </div>
  `
})
export class UsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected allRoles = ALL_ROLES;
  protected internalRoles = ['ROLE_VETERINARIO', 'ROLE_ASISTENTE', 'ROLE_DUENIO'];
  protected roleLabel = (role: string) => ROLE_LABELS[role] || role;
  protected roleCount = (role: string) => this.usuarios().filter(u => u.roles.includes(role)).length;

  protected totalPorRol = computed(() => {
    const total = ALL_ROLES.reduce((sum, r) => sum + this.roleCount(r), 0);
    const real = this.usuarios().length;
    if (total !== real) {
      console.warn(`[Niveles de Acceso] Suma de roles (${total}) difiere del total de usuarios (${real}). Esto es normal si hay usuarios con múltiples roles.`);
    }
    return { total, real };
  });

  usuarios = signal<UsuarioResponse[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  selectedRole = signal('');
  formRole = signal('');

  showForm = signal(false);
  editingUser = signal<UsuarioResponse | null>(null);
  saving = signal(false);
  submitted = false;

  temporaryPassword = signal('');
  copiedPassword = false;

  showRolesEditor = signal(false);
  editRolesUser = signal<UsuarioResponse | null>(null);
  editRolesSelected = signal<string[]>([]);
  savingRoles = signal(false);

  selectedRoles = signal<string[]>([]);

  submitError = signal('');
  pageError = signal('');
  rolesError = signal('');

  showConfirmDialog = signal(false);
  confirmAction = signal<(() => void) | null>(null);
  confirmTitle = signal('');
  confirmMessage = signal('');

  userForm = this.fb.group({
    nombres: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(60)]],
    apellidos: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    telefono: [''],
  });

  filteredUsuarios = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.selectedRole();
    let result = this.usuarios();
    if (role) {
      result = result.filter(u => u.roles.includes(role));
    }
    if (term) {
      result = result.filter(
        u =>
          u.fullName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }
    return result;
  });

  activeCount = computed(() => this.usuarios().filter(u => u.active).length);

  ngOnInit(): void {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    this.loading.set(true);
    this.pageError.set('');
    this.usuarioService.findAll().pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.usuarios.set(data);
      },
      error: (err) => this.pageError.set(this.requestError(err)),
    });
  }

  getInitials(fullName: string): string {
    return fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  avatarColor(id: number): string {
    const colors = [
      '#4f46e5', '#0891b2', '#059669', '#d97706',
      '#dc2626', '#7c3aed', '#db2777', '#2563eb',
      '#0d9488', '#9333ea', '#ca8a04', '#16a34a',
    ];
    return colors[id % colors.length];
  }

  roleBadgeClass(role: string): string {
    const cfg = ROLE_COLORS[role];
    return cfg ? `${cfg.bg} ${cfg.text}` : 'bg-primary-container/60 text-on-primary-container';
  }

  primaryRole(roles: string[]): string {
    const priority = ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE', 'ROLE_DUENIO'];
    for (const r of priority) {
      if (roles.includes(r)) return r;
    }
    return roles[0] || '';
  }

  roleDescription(role: string): string {
    const map: Record<string, string> = {
      ROLE_ADMIN: 'Acceso completo a configuraciones, finanzas y borrado de datos.',
      ROLE_VETERINARIO: 'Gesti\u00f3n de historiales, citas y recetas m\u00e9dicas.',
      ROLE_ASISTENTE: 'Limitado a agendamiento y datos b\u00e1sicos de clientes.',
      ROLE_DUENIO: 'Acceso solo a mascotas propias y citas asociadas.',
    };
    return map[role] || '';
  }

  rolePerms(role: string): { read: boolean; write: boolean; admin: boolean } {
    const map: Record<string, { read: boolean; write: boolean; admin: boolean }> = {
      ROLE_ADMIN: { read: true, write: true, admin: true },
      ROLE_VETERINARIO: { read: true, write: true, admin: false },
      ROLE_ASISTENTE: { read: true, write: false, admin: false },
      ROLE_DUENIO: { read: true, write: false, admin: false },
    };
    return map[role] || { read: false, write: false, admin: false };
  }

  toggleRole(role: string): void {
    if (this.saving()) return;
    this.selectedRoles.update(roles =>
      roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role]
    );
  }

  toggleEditRole(role: string): void {
    if (this.savingRoles()) return;
    this.editRolesSelected.update(roles =>
      roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role]
    );
  }

  openCreate(): void {
    if (this.saving()) return;
    this.editingUser.set(null);
    this.userForm.controls.nombres.setValidators([Validators.required, Validators.pattern(/\S/), Validators.maxLength(60)]);
    this.userForm.controls.apellidos.setValidators([Validators.required, Validators.pattern(/\S/), Validators.maxLength(60)]);
    this.userForm.controls.telefono.clearValidators();
    this.userForm.reset({ nombres: '', apellidos: '', email: '', telefono: '' });
    this.formRole.set('');
    this.selectedRoles.set([]);
    this.temporaryPassword.set('');
    this.submitError.set('');
    this.submitted = false;
    this.showForm.set(true);
  }

  openEdit(u: UsuarioResponse): void {
    if (this.saving()) return;
    this.editingUser.set(u);
    const [nombres, ...apellidos] = u.fullName.trim().split(/\s+/);
    this.userForm.controls.nombres.setValidators([Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]);
    this.userForm.controls.apellidos.setValidators([Validators.maxLength(120)]);
    this.userForm.controls.telefono.setValidators([Validators.required, Validators.pattern(/\S/), Validators.minLength(8), Validators.maxLength(20), Validators.pattern(/^[+\d\s-]+$/)]);
    this.userForm.reset({
      nombres,
      apellidos: apellidos.join(' '),
      email: u.email,
      telefono: (u as UsuarioResponse & { telefono?: string }).telefono || '',
    });
    this.selectedRoles.set([...u.roles]);
    this.formRole.set('');
    this.temporaryPassword.set('');
    this.submitError.set('');
    this.submitted = false;
    this.showForm.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
    this.editingUser.set(null);
    this.submitted = false;
    this.submitError.set('');
    this.temporaryPassword.set('');
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.temporaryPassword());
    this.copiedPassword = true;
    setTimeout(() => this.copiedPassword = false, 2000);
  }

  onSubmit(): void {
    if (this.saving()) return;
    this.submitted = true;
    this.submitError.set('');
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid) return;
    const user = this.editingUser();
    const role = this.formRole();
    if (user ? this.selectedRoles().length === 0 : !role) return;
    const formValue = this.userForm.value;
    const fullName = (formValue.nombres!.trim() + ' ' + formValue.apellidos!.trim()).trim();
    if (fullName.length > 120) {
      this.submitError.set('El nombre completo admite hasta 120 caracteres.');
      return;
    }
    this.saving.set(true);
    if (user) {
      const req = {
        fullName,
        email: formValue.email!,
        telefono: formValue.telefono!,
      };
      const roles = [...this.selectedRoles()];
      const rolesChanged = roles.length !== user.roles.length || roles.some(role => !user.roles.includes(role));
      let detailsSaved = false;
      defer(() => this.usuarioService.update(user.id, req)).pipe(
        take(1), switchMap(updated => {
          detailsSaved = true;
          return rolesChanged ? this.usuarioService.updateRoles(user.id, { roles }).pipe(take(1)) : of(updated);
        }), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeForm();
          this.loadUsuarios();
        },
        error: (err) => this.submitError.set((detailsSaved ? 'Los datos se guardaron, pero no los roles. ' : '') + this.requestError(err)),
      });
    } else {
      const roleStr = role.replace('ROLE_', '');
      defer(() => this.auth.createInternalUser({
        nombres: formValue.nombres!,
        apellidos: formValue.apellidos!,
        email: formValue.email!,
        rol: roleStr,
      })).pipe(take(1), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (resp) => {
          this.temporaryPassword.set(resp.temporaryPassword);
        },
        error: (err) => this.submitError.set(this.requestError(err)),
      });
    }
  }

  openRolesEditor(u: UsuarioResponse): void {
    if (this.savingRoles()) return;
    this.editRolesUser.set(u);
    this.editRolesSelected.set([...u.roles]);
    this.showRolesEditor.set(true);
    this.rolesError.set('');
  }

  closeRolesEditor(): void {
    if (!this.savingRoles()) this.showRolesEditor.set(false);
  }

  saveRoles(): void {
    const user = this.editRolesUser();
    if (!user || this.savingRoles()) return;
    this.rolesError.set('');
    if (this.editRolesSelected().length === 0) {
      this.rolesError.set('Seleccione al menos un rol.');
      return;
    }
    this.savingRoles.set(true);
    defer(() => this.usuarioService.updateRoles(user.id, { roles: [...this.editRolesSelected()] }))
      .pipe(take(1), finalize(() => this.savingRoles.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.showRolesEditor.set(false);
          this.editRolesUser.set(null);
          this.loadUsuarios();
        },
        error: (err) => this.rolesError.set(this.requestError(err)),
      });
  }

  confirmToggleActive(u: UsuarioResponse): void {
    this.confirmTitle.set(u.active ? 'Desactivar Usuario' : 'Activar Usuario');
    this.confirmMessage.set(`¿Estás seguro de ${u.active ? 'desactivar' : 'activar'} a ${u.fullName}?`);
    this.confirmAction.set(() => {
      this.toggleActive(u);
    });
    this.showConfirmDialog.set(true);
  }

  onConfirmAction(): void {
    this.confirmAction()?.();
    this.showConfirmDialog.set(false);
  }

  toggleActive(u: UsuarioResponse): void {
    this.usuarioService.toggleActive(u.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loadUsuarios(),
      error: (err) => this.pageError.set(this.requestError(err)),
    });
  }

  deleteUsuario(u: UsuarioResponse): void {
    if (confirm(`¿Eliminar usuario "${u.fullName}"? Esta acción no se puede deshacer.`)) {
      this.usuarioService.delete(u.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => this.loadUsuarios(),
        error: (err) => this.pageError.set(this.requestError(err)),
      });
    }
  }

  private requestError(err: { status?: number }): string {
    return err.status === 0 ? 'Sin conexion con el servidor. Los valores se conservan; reintente.'
      : err.status === 403 ? 'No tiene permiso para esta operacion (403). Los valores se conservan.'
      : 'No se pudo completar la operacion' + (err.status ? ` (${err.status})` : '') + '. Revise los datos y reintente; los valores se conservan.';
  }
}
