import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ClinicaPlan } from '../../core/models/clinica.model';
import { ClinicaService } from '../../core/services/clinica.service';
import { formatPlanDate } from './plan-date';
import { planStatusLabel, planStatusMessage } from './plan-status';

@Component({
  selector: 'app-mi-plan',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-5xl mx-auto space-y-6" [attr.aria-busy]="loading()">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-headline-lg font-extrabold text-on-surface">Mi plan</h2>
          <p class="text-body-md text-on-surface-variant">Estado y capacidad de tu cl&iacute;nica</p>
        </div>
        <button type="button" class="btn btn-ghost" [disabled]="loading()" (click)="reload()">
          <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
          {{ loading() ? 'Actualizando...' : 'Actualizar uso' }}
        </button>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }
      @if (loading() && !plan()) {
        <p class="text-on-surface-variant" role="status">Cargando tu plan...</p>
      }
      @if (plan(); as p) {
        <section class="glass-card rounded-2xl p-6 sm:p-8 space-y-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-label-sm text-on-surface-variant uppercase tracking-wider">Plan actual</p>
              <h3 class="text-headline-lg font-extrabold text-primary">{{ p.plan === 'TRIAL' ? 'Prueba PRO' : p.plan }}</h3>
              <p class="text-body-sm text-on-surface-variant">Capacidad del nivel {{ p.tier }}</p>
            </div>
            <span class="rounded-full bg-primary-container px-4 py-2 text-label-md text-on-primary-container">{{ statusLabel(p.status) }}</span>
          </div>
          <p class="text-body-sm text-on-surface-variant">{{ statusMessage(p.status) }}</p>
          @if (p.status === 'TRIAL') {
            <div class="rounded-xl bg-primary-container/40 p-4 space-y-2">
              <p class="font-bold text-on-surface">{{ p.daysRemaining }} d&iacute;as restantes de prueba</p>
              <p class="text-body-sm text-on-surface-variant">Prueba de 14 d&iacute;as con funciones PRO completas: 5 miembros del personal y 2500 mascotas.</p>
            </div>
          }
          <section class="rounded-xl bg-primary-container/20 p-4 space-y-3" aria-label="Cobertura mensual pagada">
            <h4 class="font-bold">Cobertura mensual pagada</h4>
            <dl class="grid sm:grid-cols-2 gap-4 text-body-sm">
              <div><dt>Inicio</dt><dd>{{ formatDate(p.subscriptionStartedAt) }}</dd></div>
              <div><dt>Fin</dt><dd>{{ formatDate(p.subscriptionEndsAt) }}</dd></div>
            </dl>
            <p class="text-body-sm">{{ p.subscriptionDaysRemaining }} d&iacute;as de cobertura restantes, seg&uacute;n el servidor. Hora de Lima.</p>
            @if (p.lastPaymentId === null) { <p class="text-body-sm">No hay una mensualidad registrada.</p> }
          </section>
          @if (p.trialStartedAt || p.trialEndsAt) {
            <h4 class="font-bold">Historial de la prueba de 14 d&iacute;as</h4>
            <dl class="grid sm:grid-cols-2 gap-4 text-body-sm">
              <div><dt class="text-on-surface-variant">Inicio de la prueba</dt><dd class="font-medium text-on-surface">{{ formatDate(p.trialStartedAt) }}</dd></div>
              <div><dt class="text-on-surface-variant">Fin de la prueba</dt><dd class="font-medium text-on-surface">{{ formatDate(p.trialEndsAt) }}</dd></div>
            </dl>
            <p class="text-label-sm text-on-surface-variant">Fechas hist&oacute;ricas conservadas en hora de Lima (Per&uacute;). La prueba no se reinicia ni se renueva.</p>
          }
          @if (p.readOnly || p.status === 'EXPIRED' || p.status === 'READ_ONLY' || p.status === 'SUSPENDED' || p.status === 'PAYMENT_PENDING' || p.status === 'SUBSCRIPTION_EXPIRED') {
            <div class="alert bg-error/10 text-on-surface border border-error/20" role="status">
              <div><p class="font-bold">Cl&iacute;nica en modo solo lectura</p><p>Tu historial y todas las cuentas se conservan. Puedes consultar la informaci&oacute;n, pero no crear, editar ni eliminar registros.</p></div>
            </div>
          }
        </section>

        <section aria-labelledby="capacity-heading" class="space-y-4">
          <div><h3 id="capacity-heading" class="text-title-lg font-bold text-on-surface">Capacidad utilizada</h3>
          <p class="text-body-sm text-on-surface-variant">Se cuentan las cuentas activas de administrador, veterinario y asistente una sola vez. Los due&ntilde;os no consumen cupos. Desactivar solo un perfil profesional no desactiva su cuenta.</p>
          <p class="text-body-sm text-on-surface-variant">Actualiza el uso despu&eacute;s de cambiar el personal o las mascotas.</p></div>
          <div class="grid sm:grid-cols-2 gap-4">
            @for (capacity of capacities(p); track capacity.label) {
              <article class="glass-card rounded-2xl p-6 space-y-3">
                <h4 class="text-title-md font-bold text-on-surface">{{ capacity.label }}</h4>
                <p class="text-headline-md font-extrabold text-on-surface">{{ capacity.used }} <span class="text-body-md font-normal text-on-surface-variant">de {{ capacity.limit }}</span></p>
                <progress class="w-full h-2 accent-primary" [value]="capacity.used" [max]="capacity.limit || 1" [attr.aria-label]="capacity.label + ': ' + capacity.used + ' de ' + capacity.limit"></progress>
                @if (capacity.used > capacity.limit) {
                  <p class="text-body-sm text-error font-medium" role="status">Capacidad excedida. Los registros existentes se conservan; no se elimina ninguna cuenta ni mascota autom&aacute;ticamente.</p>
                } @else if (capacity.used === capacity.limit) {
                  <p class="text-body-sm text-on-surface-variant">L&iacute;mite alcanzado. No hay capacidad para nuevos registros.</p>
                } @else {
                  <p class="text-body-sm text-on-surface-variant">{{ capacity.limit - capacity.used }} disponibles</p>
                }
              </article>
            }
          </div>
        </section>

        <section class="glass-card rounded-2xl p-6 space-y-4" aria-labelledby="rates-heading">
          <h3 id="rates-heading" class="text-title-lg font-bold text-on-surface">Tarifas mensuales</h3>
          <p class="text-body-sm text-on-surface-variant">Tarifa del nivel {{ p.tier }} informada por el servidor: {{ price(p.monthlyPrice) }} al mes. La tarifa por s&iacute; sola no acredita un pago.</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="rounded-xl border border-outline-variant/40 p-4"><h4 class="font-bold text-on-surface">Consultorio</h4><p class="text-primary font-bold">S/ 59 al mes</p><p class="text-body-sm text-on-surface-variant">2 miembros del personal &middot; 500 mascotas</p></div>
            <div class="rounded-xl border border-outline-variant/40 p-4"><h4 class="font-bold text-on-surface">PRO</h4><p class="text-primary font-bold">S/ 129 al mes</p><p class="text-body-sm text-on-surface-variant">5 miembros del personal &middot; 2500 mascotas</p></div>
          </div>
          <p class="text-body-sm text-on-surface-variant">Coordina con el operador la activaci&oacute;n o renovaci&oacute;n mensual con pago confirmado manualmente. No hay checkout ni cobros autom&aacute;ticos. Esta pantalla no emite comprobantes fiscales ni calcula impuestos o recargos. Una cobertura vigente no permite cambiar de plan ni reiniciarla; el cambio se realiza al vencimiento, sin prorrateo.</p>
          <a routerLink="/planes" class="btn btn-ghost">Comparar planes <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
        </section>
      }
    </div>
  `
})
export class MiPlanComponent {
  private readonly clinic = inject(ClinicaService);
  private readonly destroyRef = inject(DestroyRef);
  readonly plan = signal<ClinicaPlan | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly formatDate = formatPlanDate;
  readonly statusLabel = planStatusLabel;
  readonly statusMessage = planStatusMessage;

  constructor() {
    this.reload();
  }

  reload(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.clinic.getMyPlan().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: plan => this.plan.set(plan),
      error: () => this.error.set(this.plan()
        ? 'No se pudo actualizar el plan. Los datos mostrados son de la consulta anterior. Intenta actualizar de nuevo.'
        : 'No se pudo cargar tu plan. Intenta actualizar de nuevo.')
    });
  }

  capacities(plan: ClinicaPlan) {
    return [
      { label: 'Personal', used: plan.staffUsed, limit: plan.staffLimit },
      { label: 'Mascotas', used: plan.petsUsed, limit: plan.petsLimit }
    ];
  }

  price(value: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  }
}
