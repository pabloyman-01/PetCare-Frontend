import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles = route.data['roles'] as string[];
    if (!expectedRoles || expectedRoles.length === 0) return true;

    const userRoles = this.auth.roles();
    const hasRole = expectedRoles.some(r => userRoles.includes(r));

    if (!hasRole) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
}
