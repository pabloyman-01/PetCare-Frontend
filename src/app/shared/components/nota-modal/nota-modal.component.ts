import { Component, input, inject, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotaSeguimientoService } from '../../../core/services/nota-seguimiento.service';
import { NotaSeguimientoResponse } from '../../../core/models/nota-seguimiento.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-nota-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="cerrar.emit()">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">

        <div class="p-6 border-b">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="material-symbols-outlined text-blue-600">note_add</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900">Anotación de Seguimiento</h3>
            </div>
            <button (click)="cerrar.emit()" class="text-gray-400 hover:text-gray-600">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        @if (mensaje) {
          <div class="mx-6 mt-4 p-3 rounded-xl text-sm"
               [class.bg-green-50]="mensajeTipo === 'exito'"
               [class.text-green-700]="mensajeTipo === 'exito'"
               [class.bg-red-50]="mensajeTipo === 'error'"
               [class.text-red-700]="mensajeTipo === 'error'">
            {{ mensaje }}
          </div>
        }

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Observación administrativa</label>
            <textarea [(ngModel)]="observacion" rows="4"
                      class="w-full p-3 rounded-xl border border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-sm"
                      placeholder="Registre información relacionada con la comunicación con el propietario, coordinación de citas, confirmaciones, reprogramaciones o seguimiento administrativo."></textarea>
          </div>

          <button (click)="guardar()" [disabled]="guardando || !observacion.trim()"
                  class="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            @if (guardando) {
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            }
            Guardar anotación
          </button>
        </div>

        @if (historial().length > 0) {
          <div class="border-t px-6 py-4">
            <h4 class="font-semibold text-gray-700 mb-3">Historial de anotaciones</h4>
            <div class="space-y-3 max-h-64 overflow-y-auto">
              @for (n of historial(); track n.id) {
                <div class="p-3 bg-gray-50 rounded-xl text-sm">
                  <div class="flex justify-between items-start mb-1">
                    <span class="font-medium text-gray-700">{{ n.registradoPor }}</span>
                    <span class="text-xs text-gray-400">{{ n.createdAt | date:'dd/MM/yy HH:mm' }}</span>
                  </div>
                  <p class="text-gray-600">{{ n.observacion }}</p>
                </div>
              }
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class NotaModalComponent implements OnInit {
  citaId = input.required<number>();
  cerrar = output<void>();

  private notaService = inject(NotaSeguimientoService);

  observacion = '';
  guardando = false;
  mensaje = '';
  mensajeTipo: 'exito' | 'error' = 'exito';
  historial = signal<NotaSeguimientoResponse[]>([]);

  ngOnInit() {
    this.cargarHistorial();
  }

  private cargarHistorial() {
    this.notaService.findByCitaId(this.citaId()).subscribe({
      next: (data) => this.historial.set(data),
    });
  }

  guardar() {
    if (!this.observacion.trim()) return;
    this.guardando = true;
    this.mensaje = '';
    this.notaService.create({ citaId: this.citaId(), observacion: this.observacion.trim() }).pipe(
      finalize(() => this.guardando = false)
    ).subscribe({
      next: () => {
        this.mensaje = 'Anotación guardada correctamente.';
        this.mensajeTipo = 'exito';
        this.observacion = '';
        this.cargarHistorial();
      },
      error: () => {
        this.mensaje = 'Error al guardar la anotación. Intente nuevamente.';
        this.mensajeTipo = 'error';
      },
    });
  }
}
