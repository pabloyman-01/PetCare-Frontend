import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Clinica } from '../../core/models/clinica.model';
import { formatPlanDate } from '../mi-plan/plan-date';

@Component({
  selector: 'app-register-clinic',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-clinic.component.html',
  styleUrl: './register-clinic.component.css'
})
export class RegisterClinicComponent {
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('registrationForm') private formElement?: ElementRef<HTMLFormElement>;
  @ViewChild('successTitle') set successTitle(element: ElementRef<HTMLHeadingElement> | undefined) {
    element?.nativeElement.focus();
  }
  @ViewChild('errorBox') set errorBox(element: ElementRef<HTMLDivElement> | undefined) {
    element?.nativeElement.focus();
  }

  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  registered = false;
  createdClinic: Clinica | null = null;
  readonly formatPlanDate = formatPlanDate;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.registerForm = this.fb.group({
      clinicaNombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120), Validators.pattern(/\S/)]],
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120), Validators.pattern(/\S/)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      telefono: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^\+?[\d\s-]+$/),
        (control: AbstractControl) => String(control.value || '').replace(/\D/g, '').length >= 8 ? null : { phoneDigits: true }]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      confirmPassword: ['', Validators.required]
    }, { validators: (group: AbstractControl) => {
      const password = group.get('password')?.value;
      const confirmation = group.get('confirmPassword')?.value;
      return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
    } });
  }

  invalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!control?.touched && (!!control.invalid || field === 'confirmPassword' && this.registerForm.hasError('passwordMismatch'));
  }

  onSubmit(): void {
    if (this.isLoading || this.registered) return;
    for (const field of ['clinicaNombre', 'fullName', 'email', 'telefono']) {
      const control = this.registerForm.get(field)!;
      control.setValue(control.value.trim(), { emitEvent: false });
    }
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      const field = Object.keys(this.registerForm.controls).find(name => this.invalid(name));
      this.formElement?.nativeElement.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
      return;
    }

    const { clinicaNombre, fullName, email, telefono, password } = this.registerForm.value;
    this.isLoading = true;
    this.errorMessage = '';
    this.auth.registerClinic({ fullName, email, telefono, password, clinicaNombre })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: response => {
          this.createdClinic = response.user.clinica ?? null;
          this.registered = true;
          this.isLoading = false;
          this.registerForm.reset();
          this.showPassword = false;
          this.showConfirmPassword = false;
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          if (err.status === 0) {
            this.errorMessage = 'No pudimos conectar con el servidor. Revisa tu conexi\u00f3n. Si ya se cre\u00f3 tu cuenta, puedes iniciar sesi\u00f3n.';
          } else if (typeof err.error?.message === 'string') {
            this.errorMessage = err.error.message;
          } else if (err.status === 409) {
            this.errorMessage = 'Ya existe una cuenta con estos datos. Revisa tu correo o inicia sesi\u00f3n.';
          } else if (err.status === 400) {
            this.errorMessage = 'Revisa los datos del formulario e intenta nuevamente.';
          } else {
            this.errorMessage = 'No pudimos crear la cl\u00ednica. Intenta nuevamente o inicia sesi\u00f3n si ya tienes una cuenta.';
          }
        }
      });
  }
}
