import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClinicaService } from '../../../core/services/clinica.service';
import { ClinicaPublic, ServicioPublic } from '../../../core/models/clinica.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-clinic',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="min-h-screen w-full flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 flex items-center justify-between border-b border-outline-variant/20 bg-surface/80 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span class="material-symbols-outlined text-on-primary fill">pets</span>
        </div>
        <h1 class="text-headline-md font-extrabold text-primary">PetCare</h1>
      </div>
      <a routerLink="/auth" class="btn btn-primary btn-sm">
        <span class="material-symbols-outlined text-[18px]">login</span>
        Iniciar Sesi&oacute;n
      </a>
    </header>

    <main class="flex-1">
      @if (loading()) {
        <div class="flex items-center justify-center py-24">
          <div class="flex flex-col items-center gap-4">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="text-body-md text-on-surface-variant">Cargando veterinaria...</p>
          </div>
        </div>
      } @else if (error()) {
        <!-- Not found -->
        <div class="max-w-xl mx-auto px-4 py-24 text-center">
          <div class="w-16 h-16 bg-error-container rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span class="material-symbols-outlined text-[32px] text-on-error-container">pets</span>
          </div>
          <h2 class="text-headline-md font-bold text-on-surface mb-2">Veterinaria no encontrada</h2>
          <p class="text-body-md text-on-surface-variant mb-6">La veterinaria que buscas no existe o no est&aacute; disponible.</p>
          <div class="flex justify-center gap-3">
            <a routerLink="/auth/register" class="btn btn-primary">Registrarme en PetCare</a>
            <a routerLink="/auth" class="btn btn-ghost">Iniciar sesi&oacute;n</a>
          </div>
        </div>
      } @else if (clinic()) {
        <!-- Clinic -->
        <div class="max-w-4xl mx-auto px-4 py-10">
          <!-- Hero -->
          <div class="glass-card rounded-3xl overflow-hidden shadow-xl shadow-on-surface/5">
            @if (clinic()?.logoUrl) {
              <div class="h-40 w-full object-cover" [style.background-image]="'url(' + clinic()?.logoUrl + ')'"
                   [style.background-size]="'cover'" [style.background-position]="'center'"></div>
            } @else {
              <div class="h-40 w-full bg-gradient-to-r from-primary/15 to-secondary/15 flex items-center justify-center">
                <span class="material-symbols-outlined text-[54px] text-primary">local_hospital</span>
              </div>
            }
            <div class="p-8">
              <h2 class="text-headline-lg font-extrabold text-on-surface mb-1">{{ clinic()?.nombre }}</h2>
              <div class="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-body-sm text-on-surface-variant">
                @if (clinic()?.direccion) {
                  <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[18px]">location_on</span>
                    {{ clinic()?.direccion }}
                  </span>
                }
                @if (clinic()?.telefono) {
                  <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[18px]">call</span>
                    {{ clinic()?.telefono }}
                  </span>
                }
                @if (clinic()?.horarioAtencion) {
                  <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[18px]">schedule</span>
                    {{ clinic()?.horarioAtencion }}
                  </span>
                }
              </div>
              @if (clinic()?.descripcion) {
                <p class="text-body-md text-on-surface-variant mt-4">{{ clinic()?.descripcion }}</p>
              }

              <div class="flex flex-wrap gap-3 mt-6 pt-6 border-t border-outline-variant/20">
                <a [routerLink]="['/auth/register']" [queryParams]="{ clinica: clinic()?.slug }"
                   class="btn btn-primary">
                  <span class="material-symbols-outlined">person_add</span>
                  Registrarme en {{ clinic()?.nombre }}
                </a>
                <a routerLink="/auth" class="btn btn-ghost">Ya soy cliente, iniciar sesi&oacute;n</a>
              </div>
            </div>
          </div>

          <!-- Servicios -->
          <div class="mt-10">
            <h3 class="text-title-md font-bold text-on-surface mb-4">Nuestros Servicios</h3>
            @if (servicios().length === 0) {
              <div class="glass-card rounded-2xl p-8 text-center text-body-md text-on-surface-variant">
                Este centro a&uacute;n no ha publicado servicios.
              </div>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (s of servicios(); track s.id) {
                  <div class="glass-card rounded-2xl p-5 flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p class="text-title-md font-semibold text-on-surface">{{ s.nombre }}</p>
                      @if (s.descripcion) {
                        <p class="text-body-sm text-on-surface-variant mt-1">{{ s.descripcion }}</p>
                      }
                    </div>
                    <span class="text-title-md font-bold text-primary flex-shrink-0">{{ formatMoney(s.costoBase) }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </main>

    <footer class="text-center py-6 text-body-sm text-on-surface-variant/60 border-t border-outline-variant/20">
      &copy; 2026 PetCare. Todos los derechos reservados.
    </footer>
  </div>
  `
})
export class ClinicComponent implements OnInit {
  clinic = signal<ClinicaPublic | null>(null);
  servicios = signal<ServicioPublic[]>([]);
  loadingS = signal(true);
  errorS = signal(false);

  loading = this.loadingS.asReadonly();
  error = this.errorS.asReadonly();

  constructor(
    private route: ActivatedRoute,
    private clinica: ClinicaService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.clinica.getPublicClinic(slug).subscribe({
      next: (c) => {
        this.clinic.set(c);
        this.loadingS.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorS.set(true);
        this.loadingS.set(false);
      }
    });
    this.clinica.getPublicServices(slug).subscribe({
      next: (servs) => this.servicios.set(servs),
      error: () => this.servicios.set([])
    });
  }

  formatMoney(value: number): string {
    return '$' + Number(value ?? 0).toLocaleString('es');
  }
}