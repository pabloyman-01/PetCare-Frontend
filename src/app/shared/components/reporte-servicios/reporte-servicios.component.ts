import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventEmitter, Output } from '@angular/core';
import { ReporteService } from '../../../core/services/reporte.service';

@Component({
  selector: 'app-reporte-servicios',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 sm:p-4" (click)="onCerrar.emit()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="p-4 sm:p-5 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-gray-900">Reporte Detallado de Servicios</h2>
            <p class="text-sm text-gray-500">Análisis completo del catálogo de servicios y su rendimiento.</p>
          </div>
          <button (click)="onCerrar.emit()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        @if (cargando()) {
          <div class="flex-1 flex items-center justify-center p-12">
            <div class="flex flex-col items-center gap-3">
              <span class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              <p class="text-sm text-gray-400">Cargando reporte...</p>
            </div>
          </div>
        } @else if (error()) {
          <div class="flex-1 flex items-center justify-center p-12">
            <p class="text-red-500">{{ error() }}</p>
          </div>
        } @else { @let d = data()!;
          <div class="flex-1 overflow-auto p-4 sm:p-6 space-y-6">

            <!-- Resumen General -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-4 bg-blue-50 rounded-xl"><p class="text-2xl font-bold text-blue-700">{{ d.totalServicios }}</p><p class="text-xs text-blue-600">Total servicios</p></div>
              <div class="p-4 bg-green-50 rounded-xl"><p class="text-2xl font-bold text-green-700">{{ d.activos }}</p><p class="text-xs text-green-600">Activos</p></div>
              <div class="p-4 bg-red-50 rounded-xl"><p class="text-2xl font-bold text-red-700">{{ d.inactivos }}</p><p class="text-xs text-red-600">Inactivos</p></div>
              <div class="p-4 bg-purple-50 rounded-xl"><p class="text-2xl font-bold text-purple-700">S/{{ d.ingresosAnio | number:'1.2-2' }}</p><p class="text-xs text-purple-600">Ingresos año</p></div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-4 bg-yellow-50 rounded-xl"><p class="text-lg font-bold text-yellow-700">{{ d.categoriaMasUsada }}</p><p class="text-xs text-yellow-600">Categoría más usada</p></div>
              <div class="p-4 bg-indigo-50 rounded-xl"><p class="text-lg font-bold text-indigo-700">{{ d.servicioMasSolicitado }}</p><p class="text-xs text-indigo-600">Más solicitado</p></div>
            </div>

            <!-- Categorías -->
            <div>
              <h3 class="font-bold text-gray-800 mb-3">Servicios por Categoría</h3>
              <div class="space-y-2">
                @for (cat of d.categorias; track cat.categoria) {
                  <div class="flex items-center gap-3">
                    <span class="w-28 text-sm text-gray-600 shrink-0">{{ cat.categoria }}</span>
                    <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500 rounded-full transition-all" [style.width.%]="porcentaje(cat.cantidad, d.totalServicios)"></div>
                    </div>
                    <span class="w-10 text-right text-sm font-bold text-gray-700">{{ cat.cantidad }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Top Servicios -->
            <div>
              <h3 class="font-bold text-gray-800 mb-3">Servicios Más Solicitados</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead><tr class="border-b text-left text-gray-500">
                    <th class="py-2 pr-4">Servicio</th>
                    <th class="py-2 pr-4">Veces</th>
                    <th class="py-2 pr-4">Total generado</th>
                  </tr></thead>
                  <tbody>
                    @for (s of d.topServicios; track s.nombreServicio) {
                      <tr class="border-b border-gray-50">
                        <td class="py-2 pr-4 font-medium">{{ s.nombreServicio }}</td>
                        <td class="py-2 pr-4">{{ s.cantidadSolicitada }}</td>
                        <td class="py-2 pr-4">S/{{ s.totalGenerado | number:'1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Tendencia Mensual -->
            <div>
              <h3 class="font-bold text-gray-800 mb-3">Tendencia Mensual</h3>
              <div class="flex items-end gap-1 h-32">
                @for (t of d.tendenciaMensual; track t.mes + t.anio) {
                  <div class="flex-1 flex flex-col items-center gap-1">
                    <div class="w-full bg-blue-500 rounded-t transition-all" [style.height.px]="t.cantidad * 4"></div>
                    <span class="text-[10px] text-gray-400 -rotate-45 origin-left">{{ t.mes }}</span>
                  </div>
                }
              </div>
            </div>

          </div>
        }

        <!-- Footer -->
        <div class="p-4 border-t bg-gray-50 shrink-0 flex justify-end">
          <button (click)="onCerrar.emit()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cerrar</button>
        </div>

      </div>
    </div>
  `
})
export class ReporteServiciosComponent implements OnInit {
  @Output() onCerrar = new EventEmitter<void>();
  private reporteService = inject(ReporteService);

  data = signal<any>(null);
  cargando = signal(true);
  error = signal('');

  ngOnInit() {
    this.reporteService.findReporteServicios().subscribe({
      next: (data) => { this.data.set(data); this.cargando.set(false); },
      error: (err) => { this.error.set('Error al cargar el reporte.'); this.cargando.set(false); },
    });
  }

  porcentaje(valor: number, total: number): number {
    return total > 0 ? Math.round(valor / total * 100) : 0;
  }

  alturaBarra(t: any[], valor: number): number {
    const max = Math.max(...t.map((x: any) => x.cantidad), 1);
    return max > 0 ? (valor / max * 100) : 0;
  }

  maxTendencia(t: any[]): number {
    return Math.max(...t.map((x: any) => x.cantidad), 1);
  }
}
