import { Component, EventEmitter, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertaCitaResponse } from '../../../core/models/alerta.model';

export interface CallResult {
  citaId: number;
  resultado: 'confirmada' | 'reprogramar' | 'no_contesto' | 'equivocado' | 'cancelada';
  observaciones: string;
  proximaAccion: string;
  nuevaFecha?: string;
  nuevaHora?: string;
}

@Component({
  selector: 'app-call-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="cancelar()">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">

        @if (paso === 'datos') {
          <!-- Paso 1: Datos de la cita -->
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="material-symbols-outlined text-blue-600">call</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">Llamar</h3>
                <p class="text-sm text-gray-500">Información de la cita</p>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 bg-blue-50 rounded-xl">
                <p class="text-xs text-gray-500 mb-1">Mascota</p>
                <p class="font-semibold text-gray-900">{{ alerta().mascotaNombre }}</p>
              </div>
              <div class="p-3 bg-blue-50 rounded-xl">
                <p class="text-xs text-gray-500 mb-1">Propietario</p>
                <p class="font-semibold text-gray-900">{{ alerta().duenioNombreCompleto }}</p>
              </div>
              <div class="p-3 bg-blue-50 rounded-xl">
                <p class="text-xs text-gray-500 mb-1">Teléfono</p>
                <p class="font-semibold text-gray-900">No disponible</p>
              </div>
              <div class="p-3 bg-blue-50 rounded-xl">
                <p class="text-xs text-gray-500 mb-1">Tipo de cita</p>
                <p class="font-semibold text-gray-900">{{ alerta().motivo }}</p>
              </div>
              <div class="p-3 bg-blue-50 rounded-xl">
                <p class="text-xs text-gray-500 mb-1">Fecha</p>
                <p class="font-semibold text-gray-900">{{ alerta().fecha }}</p>
              </div>
              <div class="p-3 bg-blue-50 rounded-xl">
                <p class="text-xs text-gray-500 mb-1">Hora</p>
                <p class="font-semibold text-gray-900">{{ alerta().horaInicio }}</p>
              </div>
            </div>
            <div class="p-3 bg-yellow-50 rounded-xl flex items-center gap-2">
              <span class="material-symbols-outlined text-yellow-600 text-sm">info</span>
              <p class="text-sm text-yellow-800">Estado: <strong>{{ alerta().estado }}</strong></p>
            </div>
          </div>

          <div class="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button (click)="cancelar()"
                    class="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button (click)="iniciarLlamada()"
                    class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">call</span>
              Iniciar llamada
            </button>
          </div>
        }

        @if (paso === 'gestion') {
          <!-- Paso 2: En gestión -->
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span class="material-symbols-outlined text-green-600 animated-pulse">call_made</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">Llamada en curso</h3>
                <p class="text-sm text-gray-500">Iniciada a las {{ horaInicio }}</p>
              </div>
            </div>
          </div>

          <div class="p-6 text-center">
            <div class="w-20 h-20 rounded-full bg-green-50 mx-auto flex items-center justify-center mb-4 animate-pulse">
              <span class="material-symbols-outlined text-4xl text-green-600">phone_in_talk</span>
            </div>
            <p class="text-gray-500 mb-2">Llamando a <strong>{{ alerta().duenioNombreCompleto }}</strong></p>
            <p class="text-sm text-gray-400">Por la cita de {{ alerta().mascotaNombre }}</p>
          </div>

          <div class="p-6 border-t border-gray-100 flex justify-end">
            <button (click)="finalizarLlamada()"
                    class="px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">call_end</span>
              Finalizar llamada
            </button>
          </div>
        }

        @if (paso === 'resultado') {
          <!-- Paso 3: Resultado -->
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span class="material-symbols-outlined text-purple-600">rate_review</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">Resultado de llamada</h3>
                <p class="text-sm text-gray-500">¿Cómo fue la llamada?</p>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Resultado</label>
              <select [(ngModel)]="resultadoSeleccionado"
                      class="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none">
                <option value="">Seleccionar resultado...</option>
                <option value="confirmada">✅ Cita confirmada</option>
                <option value="reprogramar">🔄 Reprogramar cita</option>
                <option value="no_contesto">📞 No contestó</option>
                <option value="equivocado">❌ Número equivocado</option>
                <option value="cancelada">🚫 Cita cancelada</option>
              </select>
            </div>

            @if (resultadoSeleccionado === 'reprogramar') {
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nueva fecha</label>
                  <input type="date" [(ngModel)]="nuevaFecha"
                         class="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nueva hora</label>
                  <input type="time" [(ngModel)]="nuevaHora"
                         class="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
              </div>
            }

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Observaciones</label>
              <textarea [(ngModel)]="observaciones" rows="3"
                        class="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                        placeholder="Detalles de la llamada..."></textarea>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Próxima acción (opcional)</label>
              <input [(ngModel)]="proximaAccion"
                     class="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                     placeholder="Ej: Volver a llamar en 1 hora" />
            </div>
          </div>

          <div class="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button (click)="cancelar()"
                    class="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button (click)="guardarResultado()"
                    [disabled]="!resultadoSeleccionado"
                    class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Guardar resultado
            </button>
          </div>
        }

      </div>
    </div>

    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }
      .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
    </style>
  `
})
export class CallModalComponent {
  alerta = input.required<AlertaCitaResponse>();

  @Output() cerrar = new EventEmitter<void>();
  @Output() resultado = new EventEmitter<CallResult>();

  paso: 'datos' | 'gestion' | 'resultado' = 'datos';
  horaInicio = '';
  resultadoSeleccionado = '';
  observaciones = '';
  proximaAccion = '';
  nuevaFecha = '';
  nuevaHora = '';

  iniciarLlamada(): void {
    const now = new Date();
    this.horaInicio = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    this.paso = 'gestion';
    window.open(`tel:${''}`, '_self');
  }

  finalizarLlamada(): void {
    this.paso = 'resultado';
  }

  guardarResultado(): void {
    if (!this.resultadoSeleccionado) return;
    this.resultado.emit({
      citaId: this.alerta().citaId,
      resultado: this.resultadoSeleccionado as CallResult['resultado'],
      observaciones: this.observaciones,
      proximaAccion: this.proximaAccion,
      nuevaFecha: this.nuevaFecha || undefined,
      nuevaHora: this.nuevaHora || undefined,
    });
  }

  cancelar(): void {
    this.cerrar.emit();
  }
}
