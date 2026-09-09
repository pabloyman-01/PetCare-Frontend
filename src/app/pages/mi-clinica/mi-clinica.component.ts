import { Component, OnInit, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClinicaService } from '../../core/services/clinica.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-mi-clinica',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoadingSpinnerComponent],
  template: `
  <div class="space-y-6 max-w-2xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Mi Cl&iacute;nica</h2>
        <p class="text-body-md text-on-surface-variant">Informaci&oacute;n p&uacute;blica de tu veterinaria</p>
      </div>
      @if (auth.user()?.clinica?.slug) {
        <a [routerLink]="['/c', auth.user()?.clinica?.slug]" target="_blank"
           class="btn btn-ghost">
          <span class="material-symbols-outlined text-[20px]">open_in_new</span>
          Ver p&aacute;gina p&uacute;blica
        </a>
      }
    </div>

    @if (loading()) {
      <app-loading-spinner message="Cargando cl&iacute;nica..." />
    } @else {
      <div class="glass-card rounded-2xl shadow-sm p-6">
        @if (errorMessage) {
          <div class="alert alert-error mb-4">
            <span class="material-symbols-outlined text-[20px] flex-shrink-0">error</span>
            <span>{{ errorMessage }}</span>
          </div>
        }
        @if (successMessage) {
          <div class="alert alert-info mb-4">
            <span class="material-symbols-outlined text-[20px] flex-shrink-0">check_circle</span>
            <span>{{ successMessage }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Nombre de la Veterinaria</label>
              <input type="text" formControlName="nombre" class="input input-bordered w-full"
                     placeholder="Mi Veterinaria" />
              @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
                <p class="text-error text-body-sm">El nombre es obligatorio</p>
              }
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Slug (link p&uacute;blico)</label>
              <input type="text" formControlName="slug" class="input input-bordered w-full"
                     placeholder="mi-veterinaria" />
              @if (form.get('slug')?.touched && form.get('slug')?.invalid) {
                <p class="text-error text-body-sm">Solo min&uacute;sculas, n&uacute;meros y guiones</p>
              }
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-label-sm font-semibold text-on-surface-variant">Direcci&oacute;n</label>
            <input type="text" formControlName="direccion" class="input input-bordered w-full"
                   placeholder="Av. Siempre Viva 123" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Tel&eacute;fono</label>
              <input type="tel" formControlName="telefono" class="input input-bordered w-full"
                     placeholder="+52 5551234567" />
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Horario de Atenci&oacute;n</label>
              <input type="text" formControlName="horarioAtencion" class="input input-bordered w-full"
                     placeholder="Lun a Vie 9:00 - 18:00" />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-label-sm font-semibold text-on-surface-variant">Descripci&oacute;n</label>
            <textarea formControlName="descripcion" rows="3" class="input input-bordered w-full resize-none"
                      placeholder="Breve descripci&oacute;n de tu veterinaria..."></textarea>
          </div>

          <div class="space-y-1.5">
            <label class="text-label-sm font-semibold text-on-surface-variant">Logo (URL)</label>
            <input type="url" formControlName="logoUrl" class="input input-bordered w-full"
                   placeholder="https://..." />
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
            <button type="submit" [disabled]="saving()" class="btn btn-primary" [class.btn-disabled]="saving()">
              @if (saving()) {
                <span class="loading loading-spinner"></span>
              }
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    }
  </div>
  `
})
export class MiClinicaComponent implements OnInit {
  auth = inject(AuthService);
  private clinica = inject(ClinicaService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    nombre: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    direccion: [''],
    telefono: [''],
    horarioAtencion: [''],
    descripcion: [''],
    logoUrl: [''],
  });

  ngOnInit(): void {
    this.clinica.getMyClinic().pipe(catchError(() => EMPTY)).subscribe({
      next: (c) => {
        this.form.patchValue({
          nombre: c.nombre,
          slug: c.slug,
          direccion: c.direccion ?? '',
          telefono: c.telefono ?? '',
          horarioAtencion: c.horarioAtencion ?? '',
          descripcion: c.descripcion ?? '',
          logoUrl: c.logoUrl ?? '',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage = '';
    this.successMessage = '';
    const v = this.form.value;

    this.clinica.updateMyClinic({
      nombre: v.nombre ?? '',
      slug: v.slug ?? '',
      direccion: v.direccion || undefined,
      telefono: v.telefono || undefined,
      horarioAtencion: v.horarioAtencion || undefined,
      descripcion: v.descripcion || undefined,
      logoUrl: v.logoUrl || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage = 'Cl&iacute;nica actualizada correctamente.';
        this.refreshSessionUser();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage = err.error?.message ?? 'No se pudo actualizar la cl&iacute;nica.';
      },
    });
  }

  private refreshSessionUser(): void {
    this.auth.me().pipe(catchError(() => EMPTY)).subscribe({
      next: (user) => this.auth.updateSessionUser(user),
    });
  }
}