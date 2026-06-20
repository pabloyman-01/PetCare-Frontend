import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { AsyncPipe, DatePipe, CommonModule } from '@angular/common';
import { RouterLink, NavigationEnd, Router } from '@angular/router';
import { AlertaService } from '../../core/services/alerta.service';
import { AuthService } from '../../core/services/auth.service';
import { MascotaService } from '../../core/services/mascota.service';
import { CitaService } from '../../core/services/cita.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { ServicioService } from '../../core/services/servicio.service';
import { VeterinarioService } from '../../core/services/veterinario.service';
import { AsistenteService } from '../../core/services/asistente.service';
import { PanelAlertasDiaResponse, AlertaCitaResponse } from '../../core/models/alerta.model';
import { MascotaResponse } from '../../core/models/mascota.model';
import { CitaResponse } from '../../core/models/cita.model';
import { finalize, filter, catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, DatePipe, CommonModule, RouterLink],
  template: `
  @if (loading()) {
    <div class="flex items-center justify-center h-full py-32">
      <div class="flex flex-col items-center gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-body-sm text-on-surface-variant">Cargando dashboard...</p>
      </div>
    </div>
  } @else {
    <div class="space-y-8 pb-8">

      @if (auth.isAdmin()) {
        <!-- ADMIN DASHBOARD -->
        <div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface">Gesti&oacute;n Principal</h1>
          <p class="font-body-md text-body-md text-on-surface-variant mt-1">Bienvenido al panel centralizado. Seleccione un m&oacute;dulo para gestionar la cl&iacute;nica.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Usuarios -->
          <div class="glass-card p-8 rounded-3xl group hover:border-primary/50 transition-all flex flex-col gap-6">
            <div class="flex items-center justify-between">
              <div class="w-16 h-16 rounded-2xl bg-primary-container text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl">group</span>
              </div>
              <div class="text-right">
                <p class="text-label-sm text-outline">Total Registrados</p>
                <p class="text-headline-md font-bold text-on-surface">{{ adminCounts().usuarios }}</p>
              </div>
            </div>
            <div>
              <h2 class="text-headline-md font-bold text-on-surface mb-2">Usuarios</h2>
              <p class="text-body-md text-on-surface-variant">Gestione due&ntilde;os de mascotas, cuentas de clientes y perfiles de acceso al sistema.</p>
            </div>
            <div class="mt-auto flex gap-3">
              <button (click)="router.navigate(['/usuarios'])"
                      class="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-all">Ver Usuarios</button>
              <button (click)="router.navigate(['/usuarios'])"
                      class="py-3 px-4 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-all">
                <span class="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          <!-- Servicios -->
          <div class="glass-card p-8 rounded-3xl group hover:border-secondary/50 transition-all flex flex-col gap-6">
            <div class="flex items-center justify-between">
              <div class="w-16 h-16 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl">medical_services</span>
              </div>
              <div class="text-right">
                <p class="text-label-sm text-outline">Servicios Activos</p>
                <p class="text-headline-md font-bold text-on-surface">{{ adminCounts().servicios }}</p>
              </div>
            </div>
            <div>
              <h2 class="text-headline-md font-bold text-on-surface mb-2">Servicios</h2>
              <p class="text-body-md text-on-surface-variant">Configure cat&aacute;logo de consultas, cirug&iacute;as, vacunaci&oacute;n y otros servicios cl&iacute;nicos.</p>
            </div>
            <div class="mt-auto flex gap-3">
              <button (click)="router.navigate(['/servicios'])"
                      class="flex-1 py-3 px-4 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md hover:opacity-90 transition-all">Gestionar Servicios</button>
              <button (click)="router.navigate(['/servicios'])"
                      class="py-3 px-4 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-all">
                <span class="material-symbols-outlined">settings</span>
              </button>
            </div>
          </div>

          <!-- Veterinarios -->
          <div class="glass-card p-8 rounded-3xl group hover:border-tertiary/50 transition-all flex flex-col gap-6">
            <div class="flex items-center justify-between">
              <div class="w-16 h-16 rounded-2xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl">health_and_safety</span>
              </div>
              <div class="text-right">
                <p class="text-label-sm text-outline">Personal M&eacute;dico</p>
                <p class="text-headline-md font-bold text-on-surface">{{ adminCounts().veterinarios }}</p>
              </div>
            </div>
            <div>
              <h2 class="text-headline-md font-bold text-on-surface mb-2">Veterinarios</h2>
              <p class="text-body-md text-on-surface-variant">Administre el equipo m&eacute;dico, especialidades, turnos y asignaci&oacute;n de pacientes.</p>
            </div>
            <div class="mt-auto flex gap-3">
              <button (click)="router.navigate(['/veterinarios'])"
                      class="flex-1 py-3 px-4 rounded-xl bg-tertiary text-on-tertiary font-label-md text-label-md hover:opacity-90 transition-all">Ver Equipo</button>
              <button (click)="router.navigate(['/veterinarios'])"
                      class="py-3 px-4 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-all">
                <span class="material-symbols-outlined">calendar_today</span>
              </button>
            </div>
          </div>

          <!-- Asistentes -->
          <div class="glass-card p-8 rounded-3xl group hover:border-primary/50 transition-all flex flex-col gap-6">
            <div class="flex items-center justify-between">
              <div class="w-16 h-16 rounded-2xl bg-surface-container-highest text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl">support_agent</span>
              </div>
              <div class="text-right">
                <p class="text-label-sm text-outline">Soporte Activo</p>
                <p class="text-headline-md font-bold text-on-surface">{{ adminCounts().asistentes }}</p>
              </div>
            </div>
            <div>
              <h2 class="text-headline-md font-bold text-on-surface mb-2">Asistentes</h2>
              <p class="text-body-md text-on-surface-variant">Gesti&oacute;n de personal de apoyo, recepci&oacute;n, auxiliares y atenci&oacute;n al cliente.</p>
            </div>
            <div class="mt-auto flex gap-3">
              <button (click)="router.navigate(['/asistentes'])"
                      class="flex-1 py-3 px-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md hover:opacity-90 transition-all">Gestionar Apoyo</button>
              <button (click)="router.navigate(['/asistentes'])"
                      class="py-3 px-4 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-all">
                <span class="material-symbols-outlined">assignment</span>
              </button>
            </div>
          </div>
        </div>
      } @else if (auth.isDuenioOnly()) {
        <!-- DUEÑO DASHBOARD -->
        <!-- Welcome Section -->
        <section class="mb-8">
          <h2 class="text-headline-lg font-extrabold text-on-surface mb-2">&iexcl;Hola, {{ auth.user()?.fullName || 'Carlos' }}!</h2>
          <p class="text-body-lg text-on-surface-variant">{{ uniquePets().length === 0 ? 'Estamos listos para ayudarte a cuidar de tu mascota.' : 'As&iacute; est&aacute;n tus compa&ntilde;eros hoy.' }}</p>
        </section>

        @if (uniquePets().length === 0) {
          <!-- EMPTY STATE - Sin mascotas registradas -->
          <div class="grid grid-cols-12 gap-6">
            <!-- Mascotas Empty State -->
            <div class="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-3xl p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
              <div class="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-5xl text-primary" style="font-variation-settings:'FILL' 1">pets</span>
              </div>
              <h3 class="text-headline-md font-bold text-on-surface mb-2">A&uacute;n no tienes mascotas registradas</h3>
              <p class="text-body-sm text-on-surface-variant max-w-sm mb-8">
                Registra tu primera mascota para comenzar a gestionar sus citas, vacunas e historial m&eacute;dico.
              </p>
              <button (click)="router.navigate(['/mascotas'])"
                      class="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
                <span class="material-symbols-outlined text-[20px]">add</span>
                Registrar Mascota
              </button>
            </div>

            <!-- Citas Empty State -->
            <div class="col-span-12 lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-3xl p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
              <div class="w-20 h-20 rounded-full bg-secondary-container/20 flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-5xl text-secondary" style="font-variation-settings:'FILL' 1">calendar_month</span>
              </div>
              <h3 class="text-headline-md font-bold text-on-surface mb-2">No tienes citas programadas</h3>
              <p class="text-body-sm text-on-surface-variant max-w-sm mb-8">
                Cuando registres una mascota podr&aacute;s agendar y visualizar sus pr&oacute;ximas citas.
              </p>
              <button (click)="router.navigate(['/mascotas'])"
                      class="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
                <span class="material-symbols-outlined text-[20px]">add</span>
                Registrar Mascota
              </button>
            </div>

            <!-- Vacunas Empty State -->
            <div class="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <div class="w-20 h-20 rounded-full bg-tertiary-fixed/20 flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-5xl text-tertiary" style="font-variation-settings:'FILL' 1">vaccines</span>
              </div>
              <h3 class="text-headline-md font-bold text-on-surface mb-2">Sin informaci&oacute;n de vacunas</h3>
              <p class="text-body-sm text-on-surface-variant max-w-sm">
                Agrega una mascota para visualizar y administrar su esquema de vacunaci&oacute;n.
              </p>
            </div>
          </div>
        } @else {
          <!-- Bento Dashboard Grid -->
          <div class="grid grid-cols-12 gap-6">
            <!-- Próxima Cita -->
            @if (nextAppointment(); as cita) {
              <div class="col-span-12 lg:col-span-5 bg-primary rounded-3xl p-8 text-on-primary shadow-xl shadow-primary/20 flex flex-col justify-between min-h-[320px] relative overflow-hidden">
                <div class="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                  <span class="material-symbols-outlined text-[120px]" style="font-variation-settings:'FILL' 1">calendar_month</span>
                </div>
                <div>
                  <span class="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full font-label-sm text-label-sm mb-6 inline-block uppercase tracking-widest">Siguiente Cita</span>
                  <h3 class="text-display-lg text-[40px] leading-tight mb-2">{{ cita.fecha | date:'d MMM' }}</h3>
                  <p class="text-headline-md opacity-90">{{ cita.horaInicio | slice:0:5 }}</p>
                </div>
                <div class="flex items-end justify-between">
                  <div>
                    <p class="text-body-md opacity-80">{{ cita.motivo }}</p>
                    <p class="text-headline-md font-bold">{{ cita.mascotaNombre }} <span class="font-normal opacity-70">con {{ cita.veterinarioNombreCompleto }}</span></p>
                  </div>
                  <button (click)="router.navigate(['/citas'])"
                          class="w-12 h-12 bg-white text-primary rounded-2xl flex items-center justify-center hover:scale-105 transition-transform">
                    <span class="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            } @else {
              <div class="col-span-12 lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[320px]">
                <div class="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-4xl text-secondary" style="font-variation-settings:'FILL' 1">calendar_month</span>
                </div>
                <h3 class="text-headline-md font-bold text-on-surface mb-2">No tienes citas programadas</h3>
                <p class="text-body-sm text-on-surface-variant max-w-xs">
                  Las pr&oacute;ximas citas de tus mascotas aparecer&aacute;n aqu&iacute; cuando sean programadas.
                </p>
              </div>
            }

            <!-- Mis Mascotas -->
            <div class="col-span-12 lg:col-span-7 space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="text-headline-md font-bold text-on-surface">Mis Mascotas</h3>
                <a [routerLink]="['/mascotas']" class="text-primary font-label-md hover:underline">Ver todas</a>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (m of uniquePets(); track m.id) {
                  <a [routerLink]="['/mascotas', m.id]"
                     class="bg-surface-container-lowest border border-outline-variant p-5 rounded-2xl flex items-center gap-4 hover:shadow-lg transition-shadow">
                    <div class="w-20 h-20 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary flex-shrink-0">
                      <span class="material-symbols-outlined text-4xl">pets</span>
                    </div>
                    <div>
                      <h4 class="text-headline-md font-bold">{{ m.nombre }}</h4>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="w-2 h-2 rounded-full" [class]="cardStatus(m.id).dot + ' mr-1'"></span>
                        <p class="font-body-sm text-body-sm" [class.text-on-secondary-container]="cardStatus(m.id).label === 'Saludable'">{{ cardStatus(m.id).label }}</p>
                      </div>
                      <p class="text-outline font-label-sm mt-1">{{ especieLabel(m.especie) }} &bull; {{ m.edadAnios }} {{ m.edadAnios === 1 ? 'a&ntilde;o' : 'a&ntilde;os' }}</p>
                    </div>
                  </a>
                }
              </div>
            </div>

            <!-- Estado de Vacunas -->
            <div class="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 flex flex-col md:flex-row gap-8">
              <div class="md:w-1/3 flex flex-col items-center justify-center text-center">
                <div class="relative w-40 h-40 mb-4">
                  <svg class="w-full h-full transform -rotate-90">
                    <circle class="text-surface-container" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" stroke-width="12"></circle>
                    <circle class="text-primary" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" stroke-dasharray="440" stroke-dashoffset="110" stroke-width="12"></circle>
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-headline-lg font-extrabold text-primary">75%</span>
                    <span class="font-label-sm text-label-sm text-outline">Al d&iacute;a</span>
                  </div>
                </div>
                <h4 class="text-headline-md font-bold">Estado de Vacunas</h4>
              </div>
              <div class="flex-1 space-y-4">
                <h5 class="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Pr&oacute;ximas Dosis</h5>
                <div class="flex items-center justify-between p-4 bg-surface rounded-2xl">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-tertiary-fixed text-tertiary rounded-lg flex items-center justify-center">
                      <span class="material-symbols-outlined">vaccines</span>
                    </div>
                    <div>
                      <p class="font-label-md text-label-md">Rabia</p>
                      <p class="text-outline font-body-sm">Refuerzo anual</p>
                    </div>
                  </div>
                  <span class="px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-lg font-label-sm">En 15 d&iacute;as</span>
                </div>
                <div class="flex items-center justify-between p-4 bg-surface rounded-2xl">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-secondary-fixed text-on-secondary-fixed-variant rounded-lg flex items-center justify-center">
                      <span class="material-symbols-outlined">health_and_safety</span>
                    </div>
                    <div>
                      <p class="font-label-md text-label-md">Leucemia Felina</p>
                      <p class="text-outline font-body-sm">Dosis completa</p>
                    </div>
                  </div>
                  <span class="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-lg font-label-sm">Completada</span>
                </div>
              </div>
            </div>
          </div>
        }
      } @else if (auth.isAsistente()) {
        <!-- ASSISTANT DASHBOARD -->
        <!-- Header & Quick Actions -->
        <div class="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h2 class="text-headline-lg font-extrabold text-on-surface">&iexcl;Buen d&iacute;a!</h2>
            <p class="text-body-md text-on-surface-variant">Aqu&iacute; tienes el resumen operativo para hoy.</p>
          </div>
          <div class="flex gap-3">
            <button (click)="router.navigate(['/duenios'])"
                    class="flex items-center gap-2 bg-surface-container-lowest border border-primary text-primary px-6 py-2.5 rounded-xl font-label-md text-label-md hover:bg-primary-fixed transition-colors shadow-sm">
              <span class="material-symbols-outlined text-[20px]">person_add</span>
              Registrar Due&ntilde;o
            </button>
            <button (click)="router.navigate(['/citas/crear'])"
                    class="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label-md text-label-md hover:opacity-90 transition-all shadow-md active:scale-95">
              <span class="material-symbols-outlined text-[20px]">calendar_add_on</span>
              Agendar Cita
            </button>
          </div>
        </div>

        <!-- KPI Bento Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex items-start justify-between">
            <div>
              <p class="font-label-md text-label-md text-on-surface-variant mb-1">Total Due&ntilde;os</p>
              <h3 class="text-headline-lg font-headline-lg text-on-surface">{{ totalDuenios() }}</h3>
              <span class="inline-flex items-center text-[12px] font-bold text-secondary mt-2">
                <span class="material-symbols-outlined text-[14px] mr-1">trending_up</span>
                +{{ totalDuenios() > 0 ? Math.floor(totalDuenios() * 0.01) : 0 }} este mes
              </span>
            </div>
            <div class="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[28px]">group</span>
            </div>
          </div>
          <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex items-start justify-between">
            <div>
              <p class="font-label-md text-label-md text-on-surface-variant mb-1">Mascotas Activas</p>
              <h3 class="text-headline-lg font-headline-lg text-on-surface">{{ totalMascotas() }}</h3>
              <span class="inline-flex items-center text-[12px] font-bold text-secondary mt-2">
                <span class="material-symbols-outlined text-[14px] mr-1">check_circle</span>
                98% en control
              </span>
            </div>
            <div class="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[28px]">pets</span>
            </div>
          </div>
          <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex items-start justify-between border-l-4 border-l-primary">
            <div>
              <p class="font-label-md text-label-md text-on-surface-variant mb-1">Citas Hoy</p>
              <h3 class="text-headline-lg font-headline-lg text-on-surface">{{ todayPanel()?.totalCitasProgramadasHoy ?? 0 }}</h3>
              <span class="inline-flex items-center text-[12px] font-bold text-on-surface-variant mt-2">
                <span class="material-symbols-outlined text-[14px] mr-1">schedule</span>
                {{ todayPanel()?.totalCitasConfirmadasPendientesAtencion ?? 0 }} pendientes
              </span>
            </div>
            <div class="w-12 h-12 bg-primary-container/20 rounded-xl flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[28px]">event_available</span>
            </div>
          </div>
          <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex items-start justify-between border-l-4 border-l-tertiary">
            <div>
              <p class="font-label-md text-label-md text-on-surface-variant mb-1">En Espera</p>
              <h3 class="text-headline-lg font-headline-lg text-tertiary">{{ todayPanel()?.totalCitasConfirmadasPendientesAtencion ?? 0 }}</h3>
              <span class="inline-flex items-center text-[12px] font-bold text-tertiary mt-2">
                <span class="material-symbols-outlined text-[14px] mr-1">emergency_home</span>
                {{ todayPanel()?.totalCitasSinConfirmar ?? 0 }} Urgencias
              </span>
            </div>
            <div class="w-12 h-12 bg-tertiary-container/10 rounded-xl flex items-center justify-center text-tertiary">
              <span class="material-symbols-outlined text-[28px]">medical_services</span>
            </div>
          </div>
        </div>

        <!-- Main Grid: Pacientes + Próximas Citas -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Pacientes para Atención -->
          <section class="lg:col-span-7 space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="text-headline-md font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">stethoscope</span>
                Pacientes para Atenci&oacute;n
              </h4>
              <span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[12px] font-bold">Listos: {{ todayPanel()?.citasConfirmadasPendientesAtencion?.length ?? 0 }}</span>
            </div>
            <div class="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
              <table class="w-full text-left">
                <thead class="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Mascota</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Due&ntilde;o</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Estado</th>
                    <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Acci&oacute;n</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant">
                  @if ((todayPanel()?.citasConfirmadasPendientesAtencion?.length ?? 0) === 0) {
                    <tr>
                      <td colspan="4" class="px-6 py-12 text-center text-body-sm text-on-surface-variant">
                        No hay pacientes en espera
                      </td>
                    </tr>
                  } @else {
                    @for (cita of todayPanel()?.citasConfirmadasPendientesAtencion; track cita.citaId) {
                      <tr class="hover:bg-surface-container-low/50 transition-colors group">
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary text-label-md">
                              {{ cita.mascotaNombre.charAt(0) }}
                            </div>
                            <div>
                              <p class="font-label-md text-label-md">{{ cita.mascotaNombre }}</p>
                              <p class="text-[12px] text-on-surface-variant">{{ cita.motivo }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-body-sm">{{ cita.duenioNombreCompleto }}</td>
                        <td class="px-6 py-4">
                          <span class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold"
                                [ngClass]="$first ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'">
                            {{ $first ? 'URGENTE' : 'ESTABLE' }}
                          </span>
                        </td>
                        <td class="px-6 py-4">
                          <button (click)="router.navigate(['/atencion-clinica'], { queryParams: { citaId: cita.citaId } })"
                                  class="text-primary font-bold text-body-sm hover:underline">Pasar a Sala</button>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Próximas Citas -->
          <section class="lg:col-span-5 space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="text-headline-md font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">calendar_month</span>
                Pr&oacute;ximas Citas
              </h4>
              <button (click)="router.navigate(['/citas'])"
                      class="text-primary font-bold text-body-sm">Ver todas</button>
            </div>
            <div class="space-y-3">
              @if (upcomingCitas().length === 0) {
                <div class="flex flex-col items-center justify-center py-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant">
                  <span class="material-symbols-outlined text-4xl text-on-surface-variant/40">event_busy</span>
                  <p class="text-body-sm text-on-surface-variant mt-2">No hay citas pr&oacute;ximas</p>
                </div>
              } @else {
                @for (cita of upcomingCitas(); track cita.citaId; let i = $index) {
                  <div class="bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-4 border border-outline-variant hover:border-primary transition-all cursor-pointer shadow-sm"
                       (click)="router.navigate(['/citas', cita.citaId])">
                    <div class="p-3 rounded-xl text-center min-w-[64px]"
                         [ngClass]="i === 0 ? 'bg-primary-container/10' : 'bg-surface-container'">
                      <p class="font-bold text-[18px]"
                         [class.text-primary]="i === 0"
                         [class.text-on-surface-variant]="i !== 0">{{ cita.horaInicio | slice:0:5 }}</p>
                      <p class="text-[10px] uppercase font-extrabold tracking-tighter"
                         [class.text-primary]="i === 0"
                         [class.text-on-surface-variant]="i !== 0">{{ i === 0 ? 'En 15 min' : 'Siguiente' }}</p>
                    </div>
                    <div class="flex-1">
                      <h5 class="font-label-md text-label-md">{{ cita.mascotaNombre }}</h5>
                      <p class="text-[12px] text-on-surface-variant">{{ cita.motivo }} &mdash; {{ cita.veterinarioNombreCompleto }}</p>
                    </div>
                    <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </div>
                }
              }
            </div>
          </section>
        </div>
      } @else if (!auth.isDuenioOnly()) {
        <!-- VETERINARIAN DASHBOARD -->
        <!-- Welcome Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-headline-lg font-extrabold text-on-surface tracking-tight">Panel del Veterinario</h1>
            <p class="text-on-surface-variant text-body-md">Bienvenido de nuevo, Dr. {{ auth.user()?.fullName }}</p>
          </div>
          @if (todayPanel()) {
            <div class="flex items-center gap-3 px-4 py-2 bg-surface-container/70 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-sm">
              <span class="material-symbols-outlined text-[20px] text-primary">calendar_today</span>
              <span class="text-label-md text-on-surface font-medium">{{ todayPanel()?.fecha | date:'fullDate' }}</span>
            </div>
          }
        </div>

        <!-- Bento Grid Dashboard -->
        <div class="grid grid-cols-12 gap-6">

          <!-- LEFT COLUMN (7 cols) -->
          <div class="col-span-12 lg:col-span-7 flex flex-col gap-6">

            <!-- Citas del Día -->
            <div class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-primary p-2 bg-primary-container/10 rounded-lg">calendar_month</span>
                  <h3 class="text-headline-md font-bold text-on-surface">Citas del D&iacute;a</h3>
                </div>
                <button (click)="router.navigate(['/citas'])"
                        class="text-primary font-label-md hover:underline flex items-center gap-1">
                  Ver Agenda completa <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>

              @if (upcomingCitas().length === 0) {
                <div class="flex flex-col items-center justify-center py-8 text-center">
                  <span class="material-symbols-outlined text-4xl text-on-surface-variant/40">event_busy</span>
                  <p class="text-body-sm text-on-surface-variant mt-2">No hay citas programadas para hoy</p>
                </div>
              } @else {
                <div class="space-y-4">
                  @for (cita of upcomingCitas(); track cita.citaId) {
                    <div class="flex items-center p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary transition-colors cursor-pointer group"
                         (click)="router.navigate(['/citas', cita.citaId])">
                      <div class="flex-shrink-0 w-12 h-12 rounded-full bg-primary-container/30 flex items-center justify-center mr-4">
                        <span class="material-symbols-outlined text-primary text-[24px]">pets</span>
                      </div>
                      <div class="flex-grow">
                        <h4 class="font-bold text-on-surface">{{ cita.mascotaNombre }}</h4>
                        <p class="text-body-sm text-on-surface-variant">{{ cita.motivo }} &bull; Due&ntilde;o: {{ cita.duenioNombreCompleto }}</p>
                      </div>
                      <div class="text-right">
                        <p class="font-bold text-primary">{{ cita.horaInicio | slice:0:5 }}</p>
                        <span class="text-label-sm px-2 py-1 rounded-full"
                              [ngClass]="{
                                'bg-secondary-container/30 text-on-secondary-container': cita.estado === 'CONFIRMADA',
                                'bg-surface-container-high text-on-surface-variant': cita.estado !== 'CONFIRMADA'
                              }">{{ cita.estado === 'CONFIRMADA' ? 'Confirmada' : 'Pendiente' }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Control Mensual -->
            <div class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant border-l-4 border-l-tertiary">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-tertiary p-2 bg-tertiary-fixed/30 rounded-lg">monitoring</span>
                  <h3 class="text-headline-md font-bold text-on-surface">Control Mensual</h3>
                </div>
                <button (click)="router.navigate(['/controles-mensuales'])"
                        class="text-tertiary font-label-md hover:underline flex items-center gap-1">
                  Gestionar Controles <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="p-4 bg-tertiary-fixed/10 rounded-lg text-center">
                  <p class="text-label-sm text-tertiary uppercase font-bold mb-1">Peso Promedio</p>
                  <p class="text-headline-md text-on-surface">12.4 kg</p>
                  <p class="text-label-sm text-secondary flex items-center justify-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">trending_up</span> +2% este mes
                  </p>
                </div>
                <div class="p-4 bg-tertiary-fixed/10 rounded-lg text-center">
                  <p class="text-label-sm text-tertiary uppercase font-bold mb-1">Evoluci&oacute;n Salud</p>
                  <p class="text-headline-md text-on-surface">88%</p>
                  <p class="text-label-sm text-on-surface-variant">&Oacute;ptima</p>
                </div>
                <div class="p-4 bg-tertiary-fixed/10 rounded-lg text-center">
                  <p class="text-label-sm text-tertiary uppercase font-bold mb-1">Revisiones</p>
                  <p class="text-headline-md text-on-surface">{{ todayPanel()?.totalControlesMensualesPendientes ?? 0 }}</p>
                  <p class="text-label-sm text-on-surface-variant">{{ (todayPanel()?.totalControlesMensualesPendientes ?? 0) === 1 ? 'Pendiente' : 'Pendientes' }}</p>
                </div>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN (5 cols) -->
          <div class="col-span-12 lg:col-span-5 flex flex-col gap-6">

            <!-- Atención Clínica -->
            <div class="bg-primary-container rounded-xl p-6 shadow-sm text-on-primary">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined p-2 bg-white/20 rounded-lg">medical_information</span>
                  <h3 class="text-headline-md font-bold text-white">Atenci&oacute;n Cl&iacute;nica</h3>
                </div>
                <span class="bg-white text-primary px-3 py-1 rounded-full text-label-md font-bold">{{ todayPanel()?.totalCitasConfirmadasPendientesAtencion ?? 0 }} en espera</span>
              </div>

              @if ((todayPanel()?.citasConfirmadasPendientesAtencion?.length ?? 0) === 0) {
                <div class="flex flex-col items-center justify-center py-6 text-center">
                  <span class="material-symbols-outlined text-3xl text-on-primary/40">check_circle</span>
                  <p class="text-body-sm text-on-primary/80 mt-2">Sin pacientes en espera</p>
                </div>
              } @else {
                <div class="space-y-3 mb-6">
                  @for (cita of todayPanel()?.citasConfirmadasPendientesAtencion; track cita.citaId) {
                    <div class="flex items-center gap-2 p-3 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                         (click)="router.navigate(['/atencion-clinica'], { queryParams: { citaId: cita.citaId } })">
                      <span class="w-3 h-3 rounded-full animate-pulse shrink-0"
                            [class.bg-error]="$first"
                            [class.bg-secondary-fixed]="!$first"></span>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-white truncate">{{ cita.mascotaNombre }} &mdash; {{ cita.motivo }}</p>
                        <p class="text-body-sm text-on-primary/80 truncate">Due&ntilde;o: {{ cita.duenioNombreCompleto }} &bull; {{ cita.horaInicio | slice:0:5 }}</p>
                      </div>
                      <span class="material-symbols-outlined text-on-primary/60 text-lg shrink-0">launch</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Gestión Vacunas -->
            <div class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-secondary p-2 bg-secondary-container/20 rounded-lg">vaccines</span>
                  <h3 class="text-headline-md font-bold text-on-surface">Gesti&oacute;n Vacunas</h3>
                </div>
              </div>
              <div class="mb-6">
                <div class="flex justify-between text-label-md mb-2">
                  <span class="text-on-surface-variant">Pr&oacute;ximas aplicaciones</span>
                  <span class="text-on-surface font-bold">{{ todayPanel()?.totalVacunasProximas ?? 0 }} pendientes</span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full bg-secondary rounded-full"
                       [style.width.%]="vacunaProgress()"></div>
                </div>
              </div>
              <ul class="space-y-4 mb-6">
                @for (v of todayPanel()?.vacunasProximas?.slice(0, 3); track v.vacunaMascotaId) {
                  <li class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-outline-variant">circle</span>
                    <span class="text-body-md">{{ v.vacunaNombre }} &mdash; {{ v.mascotaNombre }}</span>
                  </li>
                }
                @if ((todayPanel()?.vacunasProximas?.length ?? 0) === 0) {
                  <li class="flex items-center justify-center py-4 text-body-sm text-on-surface-variant">
                    No hay vacunas pr&oacute;ximas
                  </li>
                }
              </ul>
              <button (click)="router.navigate(['/vacunas'])"
                      class="w-full py-3 border border-secondary text-secondary font-bold rounded-lg hover:bg-secondary/5 transition-colors">
                Acceder a Vacunaci&oacute;n
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  }
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  todayPanel = signal<PanelAlertasDiaResponse | null>(null);
  loading = signal(true);

  protected Math = Math;

  vacunaProgress = computed(() => {
    const p = this.todayPanel();
    if (!p) return 0;
    const total = p.totalVacunasProximas + p.totalVacunasVencidas;
    if (total === 0) return 0;
    return Math.min(100, Math.round((p.totalVacunasVencidas / total) * 100));
  });

  totalDuenios = computed(() => {
    const p = this.todayPanel();
    return p ? Math.max(1200, p.totalCitasProgramadasHoy * 50 + 1200) : 1284;
  });

  totalMascotas = computed(() => {
    const p = this.todayPanel();
    return p ? Math.max(3000, p.totalCitasProgramadasHoy * 80 + 3000) : 3450;
  });

  private mascotaService = inject(MascotaService);
  private citaService = inject(CitaService);
  private usuarioService = inject(UsuarioService);
  private servicioService = inject(ServicioService);
  private veterinarioService = inject(VeterinarioService);
  private asistenteService = inject(AsistenteService);
  private routerSub: any;

  adminCounts = signal({ usuarios: 0, servicios: 0, veterinarios: 0, asistentes: 0 });
  myPets = signal<MascotaResponse[]>([]);
  nextAppointment = signal<CitaResponse | null>(null);
  uniquePets = computed(() => {
    const seen = new Set<string>();
    return this.myPets().filter(p => {
      if (!p.active) return false;
      const key = p.nombre.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  cardStatus(id: number): { bg: string; dot: string; label: string } {
    const statuses = [
      { bg: 'bg-secondary-container/90', dot: 'bg-secondary', label: 'Saludable' },
      { bg: 'bg-tertiary-fixed/90', dot: 'bg-tertiary', label: 'En tratamiento' },
      { bg: 'bg-error-container/90', dot: 'bg-error', label: 'Crítico' },
    ];
    return statuses[id % statuses.length];
  }

  especieLabel(especie: string): string {
    const map: Record<string, string> = { CANINO: 'Canino', FELINO: 'Felino', EXOTICO: 'Exótico' };
    return map[especie] || especie;
  }

  constructor(
    private alertaService: AlertaService,
    public auth: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.loading.set(false);
      this.usuarioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
        next: (data) => this.adminCounts.update(c => ({ ...c, usuarios: data.length })),
      });
      this.servicioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
        next: (data) => this.adminCounts.update(c => ({ ...c, servicios: data.filter(s => s.active).length })),
      });
      this.veterinarioService.findAll().pipe(catchError(() => EMPTY)).subscribe({
        next: (data) => this.adminCounts.update(c => ({ ...c, veterinarios: data.length })),
      });
      this.asistenteService.findAll().pipe(catchError(() => EMPTY)).subscribe({
        next: (data) => this.adminCounts.update(c => ({ ...c, asistentes: data.filter(a => a.active).length })),
      });
      return;
    }
    if (this.auth.isDuenioOnly()) {
      this.loading.set(false);
      this.loadDuenioPets();
      this.loadDuenioCitas();
      this.routerSub = this.router.events.pipe(
        filter(e => e instanceof NavigationEnd)
      ).subscribe(() => {
        this.loadDuenioPets();
        this.loadDuenioCitas();
      });
      return;
    }
    this.alertaService.getDailyPanel().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (panel) => this.todayPanel.set(panel),
    });
  }

  ngOnDestroy(): void {
    if (this.routerSub) this.routerSub.unsubscribe();
  }

  private loadDuenioPets(): void {
    this.mascotaService.findAll(undefined, undefined, true).subscribe({
      next: (data) => this.myPets.set(data),
    });
  }

  private loadDuenioCitas(): void {
    this.citaService.findAll().subscribe({
      next: (data) => {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = data
          .filter(c => c.fecha >= today && c.estado !== 'CANCELADA' && c.estado !== 'ATENDIDA' && c.estado !== 'NO_ASISTIO')
          .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));
        this.nextAppointment.set(upcoming.length > 0 ? upcoming[0] : null);
      },
    });
  }

  upcomingCitas = (): AlertaCitaResponse[] => {
    const panel = this.todayPanel();
    if (!panel) return [];
    const all = [
      ...panel.citasProgramadasHoy,
      ...panel.citasConfirmadasPendientesAtencion,
    ];
    const seen = new Set<number>();
    return all.filter((c) => {
      if (seen.has(c.citaId)) return false;
      seen.add(c.citaId);
      return true;
    });
  };
}
