import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';
import { ClinicaService } from '../../../core/services/clinica.service';
import { ClinicaPublic, ServicioPublic } from '../../../core/models/clinica.model';

@Component({
  selector: 'app-clinic',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './clinic.component.html',
  styleUrl: './clinic.component.css'
})
export class ClinicComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ClinicaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clinicRetry = new BehaviorSubject(0);
  private readonly servicesRetry = new BehaviorSubject(0);
  private readonly slug = new BehaviorSubject('');
  readonly clinic = signal<ClinicaPublic | null>(null);
  readonly servicios = signal<ServicioPublic[]>([]);
  readonly loading = signal(true);
  readonly error = signal<'' | 'not-found' | 'unavailable'>('');
  readonly servicesLoading = signal(false);
  readonly servicesError = signal(false);
  readonly logoFailed = signal(false);
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly year = new Date().getFullYear();
  readonly filteredServices = computed(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const words = normalize(this.query().trim()).split(/\s+/).filter(Boolean);
    return this.servicios().filter(service => words.every(word => normalize(`${service.nombre} ${service.descripcion || ''}`).includes(word)));
  });
  readonly safeLogoUrl = computed(() => {
    if (this.logoFailed()) return null;
    try {
      const url = new URL(this.clinic()?.logoUrl || '');
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  });
  readonly phoneHref = computed(() => {
    const raw = this.clinic()?.telefono?.trim() || '';
    if (!/^[+\d\s-]+$/.test(raw)) return null;
    const number = raw.replace(/[\s-]/g, '');
    return /^\+?\d{8,20}$/.test(number) ? `tel:${number}` : null;
  });
  readonly mapsHref = computed(() => {
    const address = this.clinic()?.direccion?.trim();
    return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  });

  ngOnInit(): void {
    combineLatest([this.slug, this.clinicRetry]).pipe(
      switchMap(([slug]) => {
        this.loading.set(true);
        this.error.set('');
        this.clinic.set(null);
        this.logoFailed.set(false);
        if (!slug) return of(null);
        return this.api.getPublicClinic(slug).pipe(catchError(error => {
          this.error.set(error.status === 404 ? 'not-found' : 'unavailable');
          return of(null);
        }));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(clinic => {
      this.clinic.set(clinic);
      this.loading.set(false);
    });

    combineLatest([this.slug, this.servicesRetry]).pipe(
      switchMap(([slug]) => {
        this.servicios.set([]);
        this.servicesError.set(false);
        this.servicesLoading.set(!!slug);
        if (!slug) return of([]);
        return this.api.getPublicServices(slug).pipe(
          catchError(() => { this.servicesError.set(true); return of([]); }),
          finalize(() => this.servicesLoading.set(false))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(services => this.servicios.set(services));

    this.route.paramMap.pipe(
      map(params => params.get('slug') || ''), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)
    ).subscribe(slug => {
      this.search.setValue('');
      this.slug.next(slug);
      if (!slug) this.error.set('not-found');
    });
  }

  retryClinic(): void { this.clinicRetry.next(this.clinicRetry.value + 1); }
  retryServices(): void { this.servicesRetry.next(this.servicesRetry.value + 1); }

  scrollToServices(): void {
    document.getElementById('servicios')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    document.getElementById('services-title')?.focus({ preventScroll: true });
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  }
}
