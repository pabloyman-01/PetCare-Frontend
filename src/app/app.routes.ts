import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Auth
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'auth/activate/:token',
    loadComponent: () => import('./pages/auth/activate/activate.component').then(m => m.ActivateComponent)
  },

  // Protected routes
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'duenios', loadComponent: () => import('./pages/duenios/duenios.component').then(m => m.DueniosComponent) },
      { path: 'duenios/:id', loadComponent: () => import('./pages/duenios/duenios.component').then(m => m.DueniosComponent) },
      { path: 'mascotas', loadComponent: () => import('./pages/mascotas/list/mascotas-list.component').then(m => m.MascotasListComponent) },
      { path: 'mascotas/:id', loadComponent: () => import('./pages/mascotas/profile/mascota-profile.component').then(m => m.MascotaProfileComponent) },
      { path: 'veterinarios', loadComponent: () => import('./pages/veterinarios/veterinarios.component').then(m => m.VeterinariosComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE'] } },
      { path: 'veterinarios/:id', loadComponent: () => import('./pages/veterinarios/veterinarios.component').then(m => m.VeterinariosComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE'] } },
      { path: 'usuarios', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN'] } },
      { path: 'asistentes', loadComponent: () => import('./pages/asistentes/asistentes.component').then(m => m.AsistentesComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN'] } },
      { path: 'servicios', loadComponent: () => import('./pages/servicios/servicios.component').then(m => m.ServiciosComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_ASISTENTE', 'ROLE_VETERINARIO'] } },
      { path: 'citas', loadComponent: () => import('./pages/citas/list/citas-list.component').then(m => m.CitasListComponent) },
      { path: 'citas/crear', loadComponent: () => import('./pages/citas/create/cita-create.component').then(m => m.CitaCreateComponent) },
      { path: 'citas/:id', loadComponent: () => import('./pages/citas/list/citas-list.component').then(m => m.CitasListComponent) },
      { path: 'alertas', loadComponent: () => import('./pages/alertas/alertas.component').then(m => m.AlertasComponent) },
      { path: 'atencion-clinica', loadComponent: () => import('./pages/atencion-clinica/atencion-clinica.component').then(m => m.AtencionClinicaComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE'] } },
      { path: 'vacunas', loadComponent: () => import('./pages/vacunas/vacunas.component').then(m => m.VacunasComponent) },
      { path: 'controles-mensuales', loadComponent: () => import('./pages/controles-mensuales/controles-mensuales.component').then(m => m.ControlesMensualesComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE'] } },
      { path: 'inasistencias', loadComponent: () => import('./pages/inasistencias/inasistencias.component').then(m => m.InasistenciasComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE'] } },
      { path: 'reportes', loadComponent: () => import('./pages/reportes/reportes.component').then(m => m.ReportesComponent), canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE'] } },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) }
    ]
  },

  { path: '**', redirectTo: '/dashboard' }
];
