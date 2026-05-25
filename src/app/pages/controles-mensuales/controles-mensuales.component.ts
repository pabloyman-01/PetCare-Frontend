import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ControlMensualService } from '../../core/services/control-mensual.service';
import { MascotaService } from '../../core/services/mascota.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ControlMensualMascotaResponse, ControlMensualMascotaRequest } from '../../core/models/atencion-clinica.model';
import { MascotaResponse } from '../../core/models/mascota.model';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-controles-mensuales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LoadingSpinnerComponent,
  ],
  template: `
  <div class="flex flex-col gap-6 pb-8">

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-headline-lg font-extrabold text-on-surface tracking-tight">Control Mensual</h1>
        <p class="text-on-surface-variant font-body-md text-body-md">Seguimiento antropom&eacute;trico y evoluci&oacute;n de salud.</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <!-- Pet Selector -->
        <div class="relative">
          <select [ngModel]="selectedMascotaId()" (ngModelChange)="selectMascota($event)"
                  class="appearance-none bg-surface-container-lowest border border-outline-variant rounded-full pl-4 pr-10 py-2 font-body-sm text-body-sm focus:ring-primary cursor-pointer min-w-[240px]">
            <option [ngValue]="null">Seleccionar mascota...</option>
            @for (m of uniqueMascotas(); track m.id) {
              <option [ngValue]="m.id">{{ m.nombre }} &mdash; {{ m.duenioNombreCompleto }}</option>
            }
          </select>
          <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none">expand_more</span>
        </div>
        @if (selectedMascotaId()) {
          <button (click)="openCreateForm()"
                  class="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md text-label-md flex items-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[20px]">add</span>
            Registrar Nueva Medici&oacute;n
          </button>
        }
      </div>
    </div>

    @if (!selectedMascotaId()) {
      <div class="flex flex-col items-center justify-center py-20 text-center bg-surface rounded-2xl border border-outline-variant shadow-sm">
        <span class="material-symbols-outlined text-6xl text-outline-variant">pets</span>
        <h3 class="text-headline-md font-bold text-on-surface mt-4">Seleccione una Mascota</h3>
        <p class="text-body-md text-on-surface-variant mt-2">Elija una mascota para ver sus controles mensuales</p>
      </div>
    } @else if (loading()) {
      <app-loading-spinner message="Cargando controles..." />
    } @else {
      <!-- Dashboard Layout Grid -->
      <div class="grid grid-cols-12 gap-6">

        <!-- Summary Panel Cards (Left) -->
        <div class="col-span-12 lg:col-span-4 space-y-6">

          <!-- Current Weight -->
          <div class="bg-primary-container p-6 rounded-xl shadow-sm border border-outline-variant relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-10 scale-150 group-hover:scale-[2] transition-transform duration-700">
              <span class="material-symbols-outlined text-[100px]" style="font-variation-settings:'FILL' 1">weight</span>
            </div>
            <p class="text-on-primary-container/80 font-label-md text-label-md uppercase tracking-wider">Peso Actual</p>
            <div class="flex items-baseline gap-2 mt-2">
              <h2 class="text-on-primary-container font-display-lg text-display-lg font-extrabold">{{ latestControl?.pesoKg ?? '--' }}</h2>
              <span class="text-on-primary-container/80 font-headline-md text-headline-md">kg</span>
            </div>
            <div class="mt-4 flex items-center gap-1.5 text-secondary-container bg-on-secondary-container/20 w-fit px-3 py-1 rounded-full text-label-sm font-bold">
              <span class="material-symbols-outlined text-[16px]">trending_up</span>
              <span>{{ pesoDiff() }}</span>
            </div>
          </div>

          <!-- BMI Indicator -->
          <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-on-surface-variant font-label-md text-label-md">&Iacute;ndice de Masa Corporal (IMC)</p>
                <h2 class="text-on-surface font-headline-md text-headline-md mt-1">
                  {{ bmiValue() }} <span class="text-secondary font-label-md" [class.text-error]="bmiStatus() === 'Sobrepeso'" [class.text-tertiary]="bmiStatus() === 'Bajo Peso'">{{ bmiStatus() }}</span>
                </h2>
              </div>
              <span class="material-symbols-outlined text-secondary bg-secondary-container/30 p-2 rounded-lg">health_metrics</span>
            </div>
            <div class="mt-6 space-y-2">
              <div class="h-2 w-full bg-surface-container rounded-full flex overflow-hidden">
                <div class="h-full bg-tertiary-container w-[15%]"></div>
                <div class="h-full bg-secondary w-[60%] border-x-2 border-surface-container-lowest"></div>
                <div class="h-full bg-error-container w-[25%]"></div>
              </div>
              <div class="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase">
                <span>Bajo Peso</span>
                <span>Normal</span>
                <span>Sobrepeso</span>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          <div class="bg-surface-container-high/40 p-6 rounded-xl border border-outline-variant shadow-sm">
            <h3 class="text-headline-md font-bold text-on-surface flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-tertiary">restaurant</span>
              Recomendaciones
            </h3>
            @if (latestControl; as last) {
              @if (last.recomendaciones) {
                <div class="p-3 bg-surface-container-lowest rounded-lg border-l-4 border-primary">
                  <p class="text-label-md font-bold text-on-surface">&Uacute;ltima Recomendaci&oacute;n</p>
                  <p class="text-body-sm text-on-surface-variant mt-1">{{ last.recomendaciones }}</p>
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center py-6 text-center">
                  <span class="material-symbols-outlined text-3xl text-outline-variant">restaurant</span>
                  <p class="text-body-sm text-on-surface-variant mt-2">No hay recomendaciones registradas</p>
                </div>
              }
            } @else {
              <div class="flex flex-col items-center justify-center py-6 text-center">
                <span class="material-symbols-outlined text-3xl text-outline-variant">restaurant</span>
                <p class="text-body-sm text-on-surface-variant mt-2">No hay recomendaciones registradas</p>
              </div>
            }
          </div>

        </div>

        <!-- Main Content Area (Right) -->
        <div class="col-span-12 lg:col-span-8 space-y-6">

          <!-- Growth Chart -->
          @if (controles().length > 1) {
            <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant">
              <div class="flex items-center justify-between mb-8">
                <div>
                  <h3 class="text-headline-md font-bold text-on-surface">Curva de Crecimiento</h3>
                  <p class="text-on-surface-variant font-body-sm">Evoluci&oacute;n del peso en los &uacute;ltimos controles (kg)</p>
                </div>
              </div>
              <div class="h-[280px] w-full relative flex items-end justify-between px-2 pt-10">
                <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  @for (i of [1,2,3,4,5]; track i) {
                    <div class="border-b border-outline-variant/30 w-full h-0"></div>
                  }
                </div>
                <div class="flex items-end gap-1 w-full h-full justify-around z-10">
                  @for (c of controles(); track c.id) {
                    <div class="w-8 rounded-t-sm transition-colors cursor-help relative group"
                         [ngClass]="{
                           'bg-primary/10 hover:bg-primary/20': !$last,
                           'bg-primary hover:opacity-80': $last
                         }"
                         [style.height.%]="barHeight(c)">
                      <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-label-sm px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-20">
                        {{ c.pesoKg }} kg
                      </div>
                    </div>
                  }
                </div>
              </div>
              <div class="flex justify-between mt-4 px-2 text-[10px] text-on-surface-variant font-bold uppercase">
                @for (c of controles(); track c.id) {
                  <span>{{ c.mes }}/{{ c.anio }}</span>
                }
              </div>
            </div>
          }

          <!-- Historical Table -->
          <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div class="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
              <h3 class="text-headline-md font-bold text-on-surface">Hist&oacute;rico de Medidas</h3>
            </div>
            @if (controles().length === 0) {
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <span class="material-symbols-outlined text-4xl text-outline-variant">assignment_off</span>
                <p class="text-body-sm text-on-surface-variant mt-2">No hay controles registrados para esta mascota</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-surface-container-low/50 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <th class="px-6 py-4">Fecha</th>
                      <th class="px-6 py-4">Peso</th>
                      <th class="px-6 py-4">Alimentaci&oacute;n</th>
                      <th class="px-6 py-4">Observaciones</th>
                      <th class="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant">
                    @for (c of controles(); track c.id) {
                      <tr class="hover:bg-surface-container-low/50 transition-colors">
                        <td class="px-6 py-4 font-label-md text-on-surface">{{ c.fechaControl }}</td>
                        <td class="px-6 py-4">
                          <span class="text-body-md font-bold">{{ c.pesoKg ? c.pesoKg + ' kg' : 'N/A' }}</span>
                        </td>
                        <td class="px-6 py-4 text-body-md text-on-surface-variant">{{ c.alimentacion || 'N/A' }}</td>
                        <td class="px-6 py-4 text-body-md text-on-surface-variant max-w-[200px] truncate">{{ c.observaciones || 'N/A' }}</td>
                        <td class="px-6 py-4 text-right">
                          <button (click)="openEditForm(c)"
                                  class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">more_vert</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

        </div>
      </div>
    }

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-lg w-full" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">
              {{ editingControl() ? 'Editar Control' : 'Nuevo Control Mensual' }}
            </h3>
            <button (click)="closeForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <form [formGroup]="controlForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Fecha de Control</label>
                <input type="date" formControlName="fechaControl"
                       class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary" />
                @if (controlForm.get('fechaControl')?.invalid && submitted) {
                  <p class="text-label-sm text-error">La fecha es obligatoria</p>
                }
              </div>
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Peso (kg)</label>
                <input type="number" formControlName="pesoKg" min="0" step="0.1" placeholder="Ej: 5.2"
                       class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary" />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Alimentaci&oacute;n (opcional)</label>
              <input type="text" formControlName="alimentacion" placeholder="Tipo de alimentaci&oacute;n"
                     class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary" />
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Observaciones (opcional)</label>
              <textarea formControlName="observaciones" rows="2" placeholder="Observaciones del control"
                        class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary resize-none"></textarea>
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Recomendaciones (opcional)</label>
              <textarea formControlName="recomendaciones" rows="2" placeholder="Recomendaciones para el due&ntilde;o"
                        class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary resize-none"></textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="closeForm()" class="btn btn-ghost">Cancelar</button>
              <button type="submit" [disabled]="saving()"
                      class="btn btn-primary" [class.btn-disabled]="saving()">
                @if (saving()) {
                  <span class="loading loading-spinner"></span>
                }
                {{ editingControl() ? 'Guardar Cambios' : 'Crear Control' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  </div>
  `
})
export class ControlesMensualesComponent implements OnInit {
  private controlMensualService = inject(ControlMensualService);
  private mascotaService = inject(MascotaService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  mascotas = signal<MascotaResponse[]>([]);
  uniqueMascotas = computed(() => {
    const seen = new Set<string>();
    return this.mascotas().filter(m => {
      if (!m.active) return false;
      const key = m.nombre.toLowerCase() + '-' + m.duenioId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  selectedMascotaId = signal<number | null>(null);
  controles = signal<ControlMensualMascotaResponse[]>([]);
  loading = signal(false);

  showForm = signal(false);
  editingControl = signal<ControlMensualMascotaResponse | null>(null);
  saving = signal(false);
  submitted = false;

  controlForm = this.fb.group({
    fechaControl: ['', Validators.required],
    pesoKg: [null as number | null],
    alimentacion: [''],
    observaciones: [''],
    recomendaciones: [''],
  });

  get latestControl(): ControlMensualMascotaResponse | null {
    const list = this.controles();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  pesoDiff = computed(() => {
    const list = this.controles();
    if (list.length < 2) return 'Sin datos previos';
    const last = list[list.length - 1].pesoKg ?? 0;
    const prev = list[list.length - 2].pesoKg ?? 0;
    const diff = last - prev;
    return diff >= 0 ? `+${diff.toFixed(1)} kg vs mes anterior` : `${diff.toFixed(1)} kg vs mes anterior`;
  });

  bmiValue = computed(() => {
    const peso = this.latestControl?.pesoKg;
    if (!peso) return '--';
    return (peso / 2.5).toFixed(1);
  });

  bmiStatus = computed(() => {
    const peso = this.latestControl?.pesoKg;
    if (!peso) return 'N/A';
    if (peso < 5) return 'Bajo Peso';
    if (peso > 10) return 'Sobrepeso';
    return 'Ideal';
  });

  ngOnInit(): void {
    this.loadMascotas();
  }

  private loadMascotas(): void {
    this.mascotaService.findAll(undefined, undefined, true).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.mascotas.set(data),
    });
  }

  selectMascota(mascotaId: number | null): void {
    this.selectedMascotaId.set(mascotaId);
    this.controles.set([]);
    if (!mascotaId) return;
    this.loading.set(true);
    this.controlMensualService.findByMascota(mascotaId).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.controles.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  barHeight(c: ControlMensualMascotaResponse): number {
    const list = this.controles();
    const maxWeight = Math.max(...list.map(x => x.pesoKg ?? 0), 1);
    return ((c.pesoKg ?? 0) / maxWeight) * 100;
  }

  openCreateForm(): void {
    this.editingControl.set(null);
    this.controlForm.reset({
      fechaControl: '',
      pesoKg: null,
      alimentacion: '',
      observaciones: '',
      recomendaciones: '',
    });
    this.submitted = false;
    this.showForm.set(true);
  }

  openEditForm(c: ControlMensualMascotaResponse): void {
    this.editingControl.set(c);
    this.controlForm.patchValue({
      fechaControl: c.fechaControl,
      pesoKg: c.pesoKg,
      alimentacion: c.alimentacion,
      observaciones: c.observaciones,
      recomendaciones: c.recomendaciones,
    });
    this.submitted = false;
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingControl.set(null);
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.controlForm.invalid) return;

    const mascotaId = this.selectedMascotaId();
    if (!mascotaId) return;

    this.saving.set(true);
    const fv = this.controlForm.value;
    const req: ControlMensualMascotaRequest = {
      veterinarioId: 0,
      fechaControl: fv.fechaControl!,
      pesoKg: fv.pesoKg ?? undefined,
      alimentacion: fv.alimentacion || undefined,
      observaciones: fv.observaciones || undefined,
      recomendaciones: fv.recomendaciones || undefined,
    };

    const obs = this.editingControl()
      ? this.controlMensualService.update(this.editingControl()!.id, req)
      : this.controlMensualService.create(mascotaId, req);

    obs.pipe(catchError(() => EMPTY)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.selectMascota(mascotaId);
      },
      error: () => this.saving.set(false),
    });
  }
}
