import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  readonly clinicSlug: string | null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    route: ActivatedRoute
  ) {
    this.clinicSlug = route.snapshot.queryParamMap.get('clinica')?.trim() || null;
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.isLoading) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login({ email: email.trim(), password }).subscribe({
      next: () => {
        if (this.auth.mustChangePassword()) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Correo o contrase\u00f1a incorrectos. Revisa tus datos e intenta otra vez.';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexi\u00f3n.';
        } else if (typeof err.error?.message === 'string') {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'No pudimos iniciar sesi\u00f3n. Intenta nuevamente.';
        }
      }
    });
  }
}
