import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/services/auth.service';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen bg-background text-on-background flex items-center justify-center p-4 md:p-8">
    <main class="w-full max-w-[480px]">
      <!-- Branding -->
      <div class="flex justify-center mb-8">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[40px]" style="font-variation-settings:'FILL' 1">pets</span>
          <span class="text-headline-md font-bold text-primary tracking-tight">PetCare</span>
        </div>
      </div>

      @if (expired) {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20 text-center">
          <span class="material-symbols-outlined text-6xl text-error mb-4">timer_off</span>
          <h1 class="text-headline-md font-bold text-on-surface mb-3">Enlace Expirado</h1>
          <p class="text-body-sm text-on-surface-variant mb-6">El enlace de activaci&oacute;n ha expirado. Contacta al administrador para generar uno nuevo.</p>
          <a routerLink="/auth" class="text-primary font-label-md hover:underline">Volver al inicio</a>
        </div>
      } @else if (success) {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20 text-center">
          <span class="material-symbols-outlined text-6xl text-secondary mb-4">check_circle</span>
          <h1 class="text-headline-md font-bold text-on-surface mb-3">Contrase&ntilde;a Establecida</h1>
          <p class="text-body-sm text-on-surface-variant mb-6">Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesi&oacute;n.</p>
          <a routerLink="/auth" class="inline-block px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 transition-all">Iniciar Sesi&oacute;n</a>
        </div>
      } @else {
        <!-- Password Card -->
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20">
          <header class="mb-8 text-center md:text-left">
            <h1 class="text-headline-md font-bold text-on-surface mb-3">Crea tu nueva contrase&ntilde;a</h1>
            <p class="text-body-sm text-on-surface-variant leading-relaxed">Hola, para completar tu registro en PetCare, por favor establece una contrase&ntilde;a segura para tu cuenta asociada a tu correo electr&oacute;nico.</p>
          </header>

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- New Password -->
            <div class="space-y-2">
              <label class="block font-label-md text-label-md text-on-surface">Nueva contrase&ntilde;a</label>
              <div class="relative">
                <input [(ngModel)]="password" name="password" [type]="showPassword ? 'text' : 'password'"
                       (input)="onPasswordChange()"
                       class="w-full h-14 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface outline-none" placeholder="••••••••" required />
                <button type="button" (click)="showPassword = !showPassword"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                  <span class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <!-- Strength Indicator -->
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Fuerza de la contrase&ntilde;a: <span class="font-bold" [class.text-error]="strength === 'Baja'" [class.text-tertiary]="strength === 'Media'" [class.text-secondary]="strength === 'Alta'">{{ strength }}</span></span>
              </div>
              <div class="flex gap-1 w-full h-1 bg-surface-container rounded-full overflow-hidden">
                <div class="flex-1 transition-all duration-300" [class.bg-error]="strength === 'Baja'" [class.bg-tertiary]="strength === 'Media'" [class.bg-secondary]="strength === 'Alta'" [class.bg-outline-variant]="strength === 'Ninguna'"></div>
                <div class="flex-1 transition-all duration-300" [class.bg-tertiary]="strength === 'Media'" [class.bg-secondary]="strength === 'Alta'" [class.bg-outline-variant]="strength !== 'Media' && strength !== 'Alta'"></div>
                <div class="flex-1 transition-all duration-300" [class.bg-secondary]="strength === 'Alta'" [class.bg-outline-variant]="strength !== 'Alta'"></div>
              </div>
              <ul class="grid grid-cols-1 gap-2 mt-4">
                <li class="flex items-center gap-2 font-label-sm text-label-sm" [class.text-secondary]="hasLength" [class.text-outline]="!hasLength">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span> M&iacute;nimo 8 caracteres
                </li>
                <li class="flex items-center gap-2 font-label-sm text-label-sm" [class.text-secondary]="hasUpper" [class.text-outline]="!hasUpper">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span> Una letra may&uacute;scula
                </li>
                <li class="flex items-center gap-2 font-label-sm text-label-sm" [class.text-secondary]="hasNumber" [class.text-outline]="!hasNumber">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span> Un n&uacute;mero
                </li>
              </ul>
            </div>

            <!-- Confirm Password -->
            <div class="space-y-2 pt-2">
              <label class="block font-label-md text-label-md text-on-surface">Confirmar contrase&ntilde;a</label>
              <div class="relative">
                <input [(ngModel)]="confirmPassword" name="confirmPassword" [type]="showConfirm ? 'text' : 'password'"
                       class="w-full h-14 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface outline-none" placeholder="••••••••" required />
                <button type="button" (click)="showConfirm = !showConfirm"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                  <span class="material-symbols-outlined">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (passwordMismatch) {
                <p class="font-label-sm text-label-sm text-error mt-1">Las contrase&ntilde;as no coinciden</p>
              }
            </div>

            @if (errorMsg) {
              <div class="p-4 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-3">
                <span class="material-symbols-outlined text-error">error</span>
                <p class="text-label-sm text-error font-semibold">{{ errorMsg }}</p>
              </div>
            }

            <!-- Submit -->
            <button type="submit" [disabled]="loading"
                    class="w-full h-14 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
              @if (loading) {
                <span class="loading loading-spinner"></span>
              }
              Establecer contrase&ntilde;a
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>
        </div>
      }

      <footer class="mt-8 text-center">
        <p class="text-body-sm text-outline">&copy; 2024 PetCare VMS. Gesti&oacute;n Profesional Veterinaria.</p>
      </footer>
    </main>
  </div>
  `
})
export class ActivateComponent implements OnInit {
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;
  loading = false;
  success = false;
  expired = false;
  errorMsg = '';
  strength = 'Ninguna';
  hasLength = false;
  hasUpper = false;
  hasNumber = false;
  passwordMismatch = false;

  private token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.expired = true;
    }
  }

  onPasswordChange(): void {
    const val = this.password;
    this.hasLength = val.length >= 8;
    this.hasUpper = /[A-Z]/.test(val);
    this.hasNumber = /[0-9]/.test(val);
    const score = [this.hasLength, this.hasUpper, this.hasNumber].filter(Boolean).length;
    this.strength = val.length === 0 ? 'Ninguna' : score <= 1 ? 'Baja' : score === 2 ? 'Media' : 'Alta';
  }

  onSubmit(): void {
    this.passwordMismatch = false;
    this.errorMsg = '';

    if (this.password !== this.confirmPassword) {
      this.passwordMismatch = true;
      return;
    }

    if (this.strength === 'Ninguna' || this.strength === 'Baja') {
      this.errorMsg = 'La contraseña debe cumplir los requisitos de seguridad.';
      return;
    }

    this.loading = true;
    this.http.post(`${API_URL}/auth/activate/${this.token}`, null, {
      params: { password: this.password }
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 400) {
          if (err.error?.message?.includes('expirado')) {
            this.expired = true;
          } else {
            this.errorMsg = err.error?.message || 'Error al activar la cuenta.';
          }
        } else {
          this.errorMsg = 'Error al activar la cuenta. Intenta de nuevo.';
        }
      },
    });
  }
}
