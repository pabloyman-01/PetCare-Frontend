import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, exhaustMap, finalize, merge, switchMap, tap, timer } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SaasService } from '../../core/services/saas.service';
import { ClinicEstado, ManagedPlan, MonthlyOperation, MonthlyPaymentResponse, SaasAudit, SaasClinic, SaasPage } from '../../core/models/saas.model';
import { ClinicaPlan } from '../../core/models/clinica.model';
import { formatPlanDate } from '../mi-plan/plan-date';
import { planStatusLabel } from '../mi-plan/plan-status';

export const auditReasonValidator: ValidatorFn = control => {
  const length = typeof control.value === 'string' ? control.value.trim().length : 0;
  return length >= 5 && length <= 500 ? null : { reasonLength: true };
};

export const paymentReferenceValidator: ValidatorFn = control => {
  const raw = typeof control.value === 'string' ? control.value : '';
  const value = raw.trim().toUpperCase();
  return !/[\x00-\x1f\x7f]/.test(raw) && /^[A-Z0-9 ._/-]{5,120}$/.test(value)
    ? null : { paymentReference: true };
};

@Component({
  selector: 'app-saas-clinicas',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet],
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
  private readonly paymentRequests = new Subject<{ id: number; page: number } | null>();
  private readonly profileRequests = new Subject<void>();
  readonly clinics = signal<SaasPage<SaasClinic> | null>(null);
  readonly selected = signal<SaasClinic | null>(null);
  readonly audit = signal<SaasPage<SaasAudit> | null>(null);
  readonly payments = signal<SaasPage<MonthlyPaymentResponse> | null>(null);
  readonly paymentsLoading = signal(false);
  readonly paymentsError = signal('');
  readonly listLoading = signal(false);
  readonly auditLoading = signal(false);
  readonly saving = signal(false);
  readonly listError = signal('');
  readonly auditError = signal('');
  readonly mutationError = signal('');
  readonly success = signal('');
  readonly profileError = signal(false);
  readonly profileRefreshing = signal(false);
  readonly operation = signal<MonthlyOperation | 'estado'>('ACTIVATE');
  readonly statusLabel = planStatusLabel;
  readonly formatDate = formatPlanDate;
  readonly pageSize = 20;
  readonly auditSize = 10;
  query = '';
  private requestedPage = 0;
  private requestedAuditPage = 0;
  private requestedPaymentPage = 0;
  // Keep the selected snapshot through failures/retries, never read a newer ID on submit.
  private expectedPaymentId: number | null = null;
  readonly form = new FormGroup({
    plan: new FormControl<ManagedPlan>('PRO', { nonNullable: true }),
    estado: new FormControl<ClinicEstado>('SUSPENDIDA', { nonNullable: true }),
    reason: new FormControl('', { nonNullable: true, validators: [auditReasonValidator] }),
    paymentReference: new FormControl('', { nonNullable: true, validators: [paymentReferenceValidator] }),
    paymentConfirmed: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] })
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

    this.paymentRequests.pipe(
      switchMap(request => {
        this.payments.set(null);
        this.paymentsError.set('');
        this.paymentsLoading.set(!!request);
        if (!request) return EMPTY;
        return this.api.payments(request.id, request.page, this.auditSize).pipe(
          catchError(() => {
            this.paymentsLoading.set(false);
            this.paymentsError.set('No se pudo cargar el historial de pagos. Revisa los registros antes de reintentar una operaci\u00f3n incierta.');
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(page => {
      this.payments.set(page);
      this.paymentsLoading.set(false);
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
    this.operation.set(clinic.plan.canActivate ? 'ACTIVATE' : clinic.plan.canRenew ? 'RENEW' : 'estado');
    this.resetForm(clinic);
    this.loadAudit(0);
    this.loadPayments(0);
  }

  clearSelection(): void {
    if (this.saving()) return;
    this.selected.set(null);
    this.success.set('');
    this.mutationError.set('');
    this.auditRequests.next(null);
    this.paymentRequests.next(null);
  }

  loadAudit(page = this.requestedAuditPage): void {
    const clinic = this.selected();
    if (!clinic || this.saving()) return;
    this.requestedAuditPage = page;
    this.auditRequests.next({ id: clinic.id, page });
  }

  loadPayments(page = this.requestedPaymentPage): void {
    const clinic = this.selected();
    if (!clinic || this.saving()) return;
    this.requestedPaymentPage = page;
    this.paymentRequests.next({ id: clinic.id, page });
  }

  setOperation(operation: MonthlyOperation | 'estado'): void {
    if (this.saving()) return;
    const clinic = this.selected();
    if (!clinic || (operation === 'ACTIVATE' && !clinic.plan.canActivate) || (operation === 'RENEW' && !clinic.plan.canRenew)) return;
    if (operation !== this.operation()) {
      this.form.controls.reason.reset('');
      this.form.controls.paymentReference.reset('');
      this.form.controls.paymentConfirmed.reset(false);
    }
    this.operation.set(operation);
    if (operation === 'RENEW' && (clinic.plan.plan === 'CONSULTORIO' || clinic.plan.plan === 'PRO')) {
      this.form.controls.plan.setValue(clinic.plan.plan);
    }
    this.billingValidators();
    this.mutationError.set('');
    this.success.set('');
  }

  selectEstado(estado: ClinicEstado): void {
    if (this.saving() || this.selected()?.estado === estado) return;
    if (estado !== this.form.controls.estado.value) this.form.controls.reason.reset('');
    this.setOperation('estado');
    this.form.controls.estado.setValue(estado);
  }

  selectPlan(plan: ManagedPlan): void {
    if (this.saving() || !this.selected()?.plan.canActivate) return;
    this.setOperation('ACTIVATE');
    if (plan !== this.form.controls.plan.value) {
      this.form.controls.reason.reset('');
      this.form.controls.paymentReference.reset('');
      this.form.controls.paymentConfirmed.reset(false);
    }
    this.form.controls.plan.setValue(plan);
  }

  private billingValidators(): void {
    const billing = this.operation() !== 'estado';
    this.form.controls.paymentReference.setValidators(billing ? [paymentReferenceValidator] : []);
    this.form.controls.paymentConfirmed.setValidators(billing ? [Validators.requiredTrue] : []);
    this.form.controls.paymentReference.updateValueAndValidity();
    this.form.controls.paymentConfirmed.updateValueAndValidity();
  }

  hasChange(): boolean {
    const clinic = this.selected();
    if (!clinic) return false;
    if (this.operation() === 'ACTIVATE') return clinic.plan.canActivate;
    if (this.operation() === 'RENEW') return clinic.plan.canRenew && this.form.controls.plan.value === clinic.plan.plan;
    return this.form.controls.estado.value !== clinic.estado;
  }

  submit(): void {
    const clinic = this.selected();
    if (!clinic || this.saving()) return;
    if (this.form.invalid || !this.hasChange()) {
      this.form.markAllAsTouched();
      return;
    }
    const { plan, estado, reason, paymentReference } = this.form.getRawValue();
    const operation = this.operation();
    this.saving.set(true);
    this.form.disable();
    this.mutationError.set('');
    this.success.set('');
    const request = operation === 'estado'
      ? this.api.changeEstado(clinic.id, estado, reason.trim())
      : this.api.monthlyPayment(clinic.id, {
        plan, operation, reason: reason.trim(), paymentReference: paymentReference.trim().toUpperCase(),
        paymentConfirmed: true, expectedPaymentId: this.expectedPaymentId
      });
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
        this.operation.set(updated.plan.canActivate ? 'ACTIVATE' : updated.plan.canRenew ? 'RENEW' : 'estado');
        this.resetForm(updated);
        this.success.set(operation !== 'estado'
          ? 'Mensualidad registrada. El estado administrativo de la cl\u00ednica no se ha cambiado.'
          : 'Estado de la cl\u00ednica actualizado.');
        this.loadAudit(0);
        this.loadPayments(0);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.form.enable();
        if (this.selected()?.id !== clinic.id) return;
        const detail = typeof error.error?.message === 'string' ? error.error.message : '';
        this.mutationError.set(error.status === 409
          ? `Conflicto (409). ${detail} Revisa pagos y auditor\u00eda y actualiza el directorio antes de una nueva operaci\u00f3n. No reutilices una referencia con datos diferentes.`
          : error.status === 410
            ? 'Operaci\u00f3n retirada (410 MONTHLY_PAYMENT_REQUIRED). Se requiere registrar una mensualidad; no se intentar\u00e1 el cambio de plan antiguo.'
            : error.status === 0 || error.status >= 500
              ? operation === 'estado'
                ? 'Resultado incierto. Revisa la auditor\u00eda y actualiza el directorio antes de reintentar el cambio administrativo.'
                : 'Resultado incierto. Revisa pagos y auditor\u00eda antes de reintentar. Conserva la misma referencia y los mismos datos para un reintento idempotente; no generes otro pago.'
              : detail || 'No se pudo aplicar el cambio. Revisa los datos e intenta nuevamente.');
      }
    });
  }

  private resetForm(clinic: SaasClinic): void {
    this.expectedPaymentId = clinic.plan.lastPaymentId || null;
    this.form.reset({
      plan: clinic.plan.plan === 'CONSULTORIO' ? 'CONSULTORIO' : 'PRO',
      estado: clinic.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA',
      reason: '', paymentReference: '', paymentConfirmed: false
    });
    this.billingValidators();
  }

  initials(name: string | null | undefined): string {
    return name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'PC';
  }

  auditLabel(entry: SaasAudit): string {
    if (entry.action === 'MONTHLY_ACTIVATED') return 'Activaci\u00f3n mensual';
    if (entry.action === 'MONTHLY_RENEWED') return 'Renovaci\u00f3n mensual';
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
