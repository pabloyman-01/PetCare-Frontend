import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();

  const skipAuth = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'].some(p => req.url.includes(p));

  let authReq = req;
  if (token && !skipAuth) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !skipAuth) {
        try {
          return auth.refreshToken().pipe(
            switchMap(resp => {
              const newReq = req.clone({ setHeaders: { Authorization: `Bearer ${resp.accessToken}` } });
              return next(newReq);
            }),
            catchError(() => {
              auth.logout();
              router.navigate(['/auth']);
              return throwError(() => error);
            })
          );
        } catch {
          auth.logout();
          router.navigate(['/auth']);
        }
      }
      return throwError(() => error);
    })
  );
};
