import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(error => {
      let message = 'Error inesperado';
      if (error.error?.message) message = error.error.message;
      else if (error.message) message = error.message;
      console.error(`[PetCare] ${error.status || 'Network'}: ${message}`);
      return throwError(() => error);
    })
  );
};
