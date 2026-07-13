import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  if (confirmPassword?.hasError('passwordMismatch')) {
    confirmPassword.setErrors(null);
  }
  return null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center relative overflow-auto py-8">
      <div class="absolute inset-0 bg-gradient-to-br from-secondary-fixed/20 via-surface to-primary-container/20"></div>
      <div class="absolute inset-0 opacity-40" style="
        background-image: 
          radial-gradient(at 20% 30%, rgba(108, 248, 187, 0.2) 0px, transparent 50%),
          radial-gradient(at 90% 20%, rgba(37, 99, 235, 0.15) 0px, transparent 50%),
          radial-gradient(at 10% 80%, rgba(180, 197, 255, 0.2) 0px, transparent 50%),
          radial-gradient(at 70% 70%, rgba(255, 219, 205, 0.15) 0px, transparent 50%);
      "></div>

      <div class="relative z-10 w-full max-w-md px-4">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-secondary rounded-2xl shadow-xl shadow-secondary/20 mb-3">
            <span class="material-symbols-outlined text-on-secondary fill text-[28px]">pets</span>
          </div>
          <h1 class="text-headline-lg-mobile md:text-headline-lg text-primary font-extrabold mb-1">PetCare</h1>
          <p class="text-body-lg text-on-surface-variant">Crea tu cuenta veterinaria</p>
        </div>

        <div class="glass_card rounded-3xl shadow-xl shadow-on-surface/5 p-8">
          <h2 class="text-headline-md font-bold text-on-surface mb-6">Crear Cuenta</h2>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            @if (errorMessage) {
              <div class="alert alert-error mb-4">
                <span class="material-symbols-outlined text-[20px] flex-shrink-0">error</span>
                <span>{{ errorMessage }}</span>
              </div>
            }

            @if (successMessage) {
              <div class="alert alert-success mb-4">
                <span class="material-symbols-outlined text-[20px] flex-shrink-0">check_circle</span>
                <span>{{ successMessage }}</span>
              </div>
            }

            <div class="space-y-4">
              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Nombre Completo</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
                  <input type="text" formControlName="fullName"
                         class="input input-bordered w-full pl-10"
                         placeholder="María García López">
                </div>
                @if (registerForm.get('fullName')?.touched && registerForm.get('fullName')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    Ingresa tu nombre completo
                  </p>
                }
              </div>

              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Correo Electr&oacute;nico</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
                  <input type="email" formControlName="email"
                         class="input input-bordered w-full pl-10"
                         placeholder="usuario@petcare.com">
                </div>
                @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    Ingresa un correo v&aacute;lido
                  </p>
                }
              </div>

              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">N&uacute;mero de Tel&eacute;fono</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">call</span>
                  <input type="tel" formControlName="telefono"
                         class="input input-bordered w-full pl-10"
                         placeholder="Ej: +52 5551234567">
                </div>
                @if (registerForm.get('telefono')?.touched && registerForm.get('telefono')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    {{ registerForm.get('telefono')?.hasError('required') ? 'El n&uacute;mero de tel&eacute;fono es obligatorio.' : 'N&uacute;mero de tel&eacute;fono inv&aacute;lido.' }}
                  </p>
                }
              </div>

              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Contrase&ntilde;a</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                  <input [type]="showPassword ? 'text' : 'password'" formControlName="password"
                         class="input input-bordered w-full pl-10 pr-12"
                         placeholder="M&iacute;nimo 6 caracteres">
                  <button type="button" (click)="showPassword = !showPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    M&iacute;nimo 6 caracteres
                  </p>
                }
              </div>

              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Confirmar Contrase&ntilde;a</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                  <input [type]="showConfirmPassword ? 'text' : 'password'" formControlName="confirmPassword"
                         class="input input-bordered w-full pl-10 pr-12"
                         placeholder="Repite tu contrase&ntilde;a">
                  <button type="button" (click)="showConfirmPassword = !showConfirmPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (registerForm.get('confirmPassword')?.touched && registerForm.get('confirmPassword')?.hasError('required')) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    Confirma tu contrase&ntilde;a
                  </p>
                }
                @if (registerForm.get('confirmPassword')?.touched && registerForm.hasError('passwordMismatch')) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    Las contrase&ntilde;as no coinciden
                  </p>
                }
              </div>

              <button type="submit" [disabled]="isLoading || registerForm.invalid"
                      class="btn btn-secondary w-full">
                @if (isLoading) {
                  <span class="loading loading-spinner loading-sm"></span>
                  <span>Creando cuenta...</span>
                } @else {
                  <span class="material-symbols-outlined">person_add</span>
                  <span>Crear Cuenta</span>
                }
              </button>
            </div>
          </form>

          <div class="mt-6 pt-6 border-t border-outline-variant/30">
            <p class="text-center text-body-md text-on-surface-variant">
              &iquest;Ya tienes cuenta?
              <a routerLink="/auth" class="text-primary font-semibold hover:text-primary/80 transition-colors">
                Inicia sesi&oacute;n
              </a>
            </p>
          </div>
        </div>

        <p class="text-center mt-6 text-body-sm text-on-surface-variant/60">
          &copy; 2026 PetCare. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20), Validators.pattern(/^[+\d\s-]+$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { fullName, email, telefono, password } = this.registerForm.value;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.register({ fullName, email, telefono, password }).subscribe({
      next: () => {
        this.successMessage = 'Cuenta creada exitosamente. Redirigiendo...';
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.status === 400 || err.status === 409) {
          this.errorMessage = 'Este correo ya est&aacute; registrado';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor';
        } else {
          this.errorMessage = 'Error al crear la cuenta. Intenta nuevamente.';
        }
      }
    });
  }
}
