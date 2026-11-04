import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, exhaustMap, finalize, merge, switchMap, tap, timer } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SaasService } from '../../core/services/saas.service';
import { ClinicEstado, ManagedPlan, SaasAudit, SaasClinic, SaasPage } from '../../core/models/saas.model';
import { ClinicaPlan } from '../../core/models/clinica.model';
import { formatPlanDate } from '../mi-plan/plan-date';

export const auditReasonValidator: ValidatorFn = control => {
  const length = typeof control.value === 'string' ? control.value.trim().length : 0;
  return length >= 5 && length <= 500 ? null : { reasonLength: true };
};

@Component({
  selector: 'app-saas-clinicas',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './saas-clinicas.component.html',
  styleUrl: './saas-clinicas.component.css'
})
export class SaasClinicasComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(SaasService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listRequests = new Subject<{ q: string; page: number; delay: number }>();
  private readonly auditRequests = new Subject<{ id: number; page: number } | null>();
  private readonly profileRequests = new Subject<void>();
  readonly clinics = signal<SaasPage<SaasClinic> | null>(null);
  readonly selected = signal<SaasClinic | null>(null);
  readonly audit = signal<SaasPage<SaasAudit> | null>(null);
  readonly listLoading = signal(false);
  readonly auditLoading = signal(false);
  readonly saving = signal(false);
  readonly listError = signal('');
  readonly auditError = signal('');
  readonly mutationError = signal('');
  readonly success = signal('');
  readonly profileError = signal(false);
  readonly profileRefreshing = signal(false);
  readonly operation = signal<'plan' | 'estado'>('plan');
  readonly formatDate = formatPlanDate;
  readonly pageSize = 20;
  readonly auditSize = 10;
  query = '';
  private requestedPage = 0;
  private requestedAuditPage = 0;
  readonly form = new FormGroup({
    plan: new FormControl<ManagedPlan>('PRO', { nonNullable: true }),
    estado: new FormControl<ClinicEstado>('SUSPENDIDA', { nonNullable: true }),
    reason: new FormControl('', { nonNullable: true, validators: [auditReasonValidator] })
  });

  ngOnInit(): void {
    this.listRequests.pipe(
      switchMap(request => {
        this.listLoading.set(true);
        this.listError.set('');
        this.clinics.set(null);
        // Cancel the previous search immediately, before debouncing the next request.
        return timer(request.delay).pipe(
          switchMap(() => this.api.list(request.q, request.page, this.pageSize)),
          catchError(() => {
            this.listLoading.set(false);
            this.listError.set('No se pudo cargar el directorio. Reintenta la consulta.');
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(page => {
      this.clinics.set(page);
      this.listLoading.set(false);
    });

    this.auditRequests.pipe(
      switchMap(request => {
        this.audit.set(null);
        this.auditError.set('');
        this.auditLoading.set(!!request);
        if (!request) return EMPTY;
        return this.api.audit(request.id, request.page, this.auditSize).pipe(
          catchError(() => {
            this.auditLoading.set(false);
            this.auditError.set('No se pudo cargar la auditor\u00eda. Reintenta para ver el historial actualizado.');
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(page => {
      this.audit.set(page);
      this.auditLoading.set(false);
    });

    merge(timer(0, 60000), this.profileRequests).pipe(
      exhaustMap(() => this.refreshProfile()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
    this.loadList();
  }

  private refreshProfile() {
    this.profileRefreshing.set(true);
    return this.auth.me().pipe(
      tap(user => {
        const current = this.auth.user();
        if (current?.id === user.id) {
          this.auth.updateSessionUser(user);
          if (!this.auth.isSaasOperator() || this.auth.mustChangePassword()) {
            this.clearSelection();
            this.router.navigateByUrl(this.auth.homeUrl());
          }
        }
        this.profileError.set(false);
      }),
      catchError(() => {
        this.profileError.set(true);
        return EMPTY;
      }),
      finalize(() => this.profileRefreshing.set(false))
    );
  }

  retryProfile(): void {
    this.profileRequests.next();
  }

  search(value: string): void {
    if (this.saving()) return;
    this.query = value;
    this.loadList(0, 300);
  }

  loadList(page = this.requestedPage, delay = 0): void {
    if (this.saving()) return;
    this.requestedPage = page;
    this.clearSelection();
    this.listRequests.next({ q: this.query.trim(), page, delay });
  }

  selectClinic(clinic: SaasClinic): void {
    if (this.saving()) return;
    this.selected.set(clinic);
    this.success.set('');
    this.mutationError.set('');
    this.operation.set('plan');
    this.resetForm(clinic);
    this.loadAudit(0);
  }

  clearSelection(): void {
    this.selected.set(null);
    this.success.set('');
    this.mutationError.set('');
    this.auditRequests.next(null);
  }

  loadAudit(page = this.requestedAuditPage): void {
    const clinic = this.selected();
    if (!clinic) return;
    this.requestedAuditPage = page;
    this.auditRequests.next({ id: clinic.id, page });
  }

  setOperation(operation: 'plan' | 'estado'): void {
    if (this.saving()) return;
    if (operation !== this.operation()) this.form.controls.reason.reset('');
    this.operation.set(operation);
    this.mutationError.set('');
    this.success.set('');
  }

  selectEstado(estado: ClinicEstado): void {
    if (this.saving() || this.selected()?.estado === estado) return;
    if (estado !== this.form.controls.estado.value) this.form.controls.reason.reset('');
    this.setOperation('estado');
    this.form.controls.estado.setValue(estado);
  }

  hasChange(): boolean {
    const clinic = this.selected();
    return !!clinic && (this.operation() === 'plan'
      ? this.form.controls.plan.value !== clinic.plan.plan
      : this.form.controls.estado.value !== clinic.estado);
  }

  submit(): void {
    const clinic = this.selected();
    if (!clinic || this.saving()) return;
    if (this.form.invalid || !this.hasChange()) {
      this.form.markAllAsTouched();
      return;
    }
    const { plan, estado, reason } = this.form.getRawValue();
    const operation = this.operation();
    this.saving.set(true);
    this.form.disable();
    this.mutationError.set('');
    this.success.set('');
    const request = operation === 'plan'
      ? this.api.changePlan(clinic.id, plan, reason)
      : this.api.changeEstado(clinic.id, estado, reason);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.saving.set(false);
        this.form.enable();
        // Never apply a late mutation to a different selection.
        if (this.selected()?.id !== clinic.id) return;
        this.selected.set(updated);
        this.clinics.update(page => page ? {
          ...page, items: page.items.map(item => item.id === updated.id ? updated : item)
        } : page);
        this.resetForm(updated);
        this.success.set(operation === 'plan'
          ? 'Plan actualizado. El estado de la cl\u00ednica no se ha cambiado.'
          : 'Estado de la cl\u00ednica actualizado.');
        this.loadAudit(0);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.form.enable();
        if (this.selected()?.id !== clinic.id) return;
        const detail = typeof error.error?.message === 'string' ? error.error.message : '';
        this.mutationError.set(error.status === 409
          ? `Conflicto (409). ${detail || 'Los datos pueden haber cambiado. Actualiza el directorio antes de reintentar.'}`
          : error.status === 0
            ? 'No se pudo confirmar el cambio por un problema de conexi\u00f3n. Actualiza el directorio y revisa la auditor\u00eda antes de reintentar.'
            : detail || 'No se pudo aplicar el cambio. Revisa los datos e intenta nuevamente.');
      }
    });
  }

  private resetForm(clinic: SaasClinic): void {
    this.form.reset({
      plan: clinic.plan.plan === 'CONSULTORIO' ? 'CONSULTORIO' : 'PRO',
      estado: clinic.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA',
      reason: ''
    });
  }

  statusLabel(status: ClinicaPlan['status']): string {
    return { TRIAL: 'En prueba', ACTIVE: 'Activo', EXPIRED: 'Vencido', READ_ONLY: 'Solo lectura', SUSPENDED: 'Suspendido' }[status];
  }

  initials(name: string | null | undefined): string {
    return name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'PC';
  }

  auditLabel(entry: SaasAudit): string {
    if (entry.action === 'PLAN_CHANGED') return 'Cambio de plan';
    if (entry.action === 'ESTADO_CHANGED') {
      if (entry.newEstado === 'SUSPENDIDA') return 'Suspensi\u00f3n';
      if (entry.newEstado === 'ACTIVA') return 'Reactivaci\u00f3n';
      return 'Cambio de estado';
    }
    return entry.action;
  }

  capacities(plan: ClinicaPlan) {
    return [
      { label: 'Personal', used: plan.staffUsed, limit: plan.staffLimit },
      { label: 'Mascotas', used: plan.petsUsed, limit: plan.petsLimit }
    ];
  }
}
