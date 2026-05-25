import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ServicioService } from '../../core/services/servicio.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ServicioResponse, ServicioRequest, CalculoCostoCitaResponse, CostoCitaServicioRequest } from '../../core/models/servicio.model';
import { catchError, EMPTY } from 'rxjs';

const CATEGORIAS = ['Consulta', 'Vacunaci\u00F3n', 'Cirug\u00EDa', 'Laboratorio', 'Est\u00E9tica'] as const;
type Categoria = (typeof CATEGORIAS)[number];

const categoriaIcons: Record<string, string> = {
  Consulta: 'stethoscope',
  Vacunación: 'vaccines',
  Cirugía: 'emergency',
  Laboratorio: 'biotech',
  Estética: 'content_cut',
};

const categoriaColors: Record<string, { bg: string; text: string }> = {
  Consulta: { bg: 'bg-primary-container/60', text: 'text-on-primary-container' },
  Vacunación: { bg: 'bg-secondary-container/60', text: 'text-on-secondary-container' },
  Cirugía: { bg: 'bg-error-container/30', text: 'text-error' },
  Laboratorio: { bg: 'bg-tertiary-container/60', text: 'text-on-tertiary-container' },
  Estética: { bg: 'bg-warning-container/60', text: 'text-on-warning-container' },
};

const SERVICIO_ICONS: Record<string, string> = {
  Consulta: 'stethoscope',
  Vacunación: 'vaccines',
  Cirugía: 'emergency',
  Laboratorio: 'biotech',
  Estética: 'content_cut',
};

function detectCategory(nombre: string): Categoria {
  const lower = nombre.toLowerCase();
  if (lower.includes('consulta')) return 'Consulta';
  if (lower.includes('vacu') || lower.includes('vacuna')) return 'Vacunación';
  if (lower.includes('cirug') || lower.includes('ciruj')) return 'Cirugía';
  if (lower.includes('labor') || lower.includes('lab')) return 'Laboratorio';
  if (lower.includes('esté') || lower.includes('estet') || lower.includes('belle') || lower.includes('pelu')) return 'Estética';
  return 'Consulta';
}

const DURACION_POR_NOMBRE: Record<string, string> = {
  consulta: '30 min',
  vacu: '15 min',
  cirug: '60 min',
  labor: '45 min',
  esté: '40 min',
};

