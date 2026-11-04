import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) return this.router.parseUrl('/auth');
    if (this.auth.mustChangePassword() && route.routeConfig?.path !== 'change-password') {
      return this.router.parseUrl('/change-password');
    }
    return true;
  }
}
