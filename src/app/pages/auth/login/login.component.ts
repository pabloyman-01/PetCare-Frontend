import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
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
            <span class="material-symbols-outlined text-on-primary fill text-[32px]">pets</span>
          </div>
          <h1 class="text-display-lg-mobile md:text-display-lg text-primary font-extrabold mb-1">PetCare</h1>
          <p class="text-body-lg text-on-surface-variant">Gesti&oacute;n Veterinaria de Pr&oacute;xima Generaci&oacute;n</p>
        </div>

        <div class="glass_card rounded-3xl shadow-xl shadow-on-surface/5 p-8">
          <h2 class="text-headline-md font-bold text-on-surface mb-6">Iniciar Sesi&oacute;n</h2>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            @if (errorMessage) {
              <div class="alert alert-error mb-4">
                <span class="material-symbols-outlined text-[20px] flex-shrink-0">error</span>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <div class="space-y-5">
              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Correo Electr&oacute;nico</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
                  <input type="email" formControlName="email"
                         class="input input-bordered w-full pl-10"
                         placeholder="usuario@petcare.com">
                </div>
                @if (loginForm.get('email')?.touched && loginForm.get('email')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    Ingresa un correo v&aacute;lido
                  </p>
                }
              </div>

              <div>
                <label class="block text-label-md text-on-surface-variant mb-2">Contrase&ntilde;a</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                  <input [type]="showPassword ? 'text' : 'password'" formControlName="password"
                         class="input input-bordered w-full pl-10 pr-12"
                         placeholder="••••••••">
                  <button type="button" (click)="showPassword = !showPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
                  <p class="text-error text-body-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">warning</span>
                    La contrase&ntilde;a es requerida
                  </p>
                }
              </div>

              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" [(ngModel)]="rememberMe" [ngModelOptions]="{standalone: true}"
                         class="checkbox checkbox-primary">
                  <span class="text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Recordarme</span>
                </label>
              </div>

              <button type="submit" [disabled]="isLoading || loginForm.invalid"
                      class="btn btn-primary w-full">
                @if (isLoading) {
                  <span class="loading loading-spinner loading-sm"></span>
                  <span>Ingresando...</span>
                } @else {
                  <span class="material-symbols-outlined fill">login</span>
                  <span>Acceder al Panel</span>
                }
              </button>
            </div>
          </form>

          <div class="mt-6 pt-6 border-t border-outline-variant/30">
            <p class="text-center text-body-md text-on-surface-variant">
              &iquest;No tienes cuenta?
              <a routerLink="/auth/register" class="text-primary font-semibold hover:text-primary/80 transition-colors">
                Reg&iacute;strate aqu&iacute;
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
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  rememberMe = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.status === 401) {
          this.errorMessage = 'Correo o contrase&ntilde;a incorrectos';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexi&oacute;n.';
        } else {
          this.errorMessage = 'Error al iniciar sesi&oacute;n. Intenta nuevamente.';
        }
      }
    });
  }
}
