import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/services/auth.service';
import { lastValueFrom } from 'rxjs';

type ActivateState = 'LOADING' | 'FORM' | 'SUCCESS' | 'EXPIRED' | 'INVALID' | 'ALREADY_ACTIVE';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen bg-background text-on-background flex items-center justify-center p-4 md:p-8">
    <main class="w-full max-w-[480px]">
      <div class="flex justify-center mb-8">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[40px]" style="font-variation-settings:'FILL' 1">pets</span>
          <span class="text-headline-md font-bold text-primary tracking-tight">PetCare</span>
        </div>
      </div>

      @if (state === 'LOADING') {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20 text-center">
          <span class="loading loading-spinner loading-lg text-primary mb-4 inline-block"></span>
          <p class="text-body-sm text-on-surface-variant">Validando enlace de activaci&oacute;n...</p>
        </div>
      }

      @if (state === 'SUCCESS') {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20 text-center">
          <div class="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined text-4xl text-secondary" style="font-variation-settings:'FILL' 1">check_circle</span>
          </div>
          <h1 class="text-headline-md font-bold text-on-surface mb-3">Cuenta Activada</h1>
          <p class="text-body-sm text-on-surface-variant leading-relaxed mb-8">
            Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesi&oacute;n utilizando tu correo electr&oacute;nico y la contrase&ntilde;a que acabas de crear.
          </p>
          <a routerLink="/auth"
             class="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
            Ir al Inicio de Sesi&oacute;n
            <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
          </a>
        </div>
      }

      @if (state === 'EXPIRED') {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20 text-center">
          <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined text-4xl text-error" style="font-variation-settings:'FILL' 1">timer_off</span>
          </div>
          <h1 class="text-headline-md font-bold text-on-surface mb-3">Enlace Expirado</h1>
          <p class="text-body-sm text-on-surface-variant leading-relaxed">
            El enlace de activaci&oacute;n ha expirado. Solicita al administrador que reenv&iacute;e una nueva invitaci&oacute;n.
          </p>
        </div>
      }

      @if (state === 'INVALID') {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20 text-center">
          <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined text-4xl text-error" style="font-variation-settings:'FILL' 1">link_off</span>
          </div>
          <h1 class="text-headline-md font-bold text-on-surface mb-3">Enlace Inv&aacute;lido</h1>
          <p class="text-body-sm text-on-surface-variant leading-relaxed">
            El enlace de activaci&oacute;n no es v&aacute;lido o ya no existe.
          </p>
        </div>
      }

      @if (state === 'ALREADY_ACTIVE') {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20 text-center">
          <div class="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined text-4xl text-secondary" style="font-variation-settings:'FILL' 1">check_circle</span>
          </div>
          <h1 class="text-headline-md font-bold text-on-surface mb-3">Cuenta ya Activada</h1>
          <p class="text-body-sm text-on-surface-variant leading-relaxed mb-8">
            Esta cuenta ya fue activada anteriormente. Puedes iniciar sesi&oacute;n normalmente.
          </p>
          <a routerLink="/auth"
             class="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
            Ir al Inicio de Sesi&oacute;n
            <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
          </a>
        </div>
      }

      @if (state === 'FORM') {
        <div class="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-md border border-outline-variant/20">
          <header class="mb-8 text-center">
            <h1 class="text-headline-md font-bold text-on-surface mb-3">Activar Cuenta</h1>
            <p class="text-body-sm text-on-surface-variant leading-relaxed">
              Bienvenido{{ userName ? ', ' + userName : '' }}. Para completar tu registro crea una contrase&ntilde;a segura.
            </p>
          </header>

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            <div class="space-y-2">
              <label class="block font-label-md text-label-md text-on-surface">Nueva contrase&ntilde;a</label>
              <div class="relative">
                <input [(ngModel)]="password" name="password" [type]="showPassword ? 'text' : 'password'"
                       (input)="onPasswordChange()"
                       class="w-full h-14 px-4 pr-12 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface outline-none"
                       placeholder="••••••••" autocomplete="new-password" required />
                <button type="button" (click)="showPassword = !showPassword"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                  <span class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block font-label-md text-label-md text-on-surface">Confirmar contrase&ntilde;a</label>
              <div class="relative">
                <input [(ngModel)]="confirmPassword" name="confirmPassword" [type]="showConfirm ? 'text' : 'password'"
                       (input)="onPasswordChange()"
                       class="w-full h-14 px-4 pr-12 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface outline-none"
                       placeholder="••••••••" autocomplete="new-password" required />
                <button type="button" (click)="showConfirm = !showConfirm"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                  <span class="material-symbols-outlined">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <ul class="space-y-2">
              <li class="flex items-center gap-2 font-label-sm text-label-sm"
                  [class.text-secondary]="hasLength" [class.text-outline]="!hasLength">
                <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">{{ hasLength ? 'check_circle' : 'radio_button_unchecked' }}</span>
                M&iacute;nimo 8 caracteres
              </li>
              <li class="flex items-center gap-2 font-label-sm text-label-sm"
                  [class.text-secondary]="hasUpper" [class.text-outline]="!hasUpper">
                <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">{{ hasUpper ? 'check_circle' : 'radio_button_unchecked' }}</span>
                Al menos una letra may&uacute;scula
              </li>
              <li class="flex items-center gap-2 font-label-sm text-label-sm"
                  [class.text-secondary]="hasLower" [class.text-outline]="!hasLower">
                <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">{{ hasLower ? 'check_circle' : 'radio_button_unchecked' }}</span>
                Al menos una letra min&uacute;scula
              </li>
              <li class="flex items-center gap-2 font-label-sm text-label-sm"
                  [class.text-secondary]="hasNumber" [class.text-outline]="!hasNumber">
                <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">{{ hasNumber ? 'check_circle' : 'radio_button_unchecked' }}</span>
                Al menos un n&uacute;mero
              </li>
              <li class="flex items-center gap-2 font-label-sm text-label-sm"
                  [class.text-secondary]="passwordsMatch" [class.text-error]="!passwordsMatch && confirmPassword.length > 0"
                  [class.text-outline]="!passwordsMatch && confirmPassword.length === 0">
                <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">{{ passwordsMatch ? 'check_circle' : 'radio_button_unchecked' }}</span>
                Las contrase&ntilde;as coinciden
              </li>
            </ul>

            @if (errorMsg) {
              <div class="p-4 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-3">
                <span class="material-symbols-outlined text-error">error</span>
                <p class="text-label-sm text-error font-semibold">{{ errorMsg }}</p>
              </div>
            }

            <button type="submit" [disabled]="loading || !formValid"
                    class="w-full h-14 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              @if (loading) {
                <span class="loading loading-spinner loading-sm"></span>
              } @else {
                Activar Cuenta
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              }
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
  state: ActivateState = 'LOADING';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;
  loading = false;
  errorMsg = '';
  userName = '';

  hasLength = false;
  hasUpper = false;
  hasLower = false;
  hasNumber = false;
  passwordsMatch = false;

  private token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.queryParamMap.get('token') || this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.state = 'INVALID';
      return;
    }
    await this.validateToken();
  }

  get formValid(): boolean {
    return this.hasLength && this.hasUpper && this.hasLower && this.hasNumber && this.passwordsMatch;
  }

  onPasswordChange(): void {
    const val = this.password;
    this.hasLength = val.length >= 8;
    this.hasUpper = /[A-Z]/.test(val);
    this.hasLower = /[a-z]/.test(val);
    this.hasNumber = /[0-9]/.test(val);
    this.passwordsMatch = val.length > 0 && val === this.confirmPassword;
  }

  private async validateToken(): Promise<void> {
    try {
      const res: any = await lastValueFrom(
        this.http.get(`${API_URL}/auth/activate-account`, { params: { token: this.token } })
      );
      if (res.valid) {
        this.userName = res.nombre || '';
        this.state = 'FORM';
      } else {
        switch (res.reason) {
          case 'EXPIRED_TOKEN':
            this.state = 'EXPIRED';
            break;
          case 'ALREADY_ACTIVE':
            this.state = 'ALREADY_ACTIVE';
            break;
          default:
            this.state = 'INVALID';
        }
      }
    } catch {
      this.state = 'INVALID';
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMsg = '';

    if (!this.formValid) {
      this.errorMsg = 'La contraseña debe cumplir todos los requisitos de seguridad.';
      return;
    }

    this.loading = true;
    try {
      await lastValueFrom(
        this.http.post(`${API_URL}/auth/set-password`, {
          token: this.token,
          password: this.password
        })
      );
      this.loading = false;
      this.state = 'SUCCESS';
    } catch (err: any) {
      this.loading = false;
      if (err.status === 400) {
        const msg = err.error?.message || '';
        if (msg.includes('expirado')) {
          this.state = 'EXPIRED';
        } else if (msg.includes('activa') || msg.includes('activo')) {
          this.state = 'ALREADY_ACTIVE';
        } else {
          this.errorMsg = msg || 'Error al activar la cuenta.';
        }
      } else {
        this.errorMsg = 'Error al activar la cuenta. Intenta de nuevo.';
      }
    }
  }
}
