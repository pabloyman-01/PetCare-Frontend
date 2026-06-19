import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventEmitter, Output } from '@angular/core';
import { HorarioSemanalService, HorarioSemanalResponse, AsignacionHorario } from '../../../core/services/horario-semanal.service';
import { AsistenteService } from '../../../core/services/asistente.service';
import { AsistenteResponse } from '../../../core/models/asistente.model';

type Turno = 'MANANA' | 'TARDE' | 'NOCHE' | 'DESCANSO' | 'VACACIONES' | 'PERMISO' | 'LIBRE' | '';
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const OPCIONES_TURNO: { value: Turno; label: string; color: string }[] = [
  { value: 'MANANA', label: '🌤 Mañana (08-16)', color: '#22c55e' },
  { value: 'TARDE', label: '🌅 Tarde (14-22)', color: '#f97316' },
  { value: 'NOCHE', label: '🌙 Noche (22-08)', color: '#3b82f6' },
  { value: 'DESCANSO', label: '🛌 Descanso', color: '#9ca3af' },
  { value: 'VACACIONES', label: '🏖 Vacaciones', color: '#a855f7' },
  { value: 'PERMISO', label: '📋 Permiso', color: '#eab308' },
  { value: 'LIBRE', label: '🔓 Libre', color: '#d1d5db' },
];

