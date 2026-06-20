import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DuenioService } from '../../core/services/duenio.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DuenioResponse, DuenioRequest } from '../../core/models/duenio.model';
import { catchError, EMPTY } from 'rxjs';

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
      @if (!editing()) {
        <button (click)="startEditing()"
                class="btn btn-primary">
          <span class="material-symbols-outlined text-[20px]">edit</span>
          Editar Perfil
        </button>
      }
    </div>

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
          @if (!auth.isDuenioOnly() && !auth.isDuenio()) {
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
          @if (auth.isDuenio() && duenioProfile()) {
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
                  <p class="text-label-sm text-on-surface-variant">Teléfono</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ duenioProfile()!.telefono }}</p>
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
      @if (editing()) {
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

            @if (auth.isDuenio() && duenioProfile()) {
              <div class="pt-4 border-t border-outline-variant/20">
                <h4 class="text-label-md font-semibold text-on-surface-variant mb-4">Datos de Dueño</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-label-sm font-semibold text-on-surface-variant">Nombres</label>
               <input type="text" formControlName="duenioNombres" placeholder="Nombres"
                      class="input input-bordered w-full" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-label-sm font-semibold text-on-surface-variant">Apellidos</label>
               <input type="text" formControlName="duenioApellidos" placeholder="Apellidos"
                      class="input input-bordered w-full" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-label-sm font-semibold text-on-surface-variant">Teléfono</label>
               <input type="text" formControlName="duenioTelefono" placeholder="Teléfono"
                      class="input input-bordered w-full" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-label-sm font-semibold text-on-surface-variant">Dirección</label>
               <input type="text" formControlName="duenioDireccion" placeholder="Dirección"
                      class="input input-bordered w-full" />
                  </div>
                </div>
              </div>
            }

            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="cancelEditing()"
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
  private fb = inject(FormBuilder);

  user = computed(() => this.auth.user());
  duenioProfile = signal<DuenioResponse | null>(null);
  loading = signal(true);
  editing = signal(false);
  saving = signal(false);

  profileForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    duenioNombres: [''],
    duenioApellidos: [''],
    duenioTelefono: [''],
    duenioDireccion: [''],
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
    this.loading.set(true);
    const user = this.auth.user();
    if (!user) {
      this.loading.set(false);
      return;
    }
    if (this.auth.isDuenio()) {
      this.duenioService.findOwn().pipe(catchError(() => EMPTY)).subscribe({
        next: (data) => {
          this.duenioProfile.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  startEditing(): void {
    const user = this.user();
    const duenio = this.duenioProfile();
    this.profileForm.patchValue({
      fullName: user?.fullName || '',
      email: user?.email || '',
      duenioNombres: duenio?.nombres || '',
      duenioApellidos: duenio?.apellidos || '',
      duenioTelefono: duenio?.telefono || '',
      duenioDireccion: duenio?.direccion || '',
    });
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
  }

  onSubmit(): void {
    this.saving.set(true);

    if (this.auth.isDuenio() && this.duenioProfile()) {
      const fv = this.profileForm.value;
      const req: DuenioRequest = {
        nombres: fv.duenioNombres || this.duenioProfile()!.nombres,
        apellidos: fv.duenioApellidos || this.duenioProfile()!.apellidos,
        tipoDocumento: this.duenioProfile()!.tipoDocumento,
        numeroDocumento: this.duenioProfile()!.numeroDocumento,
        telefono: fv.duenioTelefono || this.duenioProfile()!.telefono,
        email: fv.email || this.duenioProfile()!.email,
        direccion: fv.duenioDireccion || undefined,
      };

      this.duenioService.update(this.duenioProfile()!.id, req).pipe(catchError(() => EMPTY)).subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(false);
          this.duenioService.findOwn().pipe(catchError(() => EMPTY)).subscribe({
            next: (data) => this.duenioProfile.set(data),
          });
        },
        error: () => this.saving.set(false),
      });
    } else {
      setTimeout(() => {
        this.saving.set(false);
        this.editing.set(false);
      }, 500);
    }
  }
}
