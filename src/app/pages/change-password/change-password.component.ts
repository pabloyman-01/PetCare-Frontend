import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  if (confirmPassword?.hasError('passwordMismatch')) confirmPassword.setErrors(null);
  return null;
};

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center relative overflow-auto">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-container/20 via-surface to-secondary-fixed/30"></div>
      <div class="absolute inset-0 opacity-40" style="
        background-image: 
          radial-gradient(at 40% 20%, rgba(37, 99, 235, 0.15) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(108, 248, 187, 0.2) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(180, 197, 255, 0.15) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(255, 219, 205, 0.15) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(212, 233, 254, 0.2) 0px, transparent 50%),
          radial-gradient(at 80% 100%, rgba(37, 99, 235, 0.1) 0px, transparent 50%);
      "></div>

      <div class="relative z-10 w-full max-w-md px-4">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-xl shadow-primary/30 mb-4">
            <span class="material-symbols-outlined text-on-primary fill text-[32px]">lock_reset</span>
          </div>
          <h1 class="text-display-lg-mobile md:text-display-lg text-primary font-extrabold mb-1">Cambiar Contrase&ntilde;a</h1>
          <p class="text-body-lg text-on-surface-variant">Es tu primer inicio de sesi&oacute;n. Debes cambiar tu contrase&ntilde;a temporal.</p>
        </div>

        <div class="glass_card rounded-3xl shadow-xl shadow-on-surface/5 p-8">
          <h2 class="text-headline-md font-bold text-on-surface mb-6">Nueva Contrase&ntilde;a</h2>

          <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
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

            <div class="space-y-5">
              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Contrase&ntilde;a Actual (Temporal)</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                  <input [type]="showCurrentPassword ? 'text' : 'password'" formControlName="currentPassword"
                         class="input input-bordered w-full pl-10 pr-12"
                         placeholder="Ingresa tu contrase&ntilde;a temporal">
                  <button type="button" (click)="showCurrentPassword = !showCurrentPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined">{{ showCurrentPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (passwordForm.get('currentPassword')?.touched && passwordForm.get('currentPassword')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    La contrase&ntilde;a actual es requerida
                  </p>
                }
              </div>

              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Nueva Contrase&ntilde;a</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                  <input [type]="showNewPassword ? 'text' : 'password'" formControlName="newPassword"
                         class="input input-bordered w-full pl-10 pr-12"
                         placeholder="Ingresa tu nueva contrase&ntilde;a">
                  <button type="button" (click)="showNewPassword = !showNewPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined">{{ showNewPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (passwordForm.get('newPassword')?.touched && passwordForm.get('newPassword')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    M&iacute;nimo 8 caracteres, una may&uacute;scula, una min&uacute;scula, un n&uacute;mero y un car&aacute;cter especial
                  </p>
                }
              </div>

              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Confirmar Contrase&ntilde;a</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                  <input [type]="showConfirmPassword ? 'text' : 'password'" formControlName="confirmPassword"
                         class="input input-bordered w-full pl-10 pr-12"
                         placeholder="Confirma tu nueva contrase&ntilde;a">
                  <button type="button" (click)="showConfirmPassword = !showConfirmPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (passwordForm.get('confirmPassword')?.touched && passwordForm.get('confirmPassword')?.errors) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    @if (passwordForm.get('confirmPassword')?.errors?.['passwordMismatch']) {
                      Las contrase&ntilde;as no coinciden
                    } @else {
                      La confirmaci&oacute;n es requerida
                    }
                  </p>
                }
              </div>

              <div class="pt-2">
                <h3 class="text-label-md text-on-surface-variant mb-3">Requisitos de la contrase&ntilde;a:</h3>
                <div class="grid grid-cols-1 gap-2">
                  <div class="flex items-center gap-2" [class]="hasMinLength ? 'text-success' : 'text-on-surface-variant'">
                    <span class="material-symbols-outlined text-[18px]">{{ hasMinLength ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span class="text-body-sm">M&iacute;nimo 8 caracteres</span>
                  </div>
                  <div class="flex items-center gap-2" [class]="hasUpperCase ? 'text-success' : 'text-on-surface-variant'">
                    <span class="material-symbols-outlined text-[18px]">{{ hasUpperCase ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span class="text-body-sm">Una may&uacute;scula</span>
                  </div>
                  <div class="flex items-center gap-2" [class]="hasLowerCase ? 'text-success' : 'text-on-surface-variant'">
                    <span class="material-symbols-outlined text-[18px]">{{ hasLowerCase ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span class="text-body-sm">Una min&uacute;scula</span>
                  </div>
                  <div class="flex items-center gap-2" [class]="hasNumber ? 'text-success' : 'text-on-surface-variant'">
                    <span class="material-symbols-outlined text-[18px]">{{ hasNumber ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span class="text-body-sm">Un n&uacute;mero</span>
                  </div>
                  <div class="flex items-center gap-2" [class]="hasSpecial ? 'text-success' : 'text-on-surface-variant'">
                    <span class="material-symbols-outlined text-[18px]">{{ hasSpecial ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span class="text-body-sm">Un car&aacute;cter especial (!&#64;&#35;425;425;etc.)</span>
                  </div>
                  <div class="flex items-center gap-2" [class]="passwordsMatch ? 'text-success' : 'text-on-surface-variant'">
                    <span class="material-symbols-outlined text-[18px]">{{ passwordsMatch ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span class="text-body-sm">Las contrase&ntilde;as coinciden</span>
                  </div>
                </div>
              </div>

              <button type="submit" [disabled]="isLoading || passwordForm.invalid"
                      class="btn btn-primary w-full">
                @if (isLoading) {
                  <span class="loading loading-spinner loading-sm"></span>
                  <span>Cambiando contrase&ntilde;a...</span>
                } @else {
                  <span class="material-symbols-outlined fill">lock_reset</span>
                  <span>Cambiar Contrase&ntilde;a</span>
                }
              </button>
            </div>
          </form>
        </div>

        <p class="text-center mt-6 text-body-sm text-on-surface-variant/60">
          &copy; 2026 PetCare. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `
})
export class ChangePasswordComponent {
  passwordForm: FormGroup;
  isLoading = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';

  hasMinLength = false;
  hasUpperCase = false;
  hasLowerCase = false;
  hasNumber = false;
  hasSpecial = false;
  passwordsMatch = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });

    this.passwordForm.get('newPassword')?.valueChanges.subscribe(() => this.checkPasswordRules());
    this.passwordForm.get('confirmPassword')?.valueChanges.subscribe(() => this.checkPasswordRules());
  }

  checkPasswordRules(): void {
    const password = this.passwordForm.get('newPassword')?.value || '';
    const confirmPassword = this.passwordForm.get('confirmPassword')?.value || '';

    this.hasMinLength = password.length >= 8;
    this.hasUpperCase = /[A-Z]/.test(password);
    this.hasLowerCase = /[a-z]/.test(password);
    this.hasNumber = /[0-9]/.test(password);
    this.hasSpecial = /[^a-zA-Z0-9]/.test(password);
    this.passwordsMatch = password.length > 0 && password === confirmPassword;
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: (resp) => {
        this.successMessage = resp.message;
        const user = this.auth.user();
        if (user) {
          this.auth.updateSessionUser({ ...user, forcePasswordChange: false });
        }
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.status === 401) {
          this.errorMessage = 'La contrase&ntilde;a actual es incorrecta.';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor.';
        } else {
          this.errorMessage = 'Error al cambiar la contrase&ntilde;a. Intenta nuevamente.';
        }
      }
    });
  }
}
