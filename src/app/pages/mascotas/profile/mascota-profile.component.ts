import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MascotaService } from '../../../core/services/mascota.service';
import { AuthService } from '../../../core/services/auth.service';
import { AtencionClinicaService } from '../../../core/services/atencion-clinica.service';
import { VacunaService } from '../../../core/services/vacuna.service';
import { CitaService } from '../../../core/services/cita.service';
import { DuenioService } from '../../../core/services/duenio.service';
import { MascotaResponse } from '../../../core/models/mascota.model';
import { DuenioResponse } from '../../../core/models/duenio.model';
import { HistoriaClinicaResponse, AtencionClinicaResponse } from '../../../core/models/atencion-clinica.model';
import { VacunaMascotaResponse } from '../../../core/models/vacuna.model';
import { CitaResponse } from '../../../core/models/cita.model';
import { catchError, EMPTY } from 'rxjs';

type TabType = 'historial' | 'vacunas' | 'citas' | 'observaciones';

@Component({
  selector: 'app-mascota-profile',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
  <div class="space-y-6">
    <!-- Back link -->
    <a [routerLink]="backRoute()"
       class="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary transition-all">
      <span class="material-symbols-outlined text-[18px]">arrow_back</span>
      {{ backLabel() }}
    </a>

    @if (loading()) {
      <div class="flex items-center justify-center py-32">
        <div class="flex flex-col items-center gap-4">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-body-sm text-on-surface-variant">Cargando paciente...</p>
        </div>
      </div>
    } @else {
      @let m = mascota()!;
      <!-- Profile Header -->
      <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
        <div class="bg-gradient-to-r from-primary to-primary/80 px-6 py-8">
          <div class="flex items-center gap-6">
            <div class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-display-lg text-[36px] font-extrabold">
              {{ getInitials(m.nombre) }}
            </div>
            <div class="text-white">
              <h1 class="text-headline-lg font-extrabold">{{ m.nombre }}</h1>
              <p class="text-body-md text-white/80 mt-1">{{ especieLabel(m.especie) }} &middot; {{ m.raza }}</p>
              <div class="flex items-center gap-4 mt-2">
                <span class="inline-flex items-center gap-1.5 text-label-sm text-white/90">
                  <span class="material-symbols-outlined text-[16px]">{{ sexoIcon(m.sexo) }}</span>
                  {{ sexoLabel(m.sexo) }}
                </span>
                <span class="inline-flex items-center gap-1.5 text-label-sm text-white/90">
                  <span class="material-symbols-outlined text-[16px]">cake</span>
                  {{ m.edadAnios }} {{ m.edadAnios === 1 ? 'año' : 'años' }}
                </span>
                @if (m.pesoKg) {
                  <span class="inline-flex items-center gap-1.5 text-label-sm text-white/90">
                    <span class="material-symbols-outlined text-[16px]">monitor_weight</span>
                    {{ m.pesoKg }} kg
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
        <div class="px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-6">
            <div>
              <p class="text-label-sm text-on-surface-variant">Color</p>
              <p class="text-body-md font-semibold text-on-surface">{{ m.color || '-' }}</p>
            </div>
            <div>
              <p class="text-label-sm text-on-surface-variant">Registrado</p>
              <p class="text-body-md font-semibold text-on-surface">{{ m.createdAt | date:'dd/MM/yyyy' }}</p>
            </div>
          </div>
          @if (!auth.isDuenioOnly()) {
            <div class="flex items-center gap-2">
              <button class="btn btn-primary btn-sm">
                <span class="material-symbols-outlined text-[18px]">add</span>
                Nueva Atención
              </button>
              <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary-container/30 text-secondary text-label-sm font-bold hover:bg-secondary-container/50 transition-all">
                <span class="material-symbols-outlined text-[18px]">vaccines</span>
                Registrar Vacuna
              </button>
              <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant text-on-surface text-label-sm font-bold hover:bg-surface-container-low transition-all">
                <span class="material-symbols-outlined text-[18px]">description</span>
                Generar Receta
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Two column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Tabs -->
          <div class="glass-card rounded-2xl shadow-sm overflow-hidden">
            <div class="flex border-b border-outline-variant/20 px-4">
              @for (tab of tabs; track tab.key) {
                <button (click)="activeTab.set(tab.key)"
                        class="px-4 py-3.5 text-label-sm font-semibold transition-all relative"
                        [class.text-primary]="activeTab() === tab.key"
                        [class.text-on-surface-variant]="activeTab() !== tab.key">
                  {{ tab.label }}
                  @if (activeTab() === tab.key) {
                    <span class="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full"></span>
                  }
                </button>
              }
            </div>

            <div class="p-6">
              @switch (activeTab()) {
                @case ('historial') {
                  <div>
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-headline-md font-bold text-on-surface">Historial Clínico</h3>
                    </div>
                    @if (historiaLoading()) {
                      <div class="flex items-center justify-center py-12">
                        <span class="loading loading-spinner loading-md text-primary"></span>
                      </div>
                    } @else {
                      @let h = historia()!;
                      @if (h.atenciones.length === 0) {
                        <div class="flex flex-col items-center justify-center py-10 text-center">
                          <span class="material-symbols-outlined text-5xl text-outline-variant" style="font-variation-settings:'FILL' 1">clinical_notes</span>
                          <p class="mt-3 text-body-md text-on-surface-variant">Sin atenciones clínicas registradas</p>
                        </div>
                      } @else {
                        <div class="overflow-x-auto custom-scrollbar">
                          <table class="table w-full">
                            <thead>
                              <tr class="border-b border-outline-variant/20">
                                <th class="text-left px-4 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Fecha</th>
                                <th class="text-left px-4 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Motivo</th>
                                <th class="text-left px-4 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Diagnóstico</th>
                                <th class="text-left px-4 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Veterinario</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-outline-variant/10">
                              @for (a of h.atenciones; track a.id) {
                                <tr class="hover:bg-surface-container-low/50 transition-all">
                                  <td class="px-4 py-3 text-body-md text-on-surface whitespace-nowrap">{{ a.fechaRegistro | date:'dd/MM/yyyy' }}</td>
                                  <td class="px-4 py-3 text-body-md text-on-surface">{{ a.motivo }}</td>
                                  <td class="px-4 py-3 text-body-md text-on-surface max-w-[200px] truncate">{{ a.diagnostico }}</td>
                                  <td class="px-4 py-3 text-body-md text-on-surface whitespace-nowrap">{{ a.veterinarioNombreCompleto }}</td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      }
                    }
                  </div>
                }

                @case ('vacunas') {
                  <div>
                    <h3 class="text-headline-md font-bold text-on-surface mb-4">Vacunas</h3>
                    @if (vacunasLoading()) {
                      <div class="flex items-center justify-center py-12">
                        <span class="loading loading-spinner loading-md text-primary"></span>
                      </div>
                    } @else if (vacunas().length === 0) {
                      <div class="flex flex-col items-center justify-center py-10 text-center">
                        <span class="material-symbols-outlined text-5xl text-outline-variant" style="font-variation-settings:'FILL' 1">vaccines</span>
                        <p class="mt-3 text-body-md text-on-surface-variant">Sin vacunas registradas</p>
                      </div>
                    } @else {
                      <div class="space-y-3">
                        @for (v of vacunas(); track v.id) {
                          <div class="flex items-center gap-4 p-4 rounded-2xl bg-surface-container/50 border border-outline-variant/10">
                            <div class="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center shrink-0">
                              <span class="material-symbols-outlined text-tertiary text-[22px]">vaccines</span>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-label-md font-semibold text-on-surface">{{ v.vacunaNombre }}</p>
                              <p class="text-body-sm text-on-surface-variant">Aplicada {{ v.fechaAplicacion | date:'dd/MM/yyyy' }} por {{ v.veterinarioNombreCompleto }}</p>
                            </div>
                            <div class="text-right shrink-0">
                              @if (v.fechaProximaDosis) {
                                <span class="text-label-sm text-primary font-semibold">Próxima: {{ v.fechaProximaDosis | date:'dd/MM/yyyy' }}</span>
                              }
                              @if (v.lote) {
                                <p class="text-label-sm text-on-surface-variant">Lote: {{ v.lote }}</p>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                @case ('citas') {
                  <div>
                    <h3 class="text-headline-md font-bold text-on-surface mb-4">Citas</h3>
                    @if (citasLoading()) {
                      <div class="flex items-center justify-center py-12">
                        <span class="loading loading-spinner loading-md text-primary"></span>
                      </div>
                    } @else if (citas().length === 0) {
                      <div class="flex flex-col items-center justify-center py-10 text-center">
                        <span class="material-symbols-outlined text-5xl text-outline-variant" style="font-variation-settings:'FILL' 1">calendar_month</span>
                        <p class="mt-3 text-body-md text-on-surface-variant">Sin citas registradas</p>
                      </div>
                    } @else {
                      <div class="space-y-3">
                        @for (c of citas(); track c.id) {
                          <div class="flex items-center gap-4 p-4 rounded-2xl bg-surface-container/50 border border-outline-variant/10">
                            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <span class="material-symbols-outlined text-primary text-[22px]">calendar_clock</span>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-label-md font-semibold text-on-surface">{{ c.motivo }}</p>
                              <p class="text-body-sm text-on-surface-variant">{{ c.fecha | date:'dd/MM/yyyy' }} &middot; {{ c.horaInicio | slice:0:5 }}</p>
                            </div>
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-semibold shrink-0"
                                  [ngClass]="{
                                    'bg-primary-container/60': c.estado === 'CONFIRMADA',
                                    'text-primary': c.estado === 'CONFIRMADA',
                                    'bg-secondary-container/30': c.estado === 'PROGRAMADA',
                                    'text-secondary': c.estado === 'PROGRAMADA',
                                    'bg-error-container/30': c.estado === 'CANCELADA' || c.estado === 'NO_ASISTIO',
                                    'text-error': c.estado === 'CANCELADA' || c.estado === 'NO_ASISTIO',
                                    'bg-tertiary/10': c.estado === 'ATENDIDA',
                                    'text-tertiary': c.estado === 'ATENDIDA'
                                  }">
                              <span class="w-1.5 h-1.5 rounded-full"
                                    [class.bg-primary]="c.estado === 'CONFIRMADA'"
                                    [class.bg-secondary]="c.estado === 'PROGRAMADA'"
                                    [class.bg-error]="c.estado === 'CANCELADA' || c.estado === 'NO_ASISTIO'"
                                    [class.bg-tertiary]="c.estado === 'ATENDIDA'"></span>
                              {{ citaEstadoLabel(c.estado) }}
                            </span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                @case ('observaciones') {
                  <div>
                    <h3 class="text-headline-md font-bold text-on-surface mb-4">Observaciones</h3>
                    @if (m.observaciones) {
                      <div class="p-4 rounded-2xl bg-surface-container/50 border border-outline-variant/10">
                        <p class="text-body-md text-on-surface whitespace-pre-wrap">{{ m.observaciones }}</p>
                      </div>
                    } @else {
                      <div class="flex flex-col items-center justify-center py-10 text-center">
                        <span class="material-symbols-outlined text-5xl text-outline-variant" style="font-variation-settings:'FILL' 1">note_alt</span>
                        <p class="mt-3 text-body-md text-on-surface-variant">Sin observaciones registradas</p>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Owner Card -->
          @if (duenio(); as d) {
            <div class="glass-card rounded-2xl shadow-sm p-5">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-label-md font-bold">
                  {{ getDuenioInitials(d) }}
                </div>
                <div>
                  <p class="text-label-md font-semibold text-on-surface">{{ d.nombres }} {{ d.apellidos }}</p>
                  <p class="text-label-sm text-on-surface-variant">Dueño</p>
                </div>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[18px] text-on-surface-variant">phone</span>
                  <span class="text-body-sm text-on-surface">{{ d.telefono }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[18px] text-on-surface-variant">mail</span>
                  <span class="text-body-sm text-on-surface">{{ d.email }}</span>
                </div>
                @if (d.direccion) {
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-[18px] text-on-surface-variant">location_on</span>
                    <span class="text-body-sm text-on-surface">{{ d.direccion }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Medical Timeline -->
          <div class="glass-card rounded-2xl shadow-sm p-5">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-[20px] text-primary">timeline</span>
              <h3 class="text-label-md font-bold text-on-surface">Línea de Tiempo</h3>
            </div>
            @if (timelineEvents().length === 0) {
              <p class="text-body-sm text-on-surface-variant text-center py-4">Sin eventos registrados</p>
            } @else {
              <div class="space-y-0">
                @for (event of timelineEvents(); track event.id; let last = $last) {
                  <div class="relative pl-6 pb-4">
                    @if (!last) {
                      <span class="absolute left-[7px] top-3 bottom-0 w-px bg-outline-variant/30"></span>
                    }
                    <span class="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center"
                          [class.border-primary]="event.type === 'atencion'"
                          [class.border-tertiary]="event.type === 'vacuna'"
                          [class.border-secondary]="event.type === 'cita'">
                      <span class="w-[7px] h-[7px] rounded-full"
                            [class.bg-primary]="event.type === 'atencion'"
                            [class.bg-tertiary]="event.type === 'vacuna'"
                            [class.bg-secondary]="event.type === 'cita'"></span>
                    </span>
                    <p class="text-label-sm font-semibold text-on-surface">{{ event.title }}</p>
                    <p class="text-body-sm text-on-surface-variant">{{ event.description }}</p>
                    <p class="text-label-sm text-on-surface-variant/60 mt-0.5">{{ event.date | date:'dd/MM/yyyy' }}</p>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  </div>
  `
})
export class MascotaProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private mascotaService = inject(MascotaService);
  private duenioService = inject(DuenioService);
  private atencionClinicaService = inject(AtencionClinicaService);
  private vacunaService = inject(VacunaService);
  private citaService = inject(CitaService);
  protected auth = inject(AuthService);

  mascota = signal<MascotaResponse | null>(null);
  duenio = signal<DuenioResponse | null>(null);
  loading = signal(true);
  activeTab = signal<TabType>('historial');

  backRoute = computed(() => this.auth.isDuenioOnly() || this.auth.isAsistente() ? '/mascotas' : '/atencion-clinica');
  backLabel = computed(() => this.auth.isDuenioOnly() || this.auth.isAsistente() ? 'Volver a mascotas' : 'Volver a atenci\u00f3n cl\u00ednica');

  historia = signal<HistoriaClinicaResponse | null>(null);
  historiaLoading = signal(false);
  vacunas = signal<VacunaMascotaResponse[]>([]);
  vacunasLoading = signal(false);
  citas = signal<CitaResponse[]>([]);
  citasLoading = signal(false);

  tabs = [
    { key: 'historial' as TabType, label: 'Historial Clínico' },
    { key: 'vacunas' as TabType, label: 'Vacunas' },
    { key: 'citas' as TabType, label: 'Citas' },
    { key: 'observaciones' as TabType, label: 'Observaciones' },
  ];

  timelineEvents = computed(() => {
    const events: { id: string; type: 'atencion' | 'vacuna' | 'cita'; title: string; description: string; date: string }[] = [];

    const h = this.historia();
    if (h) {
      for (const a of h.atenciones) {
        events.push({ id: `atencion-${a.id}`, type: 'atencion', title: a.motivo, description: a.diagnostico, date: a.fechaRegistro });
      }
    }

    for (const v of this.vacunas()) {
      events.push({ id: `vacuna-${v.id}`, type: 'vacuna', title: v.vacunaNombre, description: `Aplicada por ${v.veterinarioNombreCompleto}`, date: v.fechaAplicacion });
    }

    for (const c of this.citas()) {
      events.push({ id: `cita-${c.id}`, type: 'cita', title: c.motivo, description: `${c.fecha} ${c.horaInicio}`, date: c.fecha });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadMascota(id);
      this.loadHistoria(id);
      this.loadVacunas(id);
      this.loadCitas(id);
    }
  }

  private loadMascota(id: number): void {
    this.mascotaService.findById(id).pipe(catchError(() => EMPTY)).subscribe({
      next: (m) => {
        this.mascota.set(m);
        this.loadDuenio(m.duenioId);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadDuenio(duenioId: number): void {
    this.duenioService.findById(duenioId).pipe(catchError(() => EMPTY)).subscribe({
      next: (d) => this.duenio.set(d),
    });
  }

  private loadHistoria(mascotaId: number): void {
    this.historiaLoading.set(true);
    this.atencionClinicaService.findHistoriaClinica(mascotaId).subscribe({
      next: (h) => { this.historia.set(h); this.historiaLoading.set(false); },
      error: () => this.historiaLoading.set(false),
    });
  }

  private loadVacunas(mascotaId: number): void {
    this.vacunasLoading.set(true);
    this.vacunaService.findByMascota(mascotaId).subscribe({
      next: (v) => { this.vacunas.set(v); this.vacunasLoading.set(false); },
      error: () => this.vacunasLoading.set(false),
    });
  }

  private loadCitas(mascotaId: number): void {
    this.citasLoading.set(true);
    this.citaService.findAll({ mascotaId }).subscribe({
      next: (c) => { this.citas.set(c); this.citasLoading.set(false); },
      error: () => this.citasLoading.set(false),
    });
  }

  getInitials(nombre: string): string {
    return nombre.charAt(0).toUpperCase();
  }

  getDuenioInitials(d: DuenioResponse): string {
    return (d.nombres.charAt(0) + d.apellidos.charAt(0)).toUpperCase();
  }

  especieLabel(especie: string): string {
    const map: Record<string, string> = { CANINO: 'Canino', FELINO: 'Felino', EXOTICO: 'Exótico' };
    return map[especie] || especie;
  }

  sexoLabel(sexo: string): string {
    const map: Record<string, string> = { MACHO: 'Macho', HEMBRA: 'Hembra' };
    return map[sexo] || sexo;
  }

  sexoIcon(sexo: string): string {
    return sexo === 'MACHO' ? 'male' : 'female';
  }

  citaEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'Programada',
      CONFIRMADA: 'Confirmada',
      CANCELADA: 'Cancelada',
      ATENDIDA: 'Atendida',
      NO_ASISTIO: 'No Asistió',
    };
    return map[estado] || estado;
  }
}
