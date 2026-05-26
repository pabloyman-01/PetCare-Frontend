import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, of } from 'rxjs';
import { Router } from '@angular/router';
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  AuthResponse,
  UserSession,
  UserResponse
} from '../models/auth.model';

export const API_URL = 'http://localhost:8090/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'petcare_access_token';
  private readonly REFRESH_KEY = 'petcare_refresh_token';
  private readonly USER_KEY = 'petcare_user';

  private _session = signal<UserSession | null>(null);
  session = this._session.asReadonly();
  isAuthenticated = computed(() => !!this._session());
  user = computed(() => this._session()?.user ?? null);
  roles = computed(() => this._session()?.user?.roles ?? []);

  isAdmin = computed(() => this.roles().includes('ROLE_ADMIN'));
  isVeterinario = computed(() => this.roles().includes('ROLE_VETERINARIO'));
  isAsistente = computed(() => this.roles().includes('ROLE_ASISTENTE'));
  isDuenio = computed(() => this.roles().includes('ROLE_DUENIO'));
  isDuenioOnly = computed(() => this.isDuenio() && !this.isAdmin() && !this.isVeterinario() && !this.isAsistente());

  constructor(private http: HttpClient, private router: Router) {
    this.loadSession();
  }

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, req).pipe(
      tap(resp => this.setSession(resp))
    );
  }

  register(req: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/register`, req).pipe(
      tap(resp => this.setSession(resp))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (!refreshToken) {
      this.logout();
      throw new Error('No refresh token available');
    }
    return this.http.post<AuthResponse>(`${API_URL}/auth/refresh`, { refreshToken } as RefreshTokenRequest).pipe(
      tap(resp => this.setSession(resp))
    );
  }

  me(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${API_URL}/auth/me`);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._session.set(null);
    this.router.navigate(['/auth']);
  }

  getAccessToken(): string | null {
    return this._session()?.accessToken ?? localStorage.getItem(this.TOKEN_KEY);
  }

  setSession(resp: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, resp.accessToken);
    localStorage.setItem(this.REFRESH_KEY, resp.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(resp.user));
    this._session.set({
      accessToken: resp.accessToken,
      refreshToken: resp.refreshToken,
      expiresInSeconds: resp.expiresInSeconds,
      user: resp.user
    });
  }

  createInternalUser(data: { nombres: string; apellidos: string; email: string; rol: string }): Observable<{ message: string; activationToken: string }> {
    return this.http.post<{ message: string; activationToken: string }>(`${API_URL}/usuarios/internal`, data);
  }

  private loadSession(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    const refresh = localStorage.getItem(this.REFRESH_KEY);
    if (token && userStr && refresh) {
      try {
        const user = JSON.parse(userStr) as UserResponse;
        this._session.set({ accessToken: token, refreshToken: refresh, expiresInSeconds: 0, user });
      } catch {
        this.logout();
      }
    }
  }
}
