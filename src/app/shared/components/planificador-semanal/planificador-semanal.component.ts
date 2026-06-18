import { Component, inject, signal, output, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorarioSemanalService, HorarioSemanalResponse, AsignacionHorario } from '../../../core/services/horario-semanal.service';
import { AsistenteService } from '../../../core/services/asistente.service';
import { AsistenteResponse } from '../../../core/models/asistente.model';

type Turno = 'MANANA' | 'TARDE' | 'NOCHE' | 'DESCANSO' | 'VACACIONES' | 'PERMISO' | 'LIBRE' | '';
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TURNOS: { value: Turno; label: string; range: string; color: string }[] = [
  { value: 'MANANA', label: 'Mañana', range: '08:00 - 16:00', color: 'bg-green-500' },
  { value: 'TARDE', label: 'Tarde', range: '14:00 - 22:00', color: 'bg-orange-500' },
  { value: 'NOCHE', label: 'Noche', range: '22:00 - 08:00', color: 'bg-blue-500' },
  { value: 'DESCANSO', label: 'Descanso', range: '-', color: 'bg-gray-400' },
  { value: 'VACACIONES', label: 'Vacaciones', range: '-', color: 'bg-purple-500' },
  { value: 'PERMISO', label: 'Permiso', range: '-', color: 'bg-yellow-500' },
  { value: 'LIBRE', label: 'Libre', range: '-', color: 'bg-gray-300' },
];

@Component({
  selector: 'app-planificador-semanal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="cerrar.emit()">
      <div class="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl max-h-[95vh] flex flex-col" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="p-6 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-xl font-bold text-gray-900">Planificador Semanal de Turnos</h2>
            <p class="text-sm text-gray-500">Administra los horarios de los asistentes para la semana seleccionada</p>
          </div>
          <button (click)="cerrar.emit()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Selector de Semana -->
        <div class="px-6 py-4 border-b bg-gray-50 flex items-center justify-between shrink-0">
          <button (click)="cambiarSemana(-1)" class="p-2 hover:bg-gray-200 rounded-lg">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="font-semibold text-gray-900">Semana del {{ semanaLabel() }}</span>
          <button (click)="cambiarSemana(1)" class="p-2 hover:bg-gray-200 rounded-lg">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <!-- Cuerpo: Calendario + Colaboradores -->
        <div class="flex-1 overflow-auto p-6">
          <div class="flex gap-4">
            <!-- Columna de colaboradores -->
            <div class="w-48 shrink-0 space-y-1">
              <div class="h-12 flex items-center px-3 font-semibold text-sm text-gray-600">Colaborador</div>
              @for (a of asistentes(); track a.id) {
                <div class="h-14 flex items-center px-3 rounded-lg bg-gray-50 text-sm font-medium text-gray-800 truncate">
                  {{ a.nombres }} {{ a.apellidos }}
                </div>
              }
            </div>

            <!-- Días de la semana -->
            <div class="flex-1 grid grid-cols-7 gap-1">
              @for (dia of DIAS; track dia; let i = $index) {
                <div>
                  <div class="h-12 flex items-center justify-center font-semibold text-sm text-gray-600 bg-gray-50 rounded-t-lg">
                    {{ DIAS_LABEL[i] }}
                  </div>
                  <div class="space-y-1">
                    @for (a of asistentes(); track a.id) {
                      <div class="h-14 rounded-lg border border-gray-200 p-1 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-center relative group"
                           [style.background-color]="colorPorTurno(turnoAsignado(a.id, dia))"
                           (click)="cambiarTurno(a.id, dia)">
                        @if (turnoAsignado(a.id, dia); as t) {
                          <span class="text-[10px] font-bold text-white text-center leading-tight">{{ labelTurno(t) }}</span>
                          <button class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] hidden group-hover:flex items-center justify-center"
                                  (click)="$event.stopPropagation(); quitarTurno(a.id, dia)">×</button>
                        } @else {
                          <span class="text-[20px] text-gray-300">+</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Leyenda y botones -->
        <div class="p-4 border-t bg-gray-50 shrink-0 flex items-center justify-between">
          <div class="flex gap-3 flex-wrap">
            @for (t of TURNOS; track t.value) {
              <div class="flex items-center gap-1.5 text-xs text-gray-600">
                <span class="w-3 h-3 rounded-full {{ t.color }}"></span>
                {{ t.label }}
              </div>
            }
          </div>
          <div class="flex gap-2">
            <button (click)="cerrar.emit()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
              Cancelar
            </button>
            <button (click)="guardar()" [disabled]="guardando" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              @if (guardando) { Guardando... } @else { Guardar Horarios }
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
  edited = signal<boolean>(false);

  readonly DIAS = DIAS;
  readonly DIAS_LABEL = DIAS_LABEL;
  readonly TURNOS = TURNOS;

  semanaLabel = computed(() => {
    const s = this.semanaActual();
    const fin = new Date(s);
    fin.setDate(fin.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return `${s.toLocaleDateString('es', opts)} al ${fin.toLocaleDateString('es', opts)}`;
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

  cambiarTurno(usuarioId: number, dia: string) {
    const actual = this.turnoAsignado(usuarioId, dia);
    const idx = TURNOS.findIndex(t => t.value === actual);
    const next = TURNOS[(idx + 1) % TURNOS.length].value;
    this.setTurno(usuarioId, dia, next === actual ? '' : next);
  }

  quitarTurno(usuarioId: number, dia: string) {
    this.setTurno(usuarioId, dia, '');
  }

  private setTurno(usuarioId: number, dia: string, turno: Turno) {
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
      this.edited.set(true);
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
      next: (data) => {
        this.horarios.set(data);
        this.guardando = false;
        this.edited.set(false);
      },
      error: () => {
        this.guardando = false;
      },
    });
  }

  colorPorTurno(t: Turno): string {
    const c = TURNOS.find(tu => tu.value === t);
    return c ? c.color.replace('bg-', '') : 'transparent';
  }

  labelTurno(t: Turno): string {
    return TURNOS.find(tu => tu.value === t)?.label || '';
  }
}
