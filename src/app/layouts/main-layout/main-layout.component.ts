import { Component, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <div class="flex h-screen w-full overflow-hidden bg-surface">
    <!-- Sidebar -->
    <aside class="hidden md:flex flex-col h-full w-[280px] bg-surface border-r border-outline-variant shadow-sm flex-shrink-0">
      <div class="flex items-center gap-3 px-6 py-5">
        <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span class="material-symbols-outlined text-on-primary fill">pets</span>
        </div>
        <div>
          <a routerLink="/dashboard" class="hover:opacity-80 transition-opacity">
            <h1 class="font-headline-md text-[20px] font-extrabold text-primary">PetCare</h1>
            <p class="text-label-sm text-on-surface-variant">Gesti&oacute;n Veterinaria</p>
          </a>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto scrollbar-hide px-3 space-y-0.5">
        @for (item of filteredNavItems(); track item.route) {
          <a [routerLink]="item.route"
             routerLinkActive="bg-primary-container text-on-primary-container font-bold shadow-sm"
             class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all duration-200">
            <span class="material-symbols-outlined text-[22px]">{{ item.icon }}</span>
            <span class="text-label-md">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="border-t border-outline-variant/30 p-4 space-y-1">
        <a routerLink="/profile" routerLinkActive="text-primary font-bold"
           class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all duration-200">
          <span class="material-symbols-outlined text-[22px]">account_circle</span>
          <span class="text-label-md">Mi Perfil</span>
        </a>
        <button (click)="auth.logout()"
                class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-error hover:bg-error-container/20 transition-all duration-200">
          <span class="material-symbols-outlined text-[22px]">logout</span>
          <span class="text-label-md">Cerrar Sesi&oacute;n</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col min-w-0 h-full">
      <!-- Topbar -->
      <header class="h-16 sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-6 flex-shrink-0">
        <div class="flex items-center gap-3">
          <button class="md:hidden p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant" (click)="mobileSidebarOpen = !mobileSidebarOpen">
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>
        <div class="flex items-center gap-4 relative">
          <button (click)="toggleNotificaciones()" class="w-9 h-9 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant relative">
            <span class="material-symbols-outlined">notifications</span>
            @if (notifSvc.noLeidas() > 0) {
              <span class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-[9px] text-white font-bold rounded-full flex items-center justify-center border-2 border-surface">{{ notifSvc.noLeidas() }}</span>
            }
          </button>
          @if (mostrarNotificaciones) {
            <div class="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50" (click)="mostrarNotificaciones = false">
              <div class="p-3 border-b border-outline-variant/20 flex items-center justify-between">
                <span class="text-label-md font-bold text-on-surface">Notificaciones</span>
                <span class="text-label-sm text-on-surface-variant">{{ notifSvc.notificaciones().length }} pendientes</span>
              </div>
              @if (notifSvc.notificaciones().length === 0) {
                <div class="p-6 text-center text-body-sm text-on-surface-variant">Sin notificaciones</div>
              }
              @for (n of notifSvc.notificaciones(); track n.id) {
                <a [routerLink]="n.ruta" (click)="notifSvc.marcarLeidas()"
                   class="flex items-start gap-3 p-3 hover:bg-surface-container-high transition-colors border-b border-outline-variant/10 last:border-0">
                  <span class="material-symbols-outlined text-[20px] mt-0.5"
                        [class.text-primary]="n.tipo === 'CITA_PROXIMA'"
                        [class.text-error]="n.tipo === 'CITA_CONFIRMAR'"
                        [class.text-secondary]="n.tipo === 'VACUNA'"
                        [class.text-tertiary]="n.tipo === 'RECORDATORIO'"
                        [class.text-warning]="n.tipo === 'ATENCION_PENDIENTE'">{{ n.icono }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-body-sm text-on-surface font-medium truncate">{{ n.mensaje }}</p>
                    <p class="text-label-sm text-on-surface-variant">{{ n.fecha }}</p>
                  </div>
                </a>
              }
            </div>
          }
          <div class="h-6 w-px bg-outline-variant/30"></div>
          <div class="flex items-center gap-3">
            <div class="text-right hidden sm:block">
              <p class="text-label-md text-on-surface leading-tight">{{ auth.user()?.fullName }}</p>
              <p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">{{ displayRole() }}</p>
            </div>
            <div class="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-label-md font-bold">
              {{ initials() }}
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <div class="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <router-outlet />
      </div>
    </main>

    <!-- Mobile sidebar overlay -->
    @if (mobileSidebarOpen) {
      <div class="fixed inset-0 bg-black/20 z-50 md:hidden" (click)="mobileSidebarOpen = false">
        <div class="w-[280px] h-full bg-surface p-4 overflow-y-auto" (click)="\$event.stopPropagation()">
          <div class="flex items-center gap-3 px-4 py-3 mb-4">
            <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span class="material-symbols-outlined text-on-primary fill">pets</span>
            </div>
            <a routerLink="/dashboard" class="hover:opacity-80 transition-opacity">
              <h1 class="text-headline-md font-extrabold text-primary">PetCare</h1>
            </a>
          </div>
          @for (item of filteredNavItems(); track item.route) {
            <a [routerLink]="item.route" (click)="mobileSidebarOpen = false"
               class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all">
              <span class="material-symbols-outlined">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
          <hr class="my-4 border-outline-variant/30">
          <button (click)="auth.logout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-error hover:bg-error-container/20">
            <span class="material-symbols-outlined">logout</span>
            <span>Cerrar Sesi&oacute;n</span>
          </button>
        </div>
      </div>
    }
  </div>
  `
})
export class MainLayoutComponent implements OnInit {
  mobileSidebarOpen = false;
  mostrarNotificaciones = false;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE'] },
    { label: 'Usuarios', icon: 'manage_accounts', route: '/usuarios', roles: ['ROLE_ADMIN'] },
    { label: 'Servicios', icon: 'inventory_2', route: '/servicios', roles: ['ROLE_ADMIN'] },
    { label: 'Veterinarios', icon: 'medical_services', route: '/veterinarios', roles: ['ROLE_ADMIN'] },
    { label: 'Asistentes', icon: 'support_agent', route: '/asistentes', roles: ['ROLE_ADMIN'] },
    { label: 'Dueños', icon: 'group', route: '/duenios', roles: ['ROLE_ASISTENTE'] },
    { label: 'Mascotas', icon: 'pets', route: '/mascotas', roles: ['ROLE_ASISTENTE'] },
    { label: 'Alertas', icon: 'notifications_active', route: '/alertas', roles: ['ROLE_ADMIN', 'ROLE_ASISTENTE'] },
    { label: 'Citas', icon: 'calendar_month', route: '/citas', roles: ['ROLE_VETERINARIO', 'ROLE_ASISTENTE'] },
    { label: 'Atención Clínica', icon: 'monitor_heart', route: '/atencion-clinica', roles: ['ROLE_VETERINARIO'] },
    { label: 'Vacunas', icon: 'vaccines', route: '/vacunas', roles: ['ROLE_VETERINARIO'] },
    { label: 'Control Mensual', icon: 'query_stats', route: '/controles-mensuales', roles: ['ROLE_VETERINARIO'] },
    { label: 'Inasistencias', icon: 'event_busy', route: '/inasistencias', roles: [] },
    { label: 'Reportes', icon: 'analytics', route: '/reportes', roles: [] }
  ];

  constructor(public auth: AuthService, public notifSvc: NotificacionService, private router: Router) {}

  ngOnInit(): void {
    this.notifSvc.cargar();
    setInterval(() => this.notifSvc.cargar(), 60000);
  }

  toggleNotificaciones(): void {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    if (this.mostrarNotificaciones) this.notifSvc.cargar();
  }

  filteredNavItems = computed(() => {
    if (this.auth.isDuenioOnly()) {
      return this.navItems.filter(i =>
        ['/dashboard', '/mascotas', '/citas', '/vacunas'].includes(i.route)
      );
    }
    return this.navItems.filter(i => {
      if (!i.roles) return true;
      return i.roles.some(r => this.auth.roles().includes(r));
    });
  });

  displayRole = computed(() => {
    const roles = this.auth.roles();
    if (roles.includes('ROLE_ADMIN')) return 'Administrador';
    if (roles.includes('ROLE_VETERINARIO')) return 'Veterinario';
    if (roles.includes('ROLE_ASISTENTE')) return 'Asistente';
    if (roles.includes('ROLE_DUENIO')) return 'Dueño';
    return '';
  });

  initials = computed(() => {
    const name = this.auth.user()?.fullName ?? '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  });
}
