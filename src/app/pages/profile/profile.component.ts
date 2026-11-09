import { Component, DestroyRef, OnInit, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DuenioService } from '../../core/services/duenio.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DuenioResponse, DuenioRequest } from '../../core/models/duenio.model';
import { defer, finalize, switchMap, take, throwError } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
  ],
  template: `
  <div class="space-y-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Mi Perfil</h2>
        <p class="text-body-md text-on-surface-variant">Información de tu cuenta</p>
      </div>
      @if (canEditProfile() && !editing() && !loading() && (!auth.isDuenioOnly() || duenioProfile())) {
        <button (click)="startEditing()"
                class="btn btn-primary">
          <span class="material-symbols-outlined text-[20px]">edit</span>
          Editar Perfil
        </button>
      }
    </div>

    @if (!canEditProfile()) {
      <p role="note" class="text-body-sm text-on-surface-variant">Perfil de solo lectura. Para modificar tus datos, contacta al administrador de la cl&iacute;nica.</p>
    }
    @if (loadError()) {
      <p role="alert" class="text-error">{{ loadError() }} <button type="button" class="underline" (click)="loadProfile()">Reintentar</button></p>
    }
    @if (submitError()) { <p role="alert" class="text-error">{{ submitError() }}</p> }
    @if (success()) { <p role="status" class="text-secondary">Perfil actualizado con los datos del servidor.</p> }
    @if (loading()) {
      <app-loading-spinner message="Cargando perfil..." />
    } @else {
      <!-- User Info Card -->
      <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
        <div class="bg-gradient-to-r from-primary to-secondary px-6 py-8">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-headline-md font-bold">
              {{ userInitials() }}
            </div>
            <div class="text-white">
              <h3 class="text-headline-md font-bold">{{ user()?.fullName }}</h3>
              <p class="text-body-md text-white/80">{{ user()?.email }}</p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-5">
          <div>
            <h4 class="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Roles</h4>
            <div class="flex flex-wrap gap-2">
              @for (rol of user()?.roles; track rol) {
                <span class="badge badge-primary badge-outline">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {{ roleLabel(rol) }}
                </span>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-label-sm text-on-surface-variant">Nombre Completo</p>
              <p class="text-body-md font-semibold text-on-surface">{{ user()?.fullName }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Email</p>
              <p class="text-body-md font-semibold text-on-surface">{{ user()?.email }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Teléfono</p>
              <p class="text-body-md font-semibold text-on-surface">{{ user()?.telefono || '—' }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Estado</p>
              @if (user()?.active) {
                <span class="badge badge-success badge-outline">
                  <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
                  Activo
                </span>
              } @else {
                <span class="badge badge-error badge-outline">
                  <span class="w-1.5 h-1.5 rounded-full bg-error"></span>
                  Inactivo
                </span>
              }
            </div>
          </div>

          <!-- Staff Link -->
          @if (!auth.isDuenioOnly()) {
            <div class="pt-4 border-t border-outline-variant/20">
              <p class="text-label-sm text-on-surface-variant mb-2">Perfil Profesional</p>
              <p class="text-body-md text-on-surface">
                @if (auth.isVeterinario()) {
                  Ver perfil de veterinario
                } @else if (auth.isAsistente()) {
                  Ver perfil de asistente
                } @else if (auth.isAdmin()) {
                  Administrador del sistema
                }
              </p>
            </div>
          }

          <!-- Duenio Profile -->
          @if (auth.isDuenioOnly() && duenioProfile()) {
            <div class="pt-4 border-t border-outline-variant/20">
              <h4 class="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Información de Dueño</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p class="text-label-sm text-on-surface-variant">Nombres</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ duenioProfile()!.nombres }} {{ duenioProfile()!.apellidos }}</p>
                </div>
                <div>
                  <p class="text-label-sm text-on-surface-variant">Documento</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ duenioProfile()!.tipoDocumento }} {{ duenioProfile()!.numeroDocumento }}</p>
                </div>
                <div>
                  <p class="text-label-sm text-on-surface-variant">Email</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ duenioProfile()!.email }}</p>
                </div>
                @if (duenioProfile()!.direccion) {
                  <div class="col-span-2">
                    <p class="text-label-sm text-on-surface-variant">Dirección</p>
                    <p class="text-body-md font-semibold text-on-surface">{{ duenioProfile()!.direccion }}</p>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Edit Form -->
      @if (editing() && canEditProfile()) {
        <div class="glass-card rounded-2xl shadow-sm p-6">
          <h3 class="text-title-md font-bold text-on-surface mb-5">Editar Perfil</h3>
          <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Nombre Completo</label>
               <input type="text" formControlName="fullName" placeholder="Nombre completo"
                      class="input input-bordered w-full" />
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Email</label>
               <input type="email" formControlName="email" placeholder="Email"
                      class="input input-bordered w-full" />
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Teléfono</label>
              <input type="tel" formControlName="telefono" placeholder="Teléfono"
                     class="input input-bordered w-full" />
            </div>

            @if (auth.isDuenioOnly() && duenioProfile()) {
              <div class="pt-4 border-t border-outline-variant/20">
                <h4 class="text-label-md font-semibold text-on-surface-variant mb-4">Datos de Dueño</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-label-sm font-semibold text-on-surface-variant">Dirección</label>
               <input type="text" formControlName="duenioDireccion" placeholder="Dirección"
                      class="input input-bordered w-full" />
                  </div>
                </div>
              </div>
            }

            @if (submitted && profileForm.invalid) {
              <p role="alert" class="text-error text-body-sm">Revise nombre (hasta 120 caracteres), email (hasta 120) y tel&eacute;fono obligatorio (8 a 20 caracteres; solo n&uacute;meros, espacios, + y guiones). La direcci&oacute;n admite hasta 180 caracteres.</p>
            }
            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="cancelEditing()" [disabled]="saving()"
                      class="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" [disabled]="saving()"
                      class="btn btn-primary" [class.btn-disabled]="saving()">
                @if (saving()) {
                  <span class="loading loading-spinner"></span>
                }
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      }
    }
  </div>
  `
})
export class ProfileComponent implements OnInit {
  protected auth = inject(AuthService);
  private duenioService = inject(DuenioService);
  private usuarioService = inject(UsuarioService);
  private fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  user = computed(() => this.auth.user());
  duenioProfile = signal<DuenioResponse | null>(null);
  loading = signal(true);
  editing = signal(false);
  saving = signal(false);
  loadError = signal('');
  submitError = signal('');
  success = signal(false);
  submitted = false;
  canEditProfile = computed(() => !!this.user() && !this.auth.isSaasOperator() && (this.auth.isDuenioOnly() || this.auth.isAdmin()));

  profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.required, Validators.pattern(/\S/), Validators.minLength(8), Validators.maxLength(20), Validators.pattern(/^[+\d\s-]+$/)]],
    duenioDireccion: ['', Validators.maxLength(180)],
  });

  userInitials = computed(() => {
    const name = this.user()?.fullName || '';
    const parts = name.split(' ');
    return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '').toUpperCase();
  });

  roleLabel(rol: string): string {
    const map: Record<string, string> = {
      ROLE_ADMIN: 'Administrador',
      ROLE_VETERINARIO: 'Veterinario',
      ROLE_ASISTENTE: 'Asistente',
      ROLE_DUENIO: 'Dueño de Mascota',
    };
    return map[rol] || rol;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.loadError.set('');
    const user = this.auth.user();
    if (!user) {
      this.loading.set(false);
      return;
    }
    if (this.auth.isDuenioOnly() && !this.auth.isSaasOperator()) {
      this.duenioService.findOwn().pipe(take(1), finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (data) => {
          if (this.auth.user()?.id === user.id) this.duenioProfile.set(data);
        },
        error: () => this.loadError.set('No se pudo cargar el perfil de dueno.'),
      });
    } else {
      this.loading.set(false);
    }
  }

  startEditing(): void {
    if (!this.canEditProfile() || this.loading() || this.saving() || (this.auth.isDuenioOnly() && !this.duenioProfile())) return;
    const user = this.user();
    const duenio = this.auth.isDuenioOnly() ? this.duenioProfile() : null;
    this.profileForm.patchValue({
      fullName: duenio ? `${duenio.nombres} ${duenio.apellidos}`.trim() : user?.fullName || '',
      email: duenio?.email || user?.email || '',
      telefono: duenio?.telefono || user?.telefono || '',
      duenioDireccion: duenio?.direccion || '',
    });
    this.editing.set(true);
    this.submitted = false;
    this.submitError.set('');
    this.success.set(false);
  }

  cancelEditing(): void {
    if (this.saving()) return;
    this.editing.set(false);
    this.submitError.set('');
  }

  onSubmit(): void {
    if (this.saving() || !this.editing() || !this.canEditProfile()) return;
    this.submitted = true;
    this.submitError.set('');
    this.success.set(false);
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;
    const user = this.auth.user();
    if (!user) return;
    const fv = this.profileForm.value;

    const parts = (fv.fullName || '').trim().split(/\s+/);
    const nombres = parts[0] || '';
    const apellidos = parts.slice(1).join(' ') || '';

    const duenio = this.duenioProfile();
    if (this.auth.isDuenioOnly() && duenio) {
      const unchangedName = fv.fullName!.trim() === `${duenio.nombres} ${duenio.apellidos}`.trim();
      const req: DuenioRequest = {
        nombres: unchangedName ? duenio.nombres : nombres,
        apellidos: unchangedName ? duenio.apellidos : apellidos,
        tipoDocumento: duenio.tipoDocumento,
        numeroDocumento: duenio.numeroDocumento,
        telefono: fv.telefono!,
        email: fv.email!,
        direccion: fv.duenioDireccion || undefined,
      };
      if (req.nombres.length > 80 || req.apellidos.length > 80) {
        this.submitError.set('Los nombres y apellidos del dueno admiten hasta 80 caracteres cada uno.');
        return;
      }
      let detailsSaved = false;
      this.saving.set(true);
      defer(() => this.duenioService.update(duenio.id, req)).pipe(
        take(1), switchMap(data => {
          if (this.auth.user()?.id !== user.id || data.id !== duenio.id) return throwError(() => ({ sessionChanged: true }));
          this.duenioProfile.set(data);
          detailsSaved = true;
          return this.auth.me().pipe(take(1));
        }), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (updated) => {
          const current = this.auth.user();
          if (!current || current.id !== user.id || updated.id !== user.id) {
            this.submitError.set('La sesion cambio. No se actualizo el perfil de la sesion actual.');
            return;
          }
          this.auth.updateSessionUser({ ...current, ...updated });
          this.editing.set(false);
          this.success.set(true);
        },
        error: (err) => this.submitError.set(err.sessionChanged ? 'La sesion cambio. No se actualizo el perfil de la sesion actual.'
          : (detailsSaved ? 'Los datos se guardaron, pero no se pudo actualizar la sesion. ' : '') + this.requestError(err)),
      });
    } else if (this.auth.isAdmin()) {
      const req = { fullName: fv.fullName!.trim(), email: fv.email!, telefono: fv.telefono! };
      this.saving.set(true);
      defer(() => this.usuarioService.update(user.id, req)).pipe(
        take(1), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (updated) => {
          const current = this.auth.user();
          if (!current || current.id !== user.id || updated.id !== user.id) {
            this.submitError.set('La sesion cambio. No se actualizo el perfil de la sesion actual.');
            return;
          }
          this.auth.updateSessionUser({ ...current, ...updated });
          this.editing.set(false);
          this.success.set(true);
        },
        error: (err) => this.submitError.set(this.requestError(err)),
      });
    }
  }

  private requestError(err: { status?: number }): string {
    return err.status === 0 ? 'Sin conexion con el servidor. Los valores se conservan; reintente.'
      : err.status === 403 ? 'No tiene permiso para esta operacion (403). Los valores se conservan.'
      : 'No se pudo completar la operacion' + (err.status ? ` (${err.status})` : '') + '. Revise los datos y reintente; los valores se conservan.';
  }
}