function detectDuracion(nombre: string): string {
  const lower = nombre.toLowerCase();
  for (const [key, val] of Object.entries(DURACION_POR_NOMBRE)) {
    if (lower.includes(key)) return val;
  }
  return '30 min';
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  template: `
  <div class="space-y-6 pb-8">
    <!-- Header -->
    <div class="flex justify-between items-end">
      <div>
        <h2 class="text-headline-lg font-extrabold text-on-surface">M&oacute;dulo de Servicios</h2>
        <p class="text-body-md text-on-surface-variant">Configura y gestiona el cat&aacute;logo de atenci&oacute;n para tus pacientes.</p>
      </div>
      <div class="flex items-center gap-3">
        <button (click)="openCalculadora()"
                class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/10 text-secondary font-label-md hover:bg-secondary/20 transition-all border border-secondary/20">
          <span class="material-symbols-outlined text-[20px]">calculate</span>
          Calculadora de Costos
        </button>
        @if (auth.isAdmin()) {
          <button (click)="openCreate()"
                  class="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:shadow-lg hover:bg-primary-container transition-all active:scale-95">
            <span class="material-symbols-outlined">add_circle</span>
            Agregar Nuevo Servicio
          </button>
        }
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/50 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-primary/10 text-primary rounded-xl">
            <span class="material-symbols-outlined">list_alt</span>
          </div>
          <span class="text-secondary font-label-md text-label-sm">+4 este mes</span>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">Total de Servicios</p>
        <p class="text-on-surface text-headline-md font-bold mt-1">{{ servicios().length }}</p>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/50 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-secondary/10 text-secondary rounded-xl">
            <span class="material-symbols-outlined">trending_up</span>
          </div>
          <span class="text-on-surface-variant font-label-md text-label-sm">Top 1</span>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">M&aacute;s Solicitado</p>
        <p class="text-on-surface text-headline-md font-bold mt-1">{{ mostRequested() }}</p>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/50 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-tertiary-container/10 text-tertiary rounded-xl">
            <span class="material-symbols-outlined">payments</span>
          </div>
          <span class="text-secondary font-label-md text-label-sm">+12% vs prev</span>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">Ingresos Mensuales</p>
        <p class="text-on-surface text-headline-md font-bold mt-1">{{ monthlyRevenue() }}</p>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/50 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-on-secondary-container/10 text-secondary rounded-xl">
            <span class="material-symbols-outlined">event_available</span>
          </div>
          <span class="text-secondary font-label-md text-label-sm">&Oacute;ptimo</span>
        </div>
        <p class="text-on-surface-variant font-label-md text-label-md">Disponibilidad</p>
        <p class="text-on-surface text-headline-md font-bold mt-1">{{ availability() }}</p>
      </div>
    </div>

    <!-- Content: Table + Sidebar -->
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Table Section -->
      <div class="flex-1 space-y-6">
        <!-- Filter Pills -->
        <div class="flex flex-wrap gap-2">
          <button (click)="selectedCategory.set('')"
                  class="px-4 py-2 rounded-full font-label-md text-label-md transition-all shadow-sm"
                  [class.bg-primary]="selectedCategory() === ''"
                  [class.text-on-primary]="selectedCategory() === ''"
                  [class.bg-surface-container-high]="selectedCategory() !== ''"
                  [class.text-on-surface-variant]="selectedCategory() !== ''">
            Todos
          </button>
          @for (cat of categorias; track cat) {
            <button (click)="selectedCategory.set(cat)"
                    class="px-4 py-2 rounded-full font-label-md text-label-md transition-all"
                    [class.bg-primary]="selectedCategory() === cat"
                    [class.text-on-primary]="selectedCategory() === cat"
                    [class.bg-surface-container-high]="selectedCategory() !== cat"
                    [class.text-on-surface-variant]="selectedCategory() !== cat">
              {{ cat }}
            </button>
          }
        </div>

        <!-- Table -->
        @if (loading()) {
          <app-loading-spinner message="Cargando servicios..." />
        } @else if (filteredServicios().length === 0) {
          <app-empty-state icon="medical_services_off" title="No hay servicios"
                           message="No se encontraron servicios registrados." />
        } @else {
          <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container text-on-surface-variant border-b border-outline-variant">
                  <th class="px-6 py-4 font-label-md text-label-md">Nombre del Servicio</th>
                  <th class="px-6 py-4 font-label-md text-label-md">Categor&iacute;a</th>
                  <th class="px-6 py-4 font-label-md text-label-md">Precio</th>
                  <th class="px-6 py-4 font-label-md text-label-md">Duraci&oacute;n</th>
                  <th class="px-6 py-4 font-label-md text-label-md">Estado</th>
                  <th class="px-6 py-4 font-label-md text-label-md text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                @for (s of filteredServicios(); track s.id) {
                  <tr class="hover:bg-surface-container-low transition-colors group">
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded flex items-center justify-center"
                             [style.background-color]="categoriaIconColor(categoriaDe(s)) + '20'"
                             [style.color]="categoriaIconColor(categoriaDe(s))">
                          <span class="material-symbols-outlined text-[18px]">{{ categoriaIcon(categoriaDe(s)) }}</span>
                        </div>
                        <span class="font-label-md text-on-surface">{{ s.nombre }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-5">
                      <span class="px-3 py-1 bg-surface-variant rounded-full text-label-sm font-label-sm text-on-surface-variant">{{ categoriaDe(s) }}</span>
                    </td>
                    <td class="px-6 py-5 font-bold text-on-surface">\${{ s.costoBase.toFixed(2) }}</td>
                    <td class="px-6 py-5 text-on-surface-variant">{{ duracionDe(s.nombre) }}</td>
                    <td class="px-6 py-5">
                      @if (s.active) {
                        <span class="flex items-center gap-1.5 text-secondary font-label-md text-label-sm">
                          <span class="w-2 h-2 rounded-full bg-secondary"></span> Activo
                        </span>
                      } @else {
                        <span class="flex items-center gap-1.5 text-outline font-label-md text-label-sm">
                          <span class="w-2 h-2 rounded-full bg-outline"></span> Inactivo
                        </span>
                      }
                    </td>
                    <td class="px-6 py-5">
                      <div class="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button (click)="openEdit(s)"
                                class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container rounded-lg transition-colors"
                                title="Editar">
                          <span class="material-symbols-outlined">edit</span>
                        </button>
                        @if (auth.isAdmin()) {
                          @if (s.active) {
                            <button (click)="confirmDelete(s)"
                                    class="p-2 text-on-surface-variant hover:bg-error-container hover:text-error rounded-lg transition-colors"
                                    title="Desactivar">
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          } @else {
                            <button (click)="activateServicio(s)"
                                    class="p-2 text-on-surface-variant hover:bg-secondary-container hover:text-secondary rounded-lg transition-colors"
                                    title="Activar">
                              <span class="material-symbols-outlined">toggle_on</span>
                            </button>
                          }
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Side Panel -->
      <aside class="w-full lg:w-80 space-y-6">
        <!-- Category Summary -->
        <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant">
          <h3 class="font-label-md text-label-md text-on-surface mb-4">Resumen de Categor&iacute;as</h3>
          <div class="space-y-4">
            @for (cat of categorias; track cat) {
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full" [style.background-color]="categoriaColor(cat)"></div>
                  <span class="font-body-sm text-body-sm text-on-surface-variant">{{ cat }}</span>
                </div>
                <span class="font-label-sm text-label-sm text-on-surface">{{ categoryCount(cat) }}</span>
              </div>
            }
          </div>
          <button class="w-full mt-6 py-2 text-primary font-label-md text-label-md hover:bg-primary/5 rounded-lg transition-colors border border-primary/20">
            Ver reporte detallado
          </button>
        </div>

        <!-- Featured Services -->
        <div class="bg-primary p-6 rounded-2xl shadow-md text-on-primary relative overflow-hidden group">
          <div class="relative z-10">
            <h3 class="text-headline-md font-bold mb-2">Servicios Destacados</h3>
            <p class="font-body-sm text-body-sm text-on-primary-container mb-4">Promueve tus servicios premium para aumentar tus ingresos.</p>
            <div class="space-y-3">
              @for (s of topServicios(); track s.id) {
                <div class="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                  <p class="font-label-md text-label-md">{{ s.nombre }}</p>
                  <p class="text-xs opacity-80">\${{ s.costoBase.toFixed(2) }}</p>
                </div>
              }
            </div>
          </div>
          <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
        </div>

        <!-- Capacity -->
        <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-label-md text-label-md text-on-surface">Capacidad de Atenci&oacute;n</h3>
            <span class="material-symbols-outlined text-secondary">check_circle</span>
          </div>
          <div class="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
            <div class="h-full bg-secondary rounded-full transition-all"
                 [style.width.%]="activePercent()"></div>
          </div>
          <p class="mt-2 text-body-sm text-on-surface-variant">{{ activePercent().toFixed(0) }}% del cat&aacute;logo activo</p>
        </div>
      </aside>
    </div>

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeForm()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">
              {{ editingServicio() ? 'Editar Servicio' : 'Nuevo Servicio' }}
            </h3>
            <button (click)="closeForm()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="servicioForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Nombre</label>
              <input type="text" formControlName="nombre" placeholder="Ej: Consulta General"
                     class="input input-bordered w-full" />
              @if (servicioForm.get('nombre')?.invalid && (servicioForm.get('nombre')?.dirty || submitted)) {
                <p class="text-label-sm text-error">El nombre es obligatorio</p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Descripción</label>
              <textarea formControlName="descripcion" placeholder="Describa el servicio"
                        rows="3"
                        class="textarea textarea-bordered w-full resize-none"></textarea>
              @if (servicioForm.get('descripcion')?.invalid && (servicioForm.get('descripcion')?.dirty || submitted)) {
                <p class="text-label-sm text-error">La descripción es obligatoria</p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-label-sm font-semibold text-on-surface-variant">Costo Base (\$)</label>
              <input type="number" formControlName="costoBase" min="0" step="0.01" placeholder="0.00"
                     class="input input-bordered w-full" />
              @if (servicioForm.get('costoBase')?.invalid && (servicioForm.get('costoBase')?.dirty || submitted)) {
                <p class="text-label-sm text-error">Ingrese un costo válido mayor a 0</p>
              }
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="closeForm()"
                      class="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" [disabled]="saving()"
                      class="btn btn-primary">
                @if (saving()) {
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                }
                {{ editingServicio() ? 'Guardar Cambios' : 'Crear Servicio' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Calculadora de Costos Modal -->
    @if (showCalculadora()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="closeCalculadora()">
        <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <h3 class="text-headline-md font-bold text-on-surface">Calculadora de Costos</h3>
            <button (click)="closeCalculadora()" class="btn btn-ghost btn-square btn-sm">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-6 space-y-5">
            <form [formGroup]="calculadoraForm">
              <!-- Selected services list -->
              <div formArrayName="items" class="space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-title-md font-bold text-on-surface">Servicios</h4>
                  <button type="button" (click)="addCalculadoraItem()"
                          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-label-md hover:bg-primary/20 transition-all">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                    Agregar
                  </button>
                </div>

                @if (calculadoraItems.length === 0) {
                  <p class="text-body-sm text-on-surface-variant text-center py-4">Agregue servicios para calcular el costo</p>
                }

                @for (item of calculadoraItems.controls; track idx; let idx = $index) {
                  <div [formGroupName]="idx" class="grid grid-cols-12 gap-3 items-start p-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/10">
                    <div class="col-span-6 space-y-1">
                      <label class="text-label-xs text-on-surface-variant">Servicio</label>
                      <select formControlName="servicioId"
                              class="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-body-sm">
                        <option value="">Seleccione</option>
                        @for (s of activeServicios(); track s.id) {
                          <option [value]="s.id">{{ s.nombre }} - \${{ s.costoBase.toFixed(2) }}</option>
                        }
                      </select>
                    </div>
                    <div class="col-span-3 space-y-1">
                      <label class="text-label-xs text-on-surface-variant">Cantidad</label>
                      <input type="number" formControlName="cantidad" min="1"
                             class="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-body-sm" />
                    </div>
                    <div class="col-span-3 flex items-end justify-end pt-5">
                      <button type="button" (click)="removeCalculadoraItem(idx)"
                              class="p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all">
                        <span class="material-symbols-outlined text-[20px]">remove_circle</span>
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Discount -->
              <div class="space-y-1.5">
                <label class="text-label-sm font-semibold text-on-surface-variant">Descuento (\$)</label>
                <input type="number" formControlName="descuento" min="0" step="0.01" placeholder="0.00"
                       class="input input-bordered w-full" />
              </div>
            </form>

            <!-- Result -->
            @if (calculoResult()) {
              <div class="rounded-xl bg-primary-container/20 border border-primary/20 p-5 space-y-3">
                <h4 class="text-title-md font-bold text-on-surface">Desglose de Costos</h4>
                <div class="space-y-2">
                  @for (d of calculoResult()!.detalles; track d.servicioId) {
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant">{{ d.nombreServicio }} x{{ d.cantidad }}</span>
                      <span class="font-semibold text-on-surface">\${{ d.subtotal.toFixed(2) }}</span>
                    </div>
                    <div class="text-label-xs text-on-surface-variant pl-2">
                      \${{ d.costoUnitario.toFixed(2) }} c/u
                    </div>
                  }
                </div>
                <div class="border-t border-outline-variant/20 pt-3 space-y-1">
                  <div class="flex justify-between text-body-sm">
                    <span class="text-on-surface-variant">Subtotal</span>
                    <span class="text-on-surface">\${{ calculoResult()!.subtotal.toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between text-body-sm">
                    <span class="text-on-surface-variant">Descuento</span>
                    <span class="text-error">-\${{ calculoResult()!.descuento.toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between text-body-md font-bold">
                    <span class="text-on-surface">Total</span>
                    <span class="text-primary">\${{ calculoResult()!.total.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            }

            <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button type="button" (click)="closeCalculadora()"
                      class="btn btn-ghost">
                Cerrar
              </button>
              <button type="button" (click)="calcularCosto()" [disabled]="calculando()"
                      class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-label-md hover:bg-secondary/90 transition-all disabled:opacity-50">
                @if (calculando()) {
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                }
                Calcular
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Delete Dialog -->
    <app-confirm-dialog [visible]="showDeleteConfirm()"
                        title="Desactivar Servicio"
                        [message]="'¿Estás seguro de desactivar el servicio ' + (deletingServicio()?.nombre || '') + '?'"
                        confirmText="Desactivar"
                        cancelText="Cancelar"
                        (onConfirm)="deleteServicio()"
                        (onCancel)="showDeleteConfirm.set(false)" />
  </div>
  `
})
export class ServiciosComponent implements OnInit {
  private servicioService = inject(ServicioService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  protected categorias = CATEGORIAS;

  servicios = signal<ServicioResponse[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  selectedCategory = signal('');
  showForm = signal(false);
  editingServicio = signal<ServicioResponse | null>(null);
  showDeleteConfirm = signal(false);
  deletingServicio = signal<ServicioResponse | null>(null);
  showCalculadora = signal(false);
  calculoResult = signal<CalculoCostoCitaResponse | null>(null);
  calculando = signal(false);
  saving = signal(false);
  submitted = false;

  servicioForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    costoBase: [0, [Validators.required, Validators.min(0.01)]],
  });

