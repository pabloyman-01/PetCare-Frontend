import { Component, DestroyRef, OnInit, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CitaService } from '../../core/services/cita.service';
import { AtencionClinicaService } from '../../core/services/atencion-clinica.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { CitaResponse } from '../../core/models/cita.model';
import { AtencionClinicaRequest, HistoriaClinicaResponse } from '../../core/models/atencion-clinica.model';
import { EstadoMascota } from '../../core/models/mascota.model';
import { defer, finalize, forkJoin, Subscription, take } from 'rxjs';

function vitalValidator(minimum: number, integer = false): ValidatorFn {
  return ({ value }) => value == null || value === '' ||
    (typeof value === 'number' && Number.isFinite(value) && value >= minimum && value > 0 && (!integer || Number.isInteger(value)))
    ? null : { vital: true };
}

interface MedicationRow {
  medicamento: string;
  dosis: string;
  frecuencia: string;
}

@Component({
  selector: 'app-atencion-clinica',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LoadingSpinnerComponent,
    RouterLink,
  ],
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #d3e4fe; border-radius: 10px; }
    .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); }
  `],
  template: `
  <div class="flex flex-col gap-6 pb-8">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Atenci&oacute;n Cl&iacute;nica</h2>
        <p class="text-body-md text-on-surface-variant">Registro de atenci&oacute;n cl&iacute;nica para mascotas</p>
      </div>
    </div>

    @if (loadError()) {
      <div role="alert" class="text-error text-body-sm">
        {{ loadError() }} <button type="button" class="underline" (click)="loadCitas()">Reintentar</button>
      </div>
    }
    @if (loading()) {
      <app-loading-spinner message="Cargando citas..." />
    } @else {
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- Citas Pendientes Sidebar -->
        <aside class="lg:col-span-3">
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div class="border-b border-outline-variant p-4 bg-surface-container-low">
              <h4 class="font-label-md text-label-md flex items-center gap-2 text-primary">
                <span class="material-symbols-outlined">calendar_month</span>
                CITAS PENDIENTES
              </h4>
            </div>
            <div class="p-3 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              @if (citasPendientes().length === 0) {
                <div class="flex flex-col items-center justify-center py-8 text-center">
                  <span class="material-symbols-outlined text-3xl text-outline-variant">check_circle</span>
                  <p class="mt-2 text-body-sm text-on-surface-variant">No hay citas pendientes</p>
                </div>
              } @else {
                @for (cita of citasPendientes(); track cita.id) {
                  <div (click)="selectCita(cita)"
                       class="p-3 rounded-xl cursor-pointer transition-all duration-200 border"
                       [ngClass]="{
                         'bg-primary-container/20 border-primary': selectedCita()?.id === cita.id,
                         'border-outline-variant/30 hover:bg-surface-container-low': selectedCita()?.id !== cita.id
                       }">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-primary text-[20px]">pets</span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-label-sm font-semibold text-on-surface truncate">{{ cita.mascotaNombre }}</p>
                        <p class="text-[11px] text-on-surface-variant truncate">{{ cita.duenioNombreCompleto }}</p>
                        <p class="text-[11px] text-on-surface-variant">{{ cita.horaInicio.slice(0, 5) }} - {{ cita.duracionMinutos }}min</p>
                      </div>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            [ngClass]="{
                              'bg-secondary-container/60 text-on-secondary-container': cita.estado === 'PROGRAMADA',
                              'bg-primary-container/60 text-primary': cita.estado === 'CONFIRMADA'
                            }">
                        {{ cita.estado === 'PROGRAMADA' ? 'Prog.' : 'Conf.' }}
                      </span>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="lg:col-span-9 space-y-6">

          @if (!selectedCita()) {
            <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-12">
              <div class="flex flex-col items-center justify-center py-16 text-center">
                <span class="material-symbols-outlined text-6xl text-outline-variant">stethoscope</span>
                <h3 class="text-headline-md font-bold text-on-surface mt-4">Seleccione una Cita</h3>
                <p class="text-body-md text-on-surface-variant mt-2">Elija una cita de la lista para registrar la atenci&oacute;n cl&iacute;nica</p>
              </div>
            </div>
          } @else {
            <!-- Patient Summary Card -->
            <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-6 min-w-0">
                <div class="relative flex-shrink-0">
                  <div class="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-4xl">pets</span>
                  </div>
                  <span class="absolute bottom-0 right-0 w-6 h-6 bg-secondary rounded-full border-4 border-surface-container-lowest flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-[12px]" style="font-variation-settings:'FILL' 1">check</span>
                  </span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-3 flex-wrap">
                    <h3 class="text-headline-md font-bold text-on-surface truncate">{{ selectedCita()!.mascotaNombre }}</h3>
                    <span class="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-label-sm font-semibold rounded-full">Cita {{ estadoLabel(selectedCita()!.estado) }}</span>
                  </div>
                  <p class="text-on-surface-variant font-body-sm truncate">Mascota &bull; {{ selectedCita()!.duenioNombreCompleto }}</p>
                  <div class="flex gap-4 mt-2 flex-wrap">
                    <span class="flex items-center gap-1 text-on-surface-variant text-label-sm">
                      <span class="material-symbols-outlined text-[16px]">person</span>
                      Due&ntilde;o: {{ selectedCita()!.duenioNombreCompleto }}
                    </span>
                    <span class="flex items-center gap-1 text-on-surface-variant text-label-sm">
                      <span class="material-symbols-outlined text-[16px]">schedule</span>
                      {{ selectedCita()!.fecha }} {{ selectedCita()!.horaInicio.slice(0, 5) }}
                    </span>
                  </div>
                </div>
              </div>
              <a [routerLink]="'/mascotas/' + selectedCita()!.mascotaId"
                 class="flex-shrink-0 self-start sm:self-auto px-4 py-2 bg-surface-container text-primary font-label-md rounded-lg border border-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">visibility</span>
                Ver Ficha Completa
              </a>
            </section>

            <!-- Form + Vitals Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

              <!-- Left Column: Form (8-col) -->
              <div class="lg:col-span-8 space-y-6">

                <!-- Motivo -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                  <div class="border-b border-outline-variant p-4 bg-surface-container-low">
                    <h4 class="font-label-md text-label-md flex items-center gap-2 text-primary">
                      <span class="material-symbols-outlined">edit_note</span>
                      DETALLES DE LA CONSULTA
                    </h4>
                  </div>
                  <div class="p-6 space-y-6">
                    <div>
                      <label class="block font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider">Motivo de la Consulta</label>
                      <input [formControl]="atencionForm.controls.motivo"
                             class="w-full bg-surface-container-low border-outline-variant rounded-lg focus:ring-2 focus:ring-primary p-3 font-body-md transition-all"
                             placeholder="Ej. Control de vacunas, Revisi&oacute;n de o&iacute;do derecho..."
                             type="text" />
                    </div>
                    <div>
                      <label class="block font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider">Diagn&oacute;stico / Observaciones</label>
                      <textarea [formControl]="atencionForm.controls.diagnostico"
                                class="w-full bg-surface-container-low border-outline-variant rounded-lg focus:ring-2 focus:ring-primary p-3 font-body-md transition-all resize-none"
                                placeholder="Ingrese hallazgos cl&iacute;nicos, comportamiento del paciente..."
                                rows="5"></textarea>
                    </div>
                    <div>
                      <label class="block font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider">Tratamiento e Indicaciones</label>
                      <textarea [formControl]="atencionForm.controls.tratamiento"
                                class="w-full bg-surface-container-low border-outline-variant rounded-lg focus:ring-2 focus:ring-primary p-3 font-body-md transition-all resize-none"
                                placeholder="Pasos a seguir por el dueño en casa..."
                                rows="3"></textarea>
                    </div>
                  </div>
                </div>

                <!-- Rx / Medication -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                  <div class="border-b border-outline-variant p-4 bg-surface-container-low flex justify-between items-center">
                    <h4 class="font-label-md text-label-md flex items-center gap-2 text-primary">
                      <span class="material-symbols-outlined">prescriptions</span>
                      RECETA M&Eacute;DICA / MEDICAMENTOS
                    </h4>
                    <button (click)="addMedication()"
                            class="flex items-center gap-1 text-primary hover:bg-primary-container/10 px-3 py-1 rounded-full transition-all text-label-sm">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                      A&ntilde;adir Medicamento
                    </button>
                  </div>
                  <div class="p-6">
                    <p class="text-body-sm text-on-surface-variant mb-4">Los medicamentos se guardan como texto al final del tratamiento. Complete nombre, dosis y frecuencia; las filas vac&iacute;as se omiten.</p>
                    @if (medications().length === 0) {
                      <div class="text-center py-8">
                        <p class="text-on-surface-variant opacity-60 italic">No se han a&ntilde;adido medicamentos a la receta.</p>
                      </div>
                    } @else {
                      <div class="space-y-4">
                        @for (med of medications(); track med; let i = $index) {
                          <div class="grid grid-cols-12 gap-4 items-end">
                            <div class="col-span-5">
                              <label class="block text-[11px] font-bold text-on-surface-variant mb-1 ml-1">MEDICAMENTO</label>
                              <input [(ngModel)]="med.medicamento" [ngModelOptions]="{standalone: true}"
                                     class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary"
                                     placeholder="Ej. Amoxicilina 500mg" type="text" />
                            </div>
                            <div class="col-span-3">
                              <label class="block text-[11px] font-bold text-on-surface-variant mb-1 ml-1">DOSIS</label>
                              <input [(ngModel)]="med.dosis" [ngModelOptions]="{standalone: true}"
                                     class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary"
                                     placeholder="Ej. 1 tableta" type="text" />
                            </div>
                            <div class="col-span-3">
                              <label class="block text-[11px] font-bold text-on-surface-variant mb-1 ml-1">FRECUENCIA</label>
                              <input [(ngModel)]="med.frecuencia" [ngModelOptions]="{standalone: true}"
                                     class="w-full bg-surface-container-low border-outline-variant rounded-lg p-2.5 text-body-sm focus:ring-primary"
                                     placeholder="Ej. C/ 12 horas" type="text" />
                            </div>
                            <div class="col-span-1 flex justify-center pb-2">
                              <button (click)="removeMedication(i)"
                                      class="text-on-surface-variant/40 hover:text-error transition-colors">
                                <span class="material-symbols-outlined">delete</span>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Extra fields -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label class="block font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider">Recomendaciones</label>
                      <textarea [formControl]="atencionForm.controls.recomendaciones"
                                class="w-full bg-surface-container-low border-outline-variant rounded-lg focus:ring-2 focus:ring-primary p-3 font-body-md transition-all resize-none"
                                placeholder="Recomendaciones (opcional)" rows="3"></textarea>
                    </div>
                    <div>
                      <label class="block font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider">Observaciones Cl&iacute;nicas</label>
                      <textarea [formControl]="atencionForm.controls.observacionesClinicas"
                                class="w-full bg-surface-container-low border-outline-variant rounded-lg focus:ring-2 focus:ring-primary p-3 font-body-md transition-all resize-none"
                                placeholder="Observaciones (opcional)" rows="3"></textarea>
                    </div>
                  </div>
                  <div class="mt-6">
                    <label class="block font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider">Notas Internas</label>
                    <textarea [formControl]="atencionForm.controls.notasInternas"
                              class="w-full bg-surface-container-low border-outline-variant rounded-lg focus:ring-2 focus:ring-primary p-3 font-body-md transition-all resize-none"
                              placeholder="Notas internas (solo visibles para el equipo)" rows="2"></textarea>
                  </div>
                </div>

              </div>

              <!-- Right Column: Vitals + History (4-col) -->
              <div class="lg:col-span-4 space-y-6">

                <!-- Vital Signs -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                  <div class="border-b border-outline-variant p-4 bg-surface-container-low">
                    <h4 class="font-label-md text-label-md flex items-center gap-2 text-primary">
                      <span class="material-symbols-outlined">vital_signs</span>
                      CONSTANTES VITALES
                    </h4>
                  </div>
                  <div class="p-6 grid grid-cols-1 gap-6">
                    <p class="text-body-sm text-on-surface-variant">Las constantes vitales se guardan como texto al final de las observaciones cl&iacute;nicas.</p>
                    <!-- Peso -->
                    <div class="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-primary">scale</span>
                        <div>
                          <p class="text-[10px] font-bold text-on-surface-variant uppercase">Peso</p>
                          <div class="flex items-baseline gap-1">
                            <input [formControl]="atencionForm.controls.pesoKg"
                                   class="bg-transparent border-none p-0 w-14 font-headline-md text-headline-md font-bold focus:ring-0" type="number" min="0.01" step="0.01" />
                            <span class="text-label-md text-on-surface-variant">kg</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- Temperatura -->
                    <div class="flex items-center justify-between p-3 bg-tertiary/5 rounded-lg border border-tertiary/10">
                      <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-tertiary">thermostat</span>
                        <div>
                          <p class="text-[10px] font-bold text-on-surface-variant uppercase">Temperatura</p>
                          <div class="flex items-baseline gap-1">
                            <input [formControl]="atencionForm.controls.temperatura"
                                   class="bg-transparent border-none p-0 w-14 font-headline-md text-headline-md font-bold focus:ring-0" type="number" step="0.1" />
                            <span class="text-label-md text-on-surface-variant">&deg;C</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- Frecuencia Cardíaca -->
                    <div class="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                      <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-secondary">favorite</span>
                        <div>
                          <p class="text-[10px] font-bold text-on-surface-variant uppercase">Frec. Card&iacute;aca</p>
                          <div class="flex items-baseline gap-1">
                            <input [formControl]="atencionForm.controls.frecuenciaCardiaca"
                                   class="bg-transparent border-none p-0 w-14 font-headline-md text-headline-md font-bold focus:ring-0" type="number" />
                            <span class="text-label-md text-on-surface-variant">lpm</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- History Timeline -->
                <div class="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col">
                  <h4 class="font-label-md text-label-md text-on-surface mb-4">Resumen de Historial</h4>
                  @if (historyLoading()) {
                    <p role="status">Cargando historial...</p>
                  } @else if (historyError()) {
                    <p role="alert" class="text-error">{{ historyError() }}</p>
                    <button type="button" class="text-primary underline" (click)="loadHistoriaClinica()">Reintentar historial</button>
                  } @else if (historiaClinica() && historiaClinica()!.atenciones.length > 0) {
                    <div class="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 flex-1">
                      @for (a of historiaClinica()!.atenciones; track a.id) {
                        <div class="relative pl-6 border-l-2 border-primary-fixed-dim">
                          <span class="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary"></span>
                          <p class="text-label-sm font-bold text-on-surface">{{ a.fechaRegistro | date:'dd MMM yyyy' }}</p>
                          <p class="text-body-sm text-on-surface-variant leading-tight">{{ a.motivo }}</p>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="flex flex-col items-center justify-center py-6 text-center flex-1">
                      <span class="material-symbols-outlined text-3xl text-outline-variant">history</span>
                      <p class="mt-2 text-body-sm text-on-surface-variant">Sin historial previo</p>
                    </div>
                  }
                  @if (selectedCita()) {
                    <a [routerLink]="'/mascotas/' + selectedCita()!.mascotaId"
                       class="mt-4 pt-3 border-t border-outline-variant/20 text-primary font-label-md hover:underline flex items-center justify-center gap-1">
                      Ver todo el historial <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </a>
                  }
                </div>

              </div>
            </div>

            <!-- Estado Mascota -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <h4 class="font-label-md text-label-md text-on-surface mb-4">Estado actual de la mascota</h4>
              <select [formControl]="atencionForm.controls.estadoMascota" class="input input-bordered w-full">
                <option value="">Seleccionar estado...</option>
                <option value="SALUDABLE">Saludable</option>
                <option value="EN_OBSERVACION">En observaci&oacute;n</option>
                <option value="EN_TRATAMIENTO">En tratamiento</option>
                <option value="CRITICO">Cr&iacute;tico</option>
              </select>
              @if (submitted && atencionForm.controls.estadoMascota.invalid) {
                <p class="text-error text-body-sm mt-1">Debe seleccionar el estado actual de la mascota.</p>
              }
            </div>

            <!-- Bottom Action Bar -->
            @if (submitted && atencionForm.invalid) {
              <div role="alert" class="text-error text-body-sm">
                @for (message of invalidFields(); track message) { <p>{{ message }}</p> }
              </div>
            }
            @if (submitError()) {
              <p role="alert" class="text-error text-body-sm">{{ submitError() }}</p>
            }
            <div class="sticky bottom-0 bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 z-30">
              <div class="flex gap-3">
                <button type="button" (click)="clearSelection()" [disabled]="saving()"
                        class="flex items-center gap-2 px-5 py-2.5 bg-surface-container text-on-surface font-label-md rounded-xl hover:bg-surface-container-high transition-all">
                  <span class="material-symbols-outlined">close</span>
                  Cancelar
                </button>
              </div>
              <div class="flex gap-4">
                <button (click)="onSubmit()" [disabled]="saving()"
                        class="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        [class.opacity-60]="saving()">
                  @if (saving()) {
                    <span class="loading loading-spinner loading-sm"></span>
                  } @else {
                    <span class="material-symbols-outlined">save</span>
                  }
                  FINALIZAR ATENCI&Oacute;N Y GUARDAR
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  </div>
  `
})
export class AtencionClinicaComponent implements OnInit {
  private citaService = inject(CitaService);
  private atencionClinicaService = inject(AtencionClinicaService);
  protected auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private citasSubscription?: Subscription;
  private historySubscription?: Subscription;

  citas = signal<CitaResponse[]>([]);
  loading = signal(true);
  saving = signal(false);
  loadError = signal('');
  submitError = signal('');
  historyError = signal('');
  historyLoading = signal(false);
  submitted = false;
  selectedCita = signal<CitaResponse | null>(null);
  historiaClinica = signal<HistoriaClinicaResponse | null>(null);
  medications = signal<MedicationRow[]>([]);

  atencionForm = this.fb.group({
    motivo: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(250)]],
    diagnostico: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)]],
    tratamiento: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)]],
    recomendaciones: ['', Validators.maxLength(1000)],
    observacionesClinicas: ['', Validators.maxLength(1000)],
    notasInternas: ['', Validators.maxLength(1000)],
    pesoKg: [null as number | null, vitalValidator(0.01)],
    temperatura: [null as number | null, vitalValidator(0)],
    frecuenciaCardiaca: [null as number | null, vitalValidator(1, true)],
    estadoMascota: ['', Validators.required],
  });

  citasPendientes = computed(() =>
    this.citas().filter(c => c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA')
  );

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.loadCitas(Number(params['citaId']) || undefined);
    });
  }

  loadCitas(preselectedId?: number): void {
    this.citasSubscription?.unsubscribe();
    this.loading.set(true);
    this.loadError.set('');
    this.citasSubscription = forkJoin([
      this.citaService.findAll({ estado: 'PROGRAMADA' }),
      this.citaService.findAll({ estado: 'CONFIRMADA' }),
    ]).pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ([programadas, confirmadas]) => {
        this.citas.set([...programadas, ...confirmadas]);
        const found = this.citas().find(c => c.id === preselectedId);
        if (found) this.selectCita(found);
      },
      error: () => this.loadError.set('No se pudieron cargar las citas pendientes.'),
    });
  }

  selectCita(cita: CitaResponse): void {
    if (this.saving()) return;
    this.selectedCita.set(cita);
    this.submitted = false;
    this.atencionForm.reset();
    this.medications.set([]);
    this.submitError.set('');
    this.loadHistoriaClinica(cita.mascotaId);
  }

  clearSelection(): void {
    if (this.saving()) return;
    this.historySubscription?.unsubscribe();
    this.selectedCita.set(null);
    this.atencionForm.reset();
    this.submitted = false;
    this.medications.set([]);
    this.historiaClinica.set(null);
    this.historyError.set('');
    this.submitError.set('');
  }

  loadHistoriaClinica(mascotaId = this.selectedCita()?.mascotaId): void {
    this.historySubscription?.unsubscribe();
    this.historiaClinica.set(null);
    this.historyError.set('');
    if (!mascotaId) return;
    this.historyLoading.set(true);
    this.historySubscription = this.atencionClinicaService.findHistoriaClinica(mascotaId).pipe(
      finalize(() => this.historyLoading.set(false)), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (historia) => this.historiaClinica.set(historia),
      error: () => this.historyError.set('No se pudo cargar el historial de esta mascota.'),
    });
  }

  addMedication(): void {
    this.medications.update(m => [...m, { medicamento: '', dosis: '', frecuencia: '' }]);
  }

  removeMedication(index: number): void {
    this.medications.update(m => m.filter((_, i) => i !== index));
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'Programada',
      CONFIRMADA: 'Confirmada',
    };
    return map[estado] || estado;
  }

  onSubmit(): void {
    if (this.saving()) return;
    this.submitted = true;
    this.submitError.set('');
    this.atencionForm.markAllAsTouched();
    if (this.atencionForm.invalid) return;

    const cita = this.selectedCita();
    if (!cita) return;

    const formValue = this.atencionForm.value;
    const medications = this.medications().map(m => ({
      medicamento: m.medicamento.trim(), dosis: m.dosis.trim(), frecuencia: m.frecuencia.trim(),
    })).filter(m => m.medicamento || m.dosis || m.frecuencia);
    if (medications.some(m => !m.medicamento || !m.dosis || !m.frecuencia)) {
      this.submitError.set('Complete nombre, dosis y frecuencia de cada medicamento o deje la fila totalmente vacia.');
      return;
    }
    const tratamiento = formValue.tratamiento! + (medications.length ? '\n\nMedicamentos:\n' + medications.map(m =>
      `- ${m.medicamento}; Dosis: ${m.dosis}; Frecuencia: ${m.frecuencia}`
    ).join('\n') : '');
    const vitals: string[] = [];
    if (formValue.pesoKg != null) vitals.push(`Peso: ${formValue.pesoKg} kg`);
    if (formValue.temperatura != null) vitals.push(`Temperatura: ${formValue.temperatura} \u00b0C`);
    if (formValue.frecuenciaCardiaca != null) vitals.push(`Frecuencia cardiaca: ${formValue.frecuenciaCardiaca} lpm`);
    const observations = formValue.observacionesClinicas || '';
    const observacionesClinicas = observations + (vitals.length ? (observations ? '\n\n' : '') + 'Constantes vitales:\n' + vitals.join('\n') : '');
    if (tratamiento.length > 1000 || observacionesClinicas.length > 1000) {
      this.submitError.set('El tratamiento con medicamentos y las observaciones con constantes vitales no pueden superar 1000 caracteres cada uno. Reduzca el texto antes de guardar.');
      return;
    }
    const req: AtencionClinicaRequest = {
      motivo: formValue.motivo!,
      diagnostico: formValue.diagnostico!,
      tratamiento,
      recomendaciones: formValue.recomendaciones || undefined,
      observacionesClinicas: observacionesClinicas || undefined,
      notasInternas: formValue.notasInternas || undefined,
      estadoMascota: formValue.estadoMascota as EstadoMascota,
    };

    this.saving.set(true);
    defer(() => this.atencionClinicaService.register(cita.id, req)).pipe(
      take(1), finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.clearSelection();
        this.loadCitas();
      },
      error: (err) => this.submitError.set(err.status === 403
        ? 'No tiene permiso para guardar esta atencion (403). Los datos se conservan.'
        : err.status === 0 ? 'Sin conexion con el servidor. Los datos se conservan; reintente guardar.'
        : 'No se pudo guardar la atencion' + (err.status ? ` (${err.status})` : '') + '. Revise los datos y reintente; los valores se conservan.'),
    });
  }

  invalidFields(): string[] {
    const messages: Record<string, string> = {
      motivo: 'Motivo: obligatorio, maximo 250 caracteres.',
      diagnostico: 'Diagnostico: obligatorio, maximo 1000 caracteres.',
      tratamiento: 'Tratamiento: obligatorio, maximo 1000 caracteres incluyendo medicamentos.',
      recomendaciones: 'Recomendaciones: maximo 1000 caracteres.',
      observacionesClinicas: 'Observaciones clinicas: maximo 1000 caracteres incluyendo constantes vitales.',
      notasInternas: 'Notas internas: maximo 1000 caracteres.',
      pesoKg: 'Peso: ingrese un numero finito de al menos 0.01 kg o deje vacio.',
      temperatura: 'Temperatura: ingrese un numero finito mayor que 0 en grados C o deje vacio.',
      frecuenciaCardiaca: 'Frecuencia cardiaca: ingrese un entero positivo en lpm o deje vacio.',
      estadoMascota: 'Seleccione el estado actual de la mascota.',
    };
    return Object.entries(this.atencionForm.controls).filter(([, control]) => control.invalid).map(([key]) => messages[key]);
  }
}
