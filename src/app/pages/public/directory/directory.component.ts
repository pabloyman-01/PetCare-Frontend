import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, of, switchMap } from 'rxjs';
import { ClinicaService } from '../../../core/services/clinica.service';
import { ClinicDirectoryPage } from '../../../core/models/clinica.model';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './directory.component.html',
  styleUrl: './directory.component.css'
})
export class DirectoryComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry = new BehaviorSubject(0);
  readonly search = new FormControl('', { nonNullable: true });
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly result = signal<ClinicDirectoryPage | null>(null);
  readonly brokenLogos = signal<Set<number>>(new Set());
  readonly serviceSuggestions = computed(() => [...new Set(
    this.result()?.items.flatMap(clinic => clinic.servicios) ?? []
  )].slice(0, 3));

  constructor(private clinics: ClinicaService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    combineLatest([this.route.queryParamMap, this.retry]).pipe(
      switchMap(([params]) => {
        const query = (params.get('q') || '').trim().slice(0, 100);
        const rawPage = Number(params.get('page') || 0);
        const page = Number.isSafeInteger(rawPage) && rawPage >= 0 && rawPage <= 2147483647 ? rawPage : 0;
        this.query.set(query);
        this.search.setValue(query);
        this.loading.set(true);
        this.error.set(false);
        this.result.set(null);
        return this.clinics.getDirectory(query, page).pipe(catchError(() => {
          this.error.set(true);
          return of(null);
        }));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      this.result.set(result);
      this.loading.set(false);
    });
  }

  searchClinics(query = this.search.value): void {
    const q = query.trim().slice(0, 100);
    if (q === this.query() && this.result()?.page === 0) return;
    this.router.navigate(['/clinicas'], { queryParams: { q: q || null } });
  }

  changePage(page: number): void {
    this.router.navigate(['/clinicas'], { queryParams: { q: this.query() || null, page: page || null } });
  }

  retryLoad(): void {
    this.retry.next(this.retry.value + 1);
  }

  logoFailed(id: number): void {
    this.brokenLogos.update(ids => new Set([...ids, id]));
  }

  phoneLink(phone?: string | null): string | null {
    const number = phone?.replace(/[^\d+]/g, '') || '';
    return number.replace(/\D/g, '').length >= 6 ? `tel:${number}` : null;
  }
}