@Component({
  selector: 'app-planificador-semanal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 sm:p-4" (click)="onCerrar.emit()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="p-4 sm:p-5 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-lg font-bold text-gray-900">📅 Planificador Semanal</h2>
            <p class="text-sm text-gray-500">Asigna los turnos de cada asistente para la semana</p>
          </div>
          <button (click)="onCerrar.emit()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Selector de Semana -->
        <div class="px-4 sm:px-5 py-3 border-b bg-blue-50 flex items-center justify-between shrink-0">
          <button (click)="semanaAnterior()" class="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Semana anterior">
            <span class="material-symbols-outlined text-blue-600">chevron_left</span>
          </button>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-blue-800">{{ semanaLabel() }}</span>
            <button (click)="irHoy()" class="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-2">
              Volver a hoy
            </button>
          </div>
          <button (click)="semanaSiguiente()" class="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Semana siguiente">
            <span class="material-symbols-outlined text-blue-600">chevron_right</span>
          </button>
        </div>

        <!-- Tabla de horarios -->
        <div class="flex-1 overflow-auto p-4 sm:p-5">
          <div class="overflow-x-auto">
            <table class="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th class="text-left p-2 text-xs font-bold text-gray-500 uppercase w-40">Asistente</th>
                  @for (d of diasSemana(); track d.label) {
                    <th class="p-2 text-center">
                      <div class="text-xs font-bold text-gray-500">{{ d.labelCorto }}</div>
                      <div class="text-sm font-bold text-gray-800">{{ d.numero }}</div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (a of asistentes(); track a.id) {
                  <tr class="border-t border-gray-100 hover:bg-gray-50">
                    <td class="p-2 text-sm font-medium text-gray-700">{{ a.nombres }} {{ a.apellidos }}</td>
                    @for (dia of DIAS; track dia; let i = $index) {
                      <td class="p-1.5 text-center">
                        <select [value]="turnoAsignado(a.id, dia)"
                                (change)="asignarTurno(a.id, dia, $event)"
                                class="w-full text-xs p-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none text-center appearance-none"
                                [style.border-color]="colorHex(turnoAsignado(a.id, dia))"
                                [style.background-color]="colorBg(turnoAsignado(a.id, dia))">
                          <option value="">— Sin turno —</option>
                          @for (opt of OPCIONES_TURNO; track opt.value) {
                            <option [value]="opt.value" [style.color]="opt.color">{{ opt.label }}</option>
                          }
                        </select>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Botones -->
        <div class="p-4 border-t bg-gray-50 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            @for (t of OPCIONES_TURNO; track t.value) {
              <span class="text-xs px-2 py-1 rounded-full font-medium" [style.background-color]="t.color + '25'" [style.color]="t.color">
                {{ t.label }}
              </span>
            }
          </div>
          <div class="flex gap-2 w-full sm:w-auto">
            <button (click)="onCerrar.emit()" class="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
              Cancelar
            </button>
            <button (click)="guardar()" [disabled]="guardando" class="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {{ guardando ? 'Guardando...' : '💾 Guardar Horarios' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class PlanificadorSemanalComponent implements OnInit {
  @Output() onCerrar = new EventEmitter<void>();

  private horarioService = inject(HorarioSemanalService);
  private asistenteService = inject(AsistenteService);

  asistentes = signal<AsistenteResponse[]>([]);
  horarios = signal<HorarioSemanalResponse[]>([]);
  semanaActual = signal<Date>(this.inicioSemana(new Date()));
  guardando = false;

  readonly DIAS = DIAS;
  readonly OPCIONES_TURNO = OPCIONES_TURNO;

  diasSemana = computed(() => {
    const inicio = this.semanaActual();
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const completos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return completos.map((completo, i) => {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      return { label: completo, labelCorto: labels[i], numero: d.getDate(), fecha: d };
    });
  });

  semanaLabel = computed(() => {
    const s = this.semanaActual();
    const f = new Date(s);
    f.setDate(f.getDate() + 6);
    return `${s.getDate()}/${s.getMonth()+1} – ${f.getDate()}/${f.getMonth()+1}/${f.getFullYear()}`;
  });

  ngOnInit() { this.cargarAsistentes(); }

  private inicioSemana(d: Date): Date {
    const r = new Date(d);
    r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
    r.setHours(0, 0, 0, 0);
    return r;
  }

  private cargarAsistentes() {
    this.asistenteService.findAll().subscribe({
      next: (data) => {
        this.asistentes.set(data.filter(a => a.active));
        this.cargarHorarios();
      },
    });
  }

  private cargarHorarios() {
    const s = this.semanaActual().toISOString().split('T')[0];
    this.horarioService.findBySemana(s).subscribe({
      next: (data) => this.horarios.set(data),
    });
  }

  irHoy() {
    this.semanaActual.set(this.inicioSemana(new Date()));
    this.cargarHorarios();
  }

  semanaAnterior() {
    const s = new Date(this.semanaActual());
    s.setDate(s.getDate() - 7);
    this.semanaActual.set(s);
    this.cargarHorarios();
  }

  semanaSiguiente() {
    const s = new Date(this.semanaActual());
    s.setDate(s.getDate() + 7);
    this.semanaActual.set(s);
    this.cargarHorarios();
  }

  turnoAsignado(usuarioId: number, dia: string): Turno {
    return (this.horarios().find(h => h.usuarioId === usuarioId) as any)?.[dia] as Turno || '';
  }

  asignarTurno(usuarioId: number, dia: string, event: Event) {
    const turno = (event.target as HTMLSelectElement).value as Turno;
    this.horarios.update(hs => {
      let h = hs.find(h => h.usuarioId === usuarioId);
      if (!h) {
        const a = this.asistentes().find(a => a.id === usuarioId);
        if (!a) return hs;
        h = { id: 0, usuarioId, usuarioNombre: `${a.nombres} ${a.apellidos}`, usuarioRol: 'ROLE_ASISTENTE', fechaSemana: this.semanaActual().toISOString().split('T')[0], lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '', domingo: '' };
        hs = [...hs, h];
      }
      (h as any)[dia] = turno;
      return [...hs];
    });
  }

  guardar() {
    this.guardando = true;
    const semana = this.semanaActual().toISOString().split('T')[0];
    const asignaciones: AsignacionHorario[] = this.horarios().map(h => ({
      usuarioId: h.usuarioId,
      lunes: h.lunes, martes: h.martes, miercoles: h.miercoles,
      jueves: h.jueves, viernes: h.viernes, sabado: h.sabado, domingo: h.domingo,
    }));
    this.horarioService.saveWeek({ semana, asignaciones }).subscribe({
      next: (data) => { this.horarios.set(data); this.guardando = false; },
      error: () => { this.guardando = false; },
    });
  }

  colorHex(t: Turno): string {
    return OPCIONES_TURNO.find(o => o.value === t)?.color || '#e5e7eb';
  }

  colorBg(t: Turno): string {
    return t ? this.colorHex(t) + '15' : '#ffffff';
  }
}
