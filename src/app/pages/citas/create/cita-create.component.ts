import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DuenioService } from '../../../core/services/duenio.service';
import { MascotaService } from '../../../core/services/mascota.service';
import { VeterinarioService } from '../../../core/services/veterinario.service';
import { ServicioService } from '../../../core/services/servicio.service';
import { CitaService } from '../../../core/services/cita.service';
import { AuthService } from '../../../core/services/auth.service';
import { DuenioResponse } from '../../../core/models/duenio.model';
import { MascotaResponse } from '../../../core/models/mascota.model';
import { VeterinarioResponse } from '../../../core/models/veterinario.model';
import { ServicioResponse } from '../../../core/models/servicio.model';
import { CitaRequest, CostoCitaServicioRequest } from '../../../core/models/cita.model';
import { CalculoCostoCitaRequest, CalculoCostoCitaResponse } from '../../../core/models/servicio.model';
import { catchError, EMPTY } from 'rxjs';

interface ServicioSeleccionado {
  servicioId: number;
  nombre: string;
  cantidad: number;
}

@Component({
  selector: 'app-cita-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button (click)="goBack()" class="btn btn-ghost btn-square btn-sm">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">Nueva Cita</h2>
        <p class="text-body-md text-on-surface-variant">Programa una nueva cita m&eacute;dica</p>
      </div>
    </div>

    <!-- Step Indicator -->
    <div class="glass-card rounded-xl p-3">
      <div class="grid grid-cols-8 gap-1">
        @for (step of stepInfo; track step.number) {
          <div class="flex flex-col items-center gap-1 min-w-0"
               [ngClass]="{
                 'text-primary': currentStep() >= step.number,
                 'text-on-surface-variant/40': currentStep() < step.number
               }">
            <div class="flex items-center gap-2 w-full">
              <div class="w-full h-px transition-all"
                   [ngClass]="currentStep() > step.number ? 'bg-primary' : 'bg-outline-variant/30'"
                   [class.invisible]="step.number === 1"></div>
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-label-xs font-bold transition-all flex-shrink-0"
                   [ngClass]="currentStep() >= step.number ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'">
                {{ step.number }}
              </div>
              <div class="w-full h-px transition-all"
                   [ngClass]="currentStep() > step.number ? 'bg-primary' : 'bg-outline-variant/30'"
                   [class.invisible]="step.number === 8"></div>
            </div>
            <span class="text-[10px] font-semibold leading-tight text-center hidden sm:block truncate w-full">{{ step.label }}</span>
          </div>
        }
      </div>
    </div>

    <!-- Step Content -->
    <div class="glass-card rounded-xl p-6">
      @if (currentStep() === 1) {
        <div class="space-y-5">
          <h3 class="text-title-md font-bold text-on-surface">Seleccionar Due&ntilde;o</h3>
          @if (loadingDuenios()) {
            <div class="flex items-center justify-center py-8">
              <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
          } @else {
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input type="text" placeholder="Buscar due&ntilde;o por nombre o documento..."
                     [(ngModel)]="duenioSearch"
                     class="input input-bordered w-full pl-11" />
            </div>
            @if (filteredDuenios().length === 0) {
              <div class="text-center py-8">
                <span class="material-symbols-outlined text-4xl text-outline-variant" style="font-variation-settings:'FILL' 1">group_off</span>
                <p class="mt-2 text-body-md text-on-surface-variant">No se encontraron due&ntilde;os</p>
              </div>
            } @else {
              <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                @for (d of filteredDuenios(); track d.id) {
                  <div (click)="selectDuenio(d)"
                       class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                       [ngClass]="{'bg-primary-container/60': selectedDuenio()?.id === d.id, 'hover:bg-surface-container-high': selectedDuenio()?.id !== d.id}">
                    <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-label-md font-bold flex-shrink-0">
                      {{ getInitials(d.nombres, d.apellidos) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-body-md font-semibold text-on-surface truncate">{{ d.nombres }} {{ d.apellidos }}</p>
                      <p class="text-label-sm text-on-surface-variant truncate">{{ d.numeroDocumento }} | {{ d.email }}</p>
                    </div>
                    @if (selectedDuenio()?.id === d.id) {
                      <span class="material-symbols-outlined text-primary">check_circle</span>
                    }
                  </div>
                }
              </div>
            }
          }
        </div>
      }

      @if (currentStep() === 2) {
        <div class="space-y-5">
          <div class="flex items-center gap-3 pb-3 border-b border-outline-variant/20">
            <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-label-md font-bold flex-shrink-0">
              {{ getInitials(selectedDuenio()!.nombres, selectedDuenio()!.apellidos) }}
            </div>
            <div>
              <p class="text-body-md font-semibold text-on-surface">{{ selectedDuenio()!.nombres }} {{ selectedDuenio()!.apellidos }}</p>
              <p class="text-label-sm text-on-surface-variant">Due&ntilde;o seleccionado</p>
            </div>
            <button (click)="currentStep.set(1)" class="ml-auto text-label-sm font-semibold text-primary hover:underline">Cambiar</button>
          </div>
          <h3 class="text-title-md font-bold text-on-surface">Seleccionar Mascota</h3>
          @if (loadingMascotas()) {
            <div class="flex items-center justify-center py-8">
              <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
          } @else {
            @if (mascotasDelDuenio().length === 0) {
              <div class="text-center py-8">
                <span class="material-symbols-outlined text-4xl text-outline-variant" style="font-variation-settings:'FILL' 1">pets</span>
                <p class="mt-2 text-body-md text-on-surface-variant">Este due&ntilde;o no tiene mascotas registradas</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                @for (m of mascotasDelDuenio(); track m.id) {
                  <div (click)="selectedMascota.set(m)"
                       class="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border"
                       [ngClass]="{'bg-primary-container/60 border-primary': selectedMascota()?.id === m.id, 'hover:bg-surface-container-high border-outline-variant/20': selectedMascota()?.id !== m.id}">
                    <div class="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-label-md font-bold flex-shrink-0">
                      {{ m.nombre.charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-body-md font-semibold text-on-surface truncate">{{ m.nombre }}</p>
                      <p class="text-label-sm text-on-surface-variant">{{ especieLabel(m.especie) }} | {{ m.raza }}</p>
                    </div>
                    @if (selectedMascota()?.id === m.id) {
                      <span class="material-symbols-outlined text-primary">check_circle</span>
                    }
                  </div>
                }
              </div>
            }
          }
        </div>
      }

      @if (currentStep() === 3) {
        <div class="space-y-5">
          <h3 class="text-title-md font-bold text-on-surface">Veterinario y Fecha</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Veterinario</label>
              <select [(ngModel)]="selectedVeterinarioId" (ngModelChange)="onVeterinarioChange()"
                      class="select select-bordered w-full">
                <option [ngValue]="null">Seleccione un veterinario</option>
                @for (v of veterinarios(); track v.id) {
                  <option [value]="v.id">{{ v.nombres }} {{ v.apellidos }} - {{ v.especialidad }}</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Fecha</label>
              <input type="date" [(ngModel)]="selectedFecha" (ngModelChange)="onFechaChange()"
                     [min]="todayStr"
                     class="input input-bordered w-full" />
            </div>
          </div>
        </div>
      }

      @if (currentStep() === 4) {
        <div class="space-y-5">
          <h3 class="text-title-md font-bold text-on-surface">Seleccionar Horario</h3>
          <div class="flex items-center gap-3 pb-3 text-body-sm text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">event</span>
            {{ selectedFecha() }} con Dr. {{ veterinarioSeleccionado()?.nombres }} {{ veterinarioSeleccionado()?.apellidos }}
          </div>
          @if (loadingSlots()) {
            <div class="flex items-center justify-center py-8">
              <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
          } @else {
            @if (availableSlots().length === 0) {
              <div class="text-center py-8">
                <span class="material-symbols-outlined text-4xl text-outline-variant" style="font-variation-settings:'FILL' 1">event_busy</span>
                <p class="mt-2 text-body-md text-on-surface-variant">No hay horarios disponibles para esta fecha</p>
              </div>
            } @else {
              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                @for (slot of availableSlots(); track slot) {
                  <button (click)="selectedHora.set(slot)"
                          class="px-3 py-2.5 rounded-xl text-label-sm font-semibold transition-all border"
                          [ngClass]="{'bg-primary text-on-primary border-primary': selectedHora() === slot, 'bg-surface text-on-surface border-outline-variant/30 hover:border-primary': selectedHora() !== slot}">
                    {{ slot.slice(0, 5) }}
                  </button>
                }
              </div>
            }
          }
        </div>
      }

      @if (currentStep() === 5) {
        <div class="space-y-5">
          <h3 class="text-title-md font-bold text-on-surface">Motivo y Duraci&oacute;n</h3>
          <div class="space-y-1.5">
            <label class="text-label-sm font-semibold text-on-surface-variant">Motivo de la consulta</label>
            <textarea [(ngModel)]="motivo" rows="4" placeholder="Describa el motivo de la consulta..."
                      class="textarea textarea-bordered w-full"></textarea>
          </div>
          <div class="space-y-1.5">
            <label class="text-label-sm font-semibold text-on-surface-variant">Duraci&oacute;n (minutos)</label>
            <input type="number" [(ngModel)]="duracion" min="15" step="5" placeholder="30"
                   class="input input-bordered w-full" />
            <p class="text-label-sm text-on-surface-variant">M&iacute;nimo 15 minutos</p>
          </div>
        </div>
      }

      @if (currentStep() === 6) {
        <div class="space-y-5">
          <h3 class="text-title-md font-bold text-on-surface">Servicios</h3>
          @if (selectedServicios().length > 0) {
            <div class="space-y-2">
              @for (serv of selectedServicios(); track serv.servicioId; let i = $index) {
                <div class="flex items-center gap-3 p-3 rounded-xl bg-surface">
                  <div class="flex-1 min-w-0">
                    <p class="text-body-md font-semibold text-on-surface">{{ serv.nombre }}</p>
                  </div>
                  <div class="w-20">
                    <input type="number" [(ngModel)]="serv.cantidad" min="1"
                           class="input input-bordered w-full text-center" />
                  </div>
                  <button (click)="removeServicio(i)" class="btn btn-ghost btn-square btn-sm">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              }
            </div>
          }
          <div class="flex gap-3">
            <select #servicioSelect class="select select-bordered w-full">
              <option value="">Seleccione un servicio</option>
              @for (s of serviciosDisponibles(); track s.id) {
                <option [value]="s.id">{{ s.nombre }} - S/ {{ s.costoBase.toFixed(2) }}</option>
              }
            </select>
            <button (click)="addServicio(servicioSelect)" class="btn btn-primary">Agregar</button>
          </div>
          @if (selectedServicios().length > 0) {
            <div class="flex justify-end pt-2">
              <button (click)="calcularCosto()" class="btn btn-secondary">
                <span class="material-symbols-outlined text-[18px]">calculate</span>
                Calcular Costo
              </button>
            </div>
          }
          @if (costoCalculado(); as costo) {
            <div class="rounded-xl bg-surface p-4 space-y-2">
              <h4 class="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Resumen de Costos</h4>
              @for (det of costo.detalles; track det.servicioId) {
                <div class="flex items-center justify-between py-1.5">
                  <p class="text-body-md text-on-surface">{{ det.nombreServicio }} <span class="text-on-surface-variant">x{{ det.cantidad }}</span></p>
                  <p class="text-body-md font-semibold text-on-surface">S/ {{ det.subtotal.toFixed(2) }}</p>
                </div>
              }
              <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <p class="text-body-md text-on-surface-variant">Subtotal</p>
                <p class="text-body-md font-semibold text-on-surface">S/ {{ costo.subtotal.toFixed(2) }}</p>
              </div>
              @if (costo.descuento > 0) {
                <div class="flex items-center justify-between">
                  <p class="text-body-md text-on-surface-variant">Descuento</p>
                  <p class="text-body-md font-semibold text-error">-S/ {{ costo.descuento.toFixed(2) }}</p>
                </div>
              }
              <div class="flex items-center justify-between pt-1">
                <p class="text-title-md font-bold text-on-surface">Total</p>
                <p class="text-title-md font-bold text-primary">S/ {{ costo.total.toFixed(2) }}</p>
              </div>
            </div>
          }
        </div>
      }

      @if (currentStep() === 7) {
        <div class="space-y-5">
          <h3 class="text-title-md font-bold text-on-surface">Resumen de la Cita</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-3 rounded-xl bg-surface">
                <span class="material-symbols-outlined text-primary">person</span>
                <div>
                  <p class="text-label-sm text-on-surface-variant">Due&ntilde;o</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ selectedDuenio()!.nombres }} {{ selectedDuenio()!.apellidos }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-xl bg-surface">
                <span class="material-symbols-outlined text-primary">pets</span>
                <div>
                  <p class="text-label-sm text-on-surface-variant">Mascota</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ selectedMascota()!.nombre }}</p>
                </div>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-3 rounded-xl bg-surface">
                <span class="material-symbols-outlined text-primary">badge</span>
                <div>
                  <p class="text-label-sm text-on-surface-variant">Veterinario</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ veterinarioSeleccionado()?.nombres }} {{ veterinarioSeleccionado()?.apellidos }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-xl bg-surface">
                <span class="material-symbols-outlined text-primary">calendar_today</span>
                <div>
                  <p class="text-label-sm text-on-surface-variant">Fecha y Hora</p>
                  <p class="text-body-md font-semibold text-on-surface">{{ selectedFecha() }} a las {{ selectedHora().slice(0, 5) }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface">
            <span class="material-symbols-outlined text-primary">description</span>
            <div>
              <p class="text-label-sm text-on-surface-variant">Motivo</p>
              <p class="text-body-md text-on-surface">{{ motivo || 'Sin especificar' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface">
            <span class="material-symbols-outlined text-primary">timelapse</span>
            <div>
              <p class="text-label-sm text-on-surface-variant">Duraci&oacute;n Estimada</p>
              <p class="text-body-md font-semibold text-on-surface">{{ duracion }} minutos</p>
            </div>
          </div>
          @if (costoCalculado(); as costo) {
            <div class="rounded-xl bg-surface p-4 space-y-2">
              <h4 class="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">Detalle de Costos</h4>
              @for (det of costo.detalles; track det.servicioId) {
                <div class="flex items-center justify-between py-1.5">
                  <p class="text-body-md text-on-surface">{{ det.nombreServicio }} <span class="text-on-surface-variant">x{{ det.cantidad }}</span></p>
                  <p class="text-body-md font-semibold text-on-surface">S/ {{ det.subtotal.toFixed(2) }}</p>
                </div>
              }
              <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <p class="text-body-md text-on-surface-variant">Subtotal</p>
                <p class="text-body-md font-semibold text-on-surface">S/ {{ costo.subtotal.toFixed(2) }}</p>
              </div>
              <div class="flex items-center justify-between pt-1">
                <p class="text-body-md text-on-surface-variant">Descuento</p>
                <p class="text-body-md font-semibold text-on-surface">S/ {{ descuento.toFixed(2) }}</p>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <p class="text-title-md font-bold text-on-surface">Total</p>
                <p class="text-title-md font-bold text-primary">S/ {{ (costo.total - descuento).toFixed(2) }}</p>
              </div>
            </div>
          }
          <div class="space-y-1.5 pt-2">
            <label class="text-label-sm font-semibold text-on-surface-variant">Descuento (S/)</label>
            <input type="number" [(ngModel)]="descuento" min="0" step="0.5" class="input input-bordered w-full" />
          </div>
        </div>
      }

      @if (currentStep() === 8) {
        <div class="space-y-5">
          <div class="text-center py-6">
            <span class="material-symbols-outlined text-6xl text-primary" style="font-variation-settings:'FILL' 1">calendar_add_on</span>
            <h3 class="text-headline-md font-bold text-on-surface mt-4">Confirmar Cita</h3>
            <p class="text-body-md text-on-surface-variant mt-1">Revisa los detalles antes de confirmar la cita</p>
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span class="text-body-md text-on-surface-variant">Due&ntilde;o</span>
              <span class="text-body-md font-semibold text-on-surface">{{ selectedDuenio()!.nombres }} {{ selectedDuenio()!.apellidos }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span class="text-body-md text-on-surface-variant">Mascota</span>
              <span class="text-body-md font-semibold text-on-surface">{{ selectedMascota()!.nombre }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span class="text-body-md text-on-surface-variant">Veterinario</span>
              <span class="text-body-md font-semibold text-on-surface">{{ veterinarioSeleccionado()?.nombres }} {{ veterinarioSeleccionado()?.apellidos }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span class="text-body-md text-on-surface-variant">Fecha</span>
              <span class="text-body-md font-semibold text-on-surface">{{ selectedFecha() }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span class="text-body-md text-on-surface-variant">Hora</span>
              <span class="text-body-md font-semibold text-on-surface">{{ selectedHora().slice(0, 5) }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span class="text-body-md text-on-surface-variant">Duraci&oacute;n</span>
              <span class="text-body-md font-semibold text-on-surface">{{ duracion }} minutos</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span class="text-body-md text-on-surface-variant">Motivo</span>
              <span class="text-body-md text-on-surface text-right max-w-[60%]">{{ motivo || 'Sin especificar' }}</span>
            </div>
            @if (costoCalculado(); as costo) {
              <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
                <span class="text-body-md text-on-surface-variant">Subtotal</span>
                <span class="text-body-md font-semibold text-on-surface">S/ {{ costo.subtotal.toFixed(2) }}</span>
              </div>
              <div class="flex items-center justify-between py-2 border-b border-outline-variant/10">
                <span class="text-body-md text-on-surface-variant">Descuento</span>
                <span class="text-body-md font-semibold text-error">-S/ {{ descuento.toFixed(2) }}</span>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-title-md font-bold text-on-surface">Total</span>
                <span class="text-title-md font-bold text-primary">S/ {{ (costo.total - descuento).toFixed(2) }}</span>
              </div>
            }
          </div>
          @if (saving()) {
            <div class="flex items-center justify-center py-4">
              <div class="flex items-center gap-3">
                <span class="loading loading-spinner text-primary"></span>
                <span class="text-body-md text-on-surface-variant">Creando cita...</span>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Navigation Buttons -->
    @if (currentStep() < 8) {
      <div class="flex items-center justify-between">
        <button (click)="prevStep()" [disabled]="currentStep() === 1"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                [ngClass]="currentStep() > 1 ? 'hover:bg-surface-container-high text-on-surface-variant' : 'text-on-surface-variant/40'">
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
          Anterior
        </button>
        <div class="flex items-center gap-3">
          <button (click)="cancel()" class="text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Cancelar</button>
          <button (click)="nextStep()"
                  class="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 transition-all shadow-sm">
            Siguiente
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    } @else {
      @if (submitError) {
        <div class="p-4 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-3">
          <span class="material-symbols-outlined text-error">error</span>
          <p class="text-label-sm text-error font-semibold">{{ submitError }}</p>
        </div>
      }
      <div class="flex items-center justify-between">
        <button (click)="prevStep()"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all">
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
          Anterior
        </button>
        <div class="flex flex-col items-center gap-2">
          <button (click)="submitCita()" [disabled]="saving()"
                  class="px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md disabled:opacity-50">
            @if (saving()) {
              <span class="loading loading-spinner"></span>
            }
            <span class="material-symbols-outlined text-[20px]">calendar_add_on</span>
            Confirmar Cita
          </button>
          <button (click)="cancel()" class="text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Cancelar</button>
        </div>
        <div class="w-[100px]"></div>
      </div>
    }
  </div>
  `
})
export class CitaCreateComponent implements OnInit {
  private duenioService = inject(DuenioService);
  private mascotaService = inject(MascotaService);
  private veterinarioService = inject(VeterinarioService);
  private servicioService = inject(ServicioService);
  private citaService = inject(CitaService);
  protected auth = inject(AuthService);
  private router = inject(Router);

  currentStep = signal(1);
  saving = signal(false);
  submitError = '';

  duenios = signal<DuenioResponse[]>([]);
  loadingDuenios = signal(true);
  duenioSearch = '';
  selectedDuenio = signal<DuenioResponse | null>(null);
  filteredDuenios = computed(() => {
    const term = this.duenioSearch.toLowerCase().trim();
    if (!term) return this.duenios();
    return this.duenios().filter(d =>
      d.nombres.toLowerCase().includes(term) ||
      d.apellidos.toLowerCase().includes(term) ||
      d.numeroDocumento.toLowerCase().includes(term) ||
      d.email.toLowerCase().includes(term)
    );
  });

  mascotasDelDuenio = signal<MascotaResponse[]>([]);
  loadingMascotas = signal(false);
  selectedMascota = signal<MascotaResponse | null>(null);

  veterinarios = signal<VeterinarioResponse[]>([]);
  selectedVeterinarioId = signal<number | null>(null);
  selectedFecha = signal('');
  todayStr = new Date().toISOString().slice(0, 10);

  availableSlots = signal<string[]>([]);
  loadingSlots = signal(false);
  selectedHora = signal('');

  motivo = '';
  duracion = 30;

  selectedServicios = signal<ServicioSeleccionado[]>([]);
  servicios = signal<ServicioResponse[]>([]);
  costoCalculado = signal<CalculoCostoCitaResponse | null>(null);

  descuento = 0;

  stepInfo = [
    { number: 1, label: 'Dueño' },
    { number: 2, label: 'Mascota' },
    { number: 3, label: 'Veterinario' },
    { number: 4, label: 'Horario' },
    { number: 5, label: 'Detalles' },
    { number: 6, label: 'Servicios' },
    { number: 7, label: 'Resumen' },
    { number: 8, label: 'Confirmar' },
  ];

  serviciosDisponibles = computed(() => {
    const selectedIds = this.selectedServicios().map(s => s.servicioId);
    return this.servicios().filter(s => !selectedIds.includes(s.id));
  });

  veterinarioSeleccionado = computed(() => {
    const id = this.selectedVeterinarioId();
    if (!id) return null;
    return this.veterinarios().find(v => v.id === id) ?? null;
  });

  ngOnInit(): void {
    this.loadDuenios();
    this.loadVeterinarios();
    this.loadServicios();
    if (this.auth.isDuenioOnly()) {
      this.duenioService.findOwn().pipe(catchError(() => EMPTY)).subscribe({
        next: (duenio) => {
          this.selectedDuenio.set(duenio);
          this.loadMascotas(duenio.id);
        },
      });
    }
  }

  private loadDuenios(): void {
    this.duenioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => { this.duenios.set(data); this.loadingDuenios.set(false); },
      error: () => this.loadingDuenios.set(false),
    });
  }

  private loadVeterinarios(): void {
    this.veterinarioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.veterinarios.set(data),
    });
  }

  private loadServicios(): void {
    this.servicioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.servicios.set(data),
    });
  }

  private loadMascotas(duenioId: number): void {
    this.loadingMascotas.set(true);
    this.mascotaService.findAll(undefined, duenioId, true).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => { this.mascotasDelDuenio.set(data); this.loadingMascotas.set(false); },
      error: () => this.loadingMascotas.set(false),
    });
  }

  selectDuenio(d: DuenioResponse): void {
    this.selectedDuenio.set(d);
    this.selectedMascota.set(null);
    this.mascotasDelDuenio.set([]);
    this.loadMascotas(d.id);
  }

  getInitials(nombres: string, apellidos: string): string {
    return (nombres.charAt(0) + apellidos.charAt(0)).toUpperCase();
  }

  especieLabel(especie: string): string {
    const map: Record<string, string> = { CANINO: 'Canino', FELINO: 'Felino', EXOTICO: 'Exótico' };
    return map[especie] || especie;
  }

  onVeterinarioChange(): void { this.availableSlots.set([]); this.selectedHora.set(''); this.loadDisponibilidad(); }
  onFechaChange(): void { this.availableSlots.set([]); this.selectedHora.set(''); this.loadDisponibilidad(); }

  private loadDisponibilidad(): void {
    const vetId = this.selectedVeterinarioId();
    const fecha = this.selectedFecha();
    if (!vetId || !fecha) return;
    this.loadingSlots.set(true);
    this.veterinarioService.getDisponibilidad(vetId, fecha, this.duracion)
      .pipe(catchError(() => EMPTY)).subscribe({
        next: (data) => { this.availableSlots.set(data.horariosDisponibles); this.loadingSlots.set(false); },
        error: () => this.loadingSlots.set(false),
      });
  }

  addServicio(selectEl: HTMLSelectElement): void {
    const id = Number(selectEl.value);
    if (!id) return;
    const servicio = this.servicios().find(s => s.id === id);
    if (!servicio) return;
    this.selectedServicios.update(arr => [...arr, { servicioId: id, nombre: servicio.nombre, cantidad: 1 }]);
    selectEl.value = '';
    this.costoCalculado.set(null);
  }

  removeServicio(index: number): void {
    this.selectedServicios.update(arr => arr.filter((_, i) => i !== index));
    this.costoCalculado.set(null);
  }

  calcularCosto(): void {
    const servicios: CostoCitaServicioRequest[] = this.selectedServicios().map(s => ({ servicioId: s.servicioId, cantidad: s.cantidad }));
    this.servicioService.calcularCosto({ servicios }).pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => this.costoCalculado.set(data),
    });
  }

  nextStep(): void {
    if (this.currentStep() === 1 && !this.selectedDuenio()) return;
    if (this.currentStep() === 2 && !this.selectedMascota()) return;
    if (this.currentStep() === 3 && (!this.selectedVeterinarioId() || !this.selectedFecha())) return;
    if (this.currentStep() === 4 && !this.selectedHora()) return;
    if (this.currentStep() === 5 && this.duracion < 15) return;
    if (this.currentStep() === 6) { if (this.selectedServicios().length === 0) return; if (!this.costoCalculado()) return; }
    if (this.currentStep() < 8) this.currentStep.update(s => s + 1);
  }

  prevStep(): void { if (this.currentStep() > 1) this.currentStep.update(s => s - 1); }
  cancel(): void { this.router.navigate(['/citas']); }
  goBack(): void { if (this.currentStep() > 1) this.prevStep(); else this.cancel(); }

  submitCita(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.submitError = '';
    const servicios: CostoCitaServicioRequest[] = this.selectedServicios().map(s => ({ servicioId: s.servicioId, cantidad: s.cantidad }));
    const req: CitaRequest = {
      duenioId: this.selectedDuenio()!.id,
      mascotaId: this.selectedMascota()!.id,
      veterinarioId: this.selectedVeterinarioId()!,
      fecha: this.selectedFecha(),
      horaInicio: this.selectedHora(),
      duracionMinutos: this.duracion,
      motivo: this.motivo || 'Consulta general',
      servicios,
      descuento: this.descuento > 0 ? this.descuento : 0,
    };
    this.citaService.create(req).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/citas']); },
      error: (err) => {
        this.saving.set(false);
        this.submitError = err.error?.message || err.error?.error || 'Error al crear la cita. Intenta nuevamente.';
        console.error('[PetCare] Cita create error:', err.status, err.error);
      },
    });
  }
}
