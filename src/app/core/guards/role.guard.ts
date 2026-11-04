import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { canAccessRoles } from './session-policy';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate, CanActivateChild {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) return this.router.parseUrl('/auth');
    if (this.auth.mustChangePassword()) return this.router.parseUrl('/change-password');
    return canAccessRoles(this.auth.roles(), route.data['roles'])
      ? true : this.router.parseUrl(this.auth.homeUrl());
  }

  canActivateChild(route: ActivatedRouteSnapshot): boolean | UrlTree {
    return this.canActivate(route);
  }
}