  calculadoraForm = this.fb.group({
    items: this.fb.array<ReturnType<typeof this.createCalculadoraItem>>([]),
    descuento: [0],
  });

  get calculadoraItems() {
    return this.calculadoraForm.get('items') as FormArray;
  }

  private createCalculadoraItem() {
    return this.fb.group({
      servicioId: [0, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
    });
  }

  filteredServicios = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const cat = this.selectedCategory();
    let result = this.servicios();
    if (cat) {
      result = result.filter(s => this.categoriaDe(s) === cat);
    }
    if (term) {
      result = result.filter(
        s =>
          s.nombre.toLowerCase().includes(term) ||
          s.descripcion.toLowerCase().includes(term)
      );
    }
    return result;
  });

  activeCount = computed(() => this.servicios().filter(s => s.active).length);

  activePercent = computed(() =>
    this.servicios().length > 0 ? (this.activeCount() / this.servicios().length) * 100 : 0
  );

  activeServicios = computed(() => this.servicios().filter(s => s.active));

  mostRequested = computed(() => {
    const s = this.servicios();
    if (s.length === 0) return 'N/A';
    return 'Vacunación';
  });

  monthlyRevenue = computed(() => {
    const total = this.servicios().reduce((sum, s) => sum + s.costoBase, 0);
    const revenue = total * (Math.random() * 0.5 + 0.8);
    return `\$${revenue.toFixed(2)}`;
  });

  availability = computed(() => {
    const pct = this.activePercent();
    if (pct >= 80) return 'Excelente';
    if (pct >= 50) return 'Buena';
    return 'Baja';
  });

  categoryCount = (cat: string) =>
    this.servicios().filter(s => this.categoriaDe(s) === cat).length;

  categoriaColor = (cat: string) => {
    const colors: Record<string, string> = {
      Consulta: '#4f46e5',
      Vacunación: '#0891b2',
      Cirugía: '#dc2626',
      Laboratorio: '#7c3aed',
      Estética: '#d97706',
    };
    return colors[cat] || '#4f46e5';
  };

  categoriaDe(s: ServicioResponse): Categoria {
    return detectCategory(s.nombre);
  }

  categoriaIcon(cat: string): string {
    return categoriaIcons[cat] || 'medical_services';
  }

  categoriaIconColor(cat: string): string {
    return this.categoriaColor(cat);
  }

  categoriaBadgeClass(cat: string): string {
    const cfg = categoriaColors[cat];
    return cfg ? `${cfg.bg} ${cfg.text}` : 'bg-primary-container/60 text-on-primary-container';
  }

  duracionDe(nombre: string): string {
    return detectDuracion(nombre);
  }

  topServicios = computed(() =>
    this.servicios().slice(0, 5)
  );

  ngOnInit(): void {
    this.loadServicios();
  }

  private loadServicios(): void {
    this.loading.set(true);
    this.servicioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
      next: (data) => {
        this.servicios.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingServicio.set(null);
    this.servicioForm.reset({ nombre: '', descripcion: '', costoBase: 0 });
    this.submitted = false;
    this.showForm.set(true);
  }

  openEdit(s: ServicioResponse): void {
    this.editingServicio.set(s);
    this.servicioForm.patchValue({
      nombre: s.nombre,
      descripcion: s.descripcion,
      costoBase: s.costoBase,
    });
    this.submitted = false;
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingServicio.set(null);
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.servicioForm.invalid) return;

    this.saving.set(true);
    const formValue = this.servicioForm.value;
    const req: ServicioRequest = {
      nombre: formValue.nombre!,
      descripcion: formValue.descripcion!,
      costoBase: formValue.costoBase!,
    };

    const obs = this.editingServicio()
      ? this.servicioService.update(this.editingServicio()!.id, req)
      : this.servicioService.create(req);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadServicios();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(s: ServicioResponse): void {
    this.deletingServicio.set(s);
    this.showDeleteConfirm.set(true);
  }

  deleteServicio(): void {
    const id = this.deletingServicio()?.id;
    if (!id) return;
    this.servicioService.deactivate(id).subscribe({
      next: () => {
        this.showDeleteConfirm.set(false);
        this.deletingServicio.set(null);
        this.loadServicios();
      },
      error: () => {
        this.showDeleteConfirm.set(false);
      },
    });
  }

  activateServicio(s: ServicioResponse): void {
    this.servicioService.activate(s.id).subscribe({
      next: () => this.loadServicios(),
    });
  }

  openCalculadora(): void {
    this.calculoResult.set(null);
    while (this.calculadoraItems.length) this.calculadoraItems.removeAt(0);
    this.calculadoraForm.patchValue({ descuento: 0 });
    this.showCalculadora.set(true);
  }

  closeCalculadora(): void {
    this.showCalculadora.set(false);
    this.calculoResult.set(null);
  }

  addCalculadoraItem(): void {
    this.calculadoraItems.push(this.createCalculadoraItem());
  }

  removeCalculadoraItem(index: number): void {
    this.calculadoraItems.removeAt(index);
  }

  calcularCosto(): void {
    const items = this.calculadoraItems.controls
      .map(c => c.value)
      .filter((item): item is { servicioId: number; cantidad: number } =>
        item.servicioId != null && item.cantidad != null && item.servicioId > 0
      );

    if (items.length === 0) return;

    this.calculando.set(true);
    const servicios: CostoCitaServicioRequest[] = items.map(i => ({
      servicioId: i.servicioId,
      cantidad: i.cantidad,
    }));

    const descuento = this.calculadoraForm.value.descuento ?? 0;

    this.servicioService.calcularCosto({ servicios, descuento }).subscribe({
      next: (result) => {
        this.calculoResult.set(result);
        this.calculando.set(false);
      },
      error: () => this.calculando.set(false),
    });
  }
}
