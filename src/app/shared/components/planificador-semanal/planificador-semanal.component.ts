import { Component, inject, signal, output, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorarioSemanalService, HorarioSemanalResponse, AsignacionHorario } from '../../../core/services/horario-semanal.service';
import { AsistenteService } from '../../../core/services/asistente.service';
import { AsistenteResponse } from '../../../core/models/asistente.model';

type Turno = 'MANANA' | 'TARDE' | 'NOCHE' | 'DESCANSO' | 'VACACIONES' | 'PERMISO' | 'LIBRE' | '';
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
const TURNOS: { value: Turno; label: string; color: string }[] = [
  { value: 'MANANA', label: 'Mañana', color: '#22c55e' },
  { value: 'TARDE', label: 'Tarde', color: '#f97316' },
  { value: 'NOCHE', label: 'Noche', color: '#3b82f6' },
  { value: 'DESCANSO', label: 'Descanso', color: '#9ca3af' },
  { value: 'VACACIONES', label: 'Vacaciones', color: '#a855f7' },
  { value: 'PERMISO', label: 'Permiso', color: '#eab308' },
  { value: 'LIBRE', label: 'Libre', color: '#d1d5db' },
];

@Component({
  selector: 'app-planificador-semanal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .celda-turno { transition: all 0.15s ease; min-height: 48px; }
    .celda-turno:hover { transform: scale(1.05); z-index: 10; }
  `],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" (click)="cerrar.emit()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="p-4 sm:p-6 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-gray-900">Planificador Semanal</h2>
            <p class="text-xs sm:text-sm text-gray-500">Gestiona los turnos de los asistentes</p>
          </div>
          <button (click)="cerrar.emit()" class="text-gray-400 hover:text-gray-600 p-1">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Selector de Semana -->
        <div class="px-4 sm:px-6 py-3 border-b bg-gray-50 flex items-center justify-between shrink-0">
          <button (click)="cambiarSemana(-1)" class="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Semana anterior">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">{{ semanaLabel() }}</span>
            <button (click)="irHoy()" class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 ml-2">Hoy</button>
          </div>
          <button (click)="cambiarSemana(1)" class="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Semana siguiente">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <!-- Calendario -->
        <div class="flex-1 overflow-auto p-4 sm:p-6">
          <div class="min-w-[640px]">
            <!-- Encabezados con fecha -->
            <div class="flex mb-2">
              <div class="w-36 shrink-0 pr-3"></div>
              @for (d of diasSemana(); track d.iso) {
                <div class="flex-1 text-center">
                  <div class="text-xs font-semibold text-gray-500 uppercase">{{ d.label }}</div>
                  <div class="text-lg font-bold text-gray-800">{{ d.numero }}</div>
                </div>
              }
            </div>

            <!-- Filas de asistentes -->
            @for (a of asistentes(); track a.id) {
              <div class="flex items-center mb-1.5">
                <div class="w-36 shrink-0 pr-3 text-sm font-medium text-gray-700 truncate" [title]="a.nombres + ' ' + a.apellidos">
                  {{ a.nombres }} {{ a.apellidos }}
                </div>
                @for (dia of DIAS; track dia; let i = $index) {
                  @let turno = turnoAsignado(a.id, dia);
                  <div class="flex-1 px-0.5">
                    <div class="celda-turno h-12 rounded-xl border-2 flex items-center justify-center cursor-pointer relative select-none"
                         [style.border-color]="turno ? colorHex(turno) : '#e5e7eb'"
                         [style.background-color]="turno ? colorHex(turno) + '20' : '#f9fafb'"
                         (click)="siguienteTurno(a.id, dia)"
                         (contextmenu)="$event.preventDefault(); quitarTurno(a.id, dia)"
                         [title]="'Click: cambiar turno | Click derecho: quitar'">
                      @if (turno) {
                        <div class="flex items-center gap-1">
                          <span class="w-2 h-2 rounded-full" [style.background-color]="colorHex(turno)"></span>
                          <span class="text-[11px] font-bold" [style.color]="colorHex(turno)">{{ labelTurno(turno) }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Leyenda + Botones -->
        <div class="p-4 border-t bg-gray-50 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            @for (t of TURNOS; track t.value) {
              <div class="flex items-center gap-1.5 text-xs text-gray-600">
                <span class="w-2.5 h-2.5 rounded-full" [style.background-color]="t.color"></span>
                {{ t.label }}
              </div>
            }
          </div>
          <div class="flex gap-2 w-full sm:w-auto">
            <button (click)="cerrar.emit()" class="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
              Cancelar
            </button>
            <button (click)="guardar()" [disabled]="guardando" class="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {{ guardando ? 'Guardando...' : 'Guardar Horarios' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class PlanificadorSemanalComponent implements OnInit {
  cerrar = output<void>();

  private horarioService = inject(HorarioSemanalService);
  private asistenteService = inject(AsistenteService);

  asistentes = signal<AsistenteResponse[]>([]);
  horarios = signal<HorarioSemanalResponse[]>([]);
  semanaActual = signal<Date>(this.inicioSemana(new Date()));
  guardando = false;

  readonly DIAS = DIAS;
  readonly TURNOS = TURNOS;

  diasSemana = computed(() => {
    const inicio = this.semanaActual();
    return DIAS.map((_, i) => {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      return { label: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i], numero: d.getDate(), iso: d.toISOString().split('T')[0] };
    });
  });

  semanaLabel = computed(() => {
    const s = this.semanaActual();
    const fin = new Date(s);
    fin.setDate(fin.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return `${s.toLocaleDateString('es', opts)} – ${fin.toLocaleDateString('es', opts)}`;
  });

  ngOnInit() {
    this.cargarAsistentes();
  }

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

  cambiarSemana(delta: number) {
    const s = new Date(this.semanaActual());
    s.setDate(s.getDate() + delta * 7);
    this.semanaActual.set(s);
    this.cargarHorarios();
  }

  turnoAsignado(usuarioId: number, dia: string): Turno {
    const h = this.horarios().find(h => h.usuarioId === usuarioId);
    if (!h) return '';
    return (h as any)[dia] as Turno || '';
  }

  siguienteTurno(usuarioId: number, dia: string) {
    const actual = this.turnoAsignado(usuarioId, dia);
    const idx = TURNOS.findIndex(t => t.value === actual);
    const next = TURNOS[(idx + 1) % TURNOS.length].value;
    this.asignarTurno(usuarioId, dia, next === actual ? '' : next);
  }

  quitarTurno(usuarioId: number, dia: string) {
    this.asignarTurno(usuarioId, dia, '');
  }

  private asignarTurno(usuarioId: number, dia: string, turno: Turno) {
    this.horarios.update(hs => {
      let h = hs.find(h => h.usuarioId === usuarioId);
      if (!h) {
        const a = this.asistentes().find(a => a.id === usuarioId);
        if (!a) return hs;
        const nuevo: HorarioSemanalResponse = {
          id: 0, usuarioId, usuarioNombre: `${a.nombres} ${a.apellidos}`,
          usuarioRol: 'ROLE_ASISTENTE', fechaSemana: this.semanaActual().toISOString().split('T')[0],
          lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '', domingo: '',
        };
        hs = [...hs, nuevo];
        h = hs[hs.length - 1];
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
    return TURNOS.find(tu => tu.value === t)?.color || '#e5e7eb';
  }

  labelTurno(t: Turno): string {
    return TURNOS.find(tu => tu.value === t)?.label || '';
  }
}
