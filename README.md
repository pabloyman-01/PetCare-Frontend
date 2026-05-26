# PetCare Frontend

Sistema de gestión veterinaria integral. Frontend desarrollado con **Angular 18** y **Tailwind CSS**.

## Tecnologías

| Tecnología | Versión |
|---|---|
| Angular | 18.2.x |
| TypeScript | ~5.5.0 |
| RxJS | ~7.8.0 |
| Tailwind CSS | 3.4.10 |
| Angular CLI | 18.2.x |

## Estructura del proyecto

```
src/
├── app/
│   ├── core/                         # Capa transversal
│   │   ├── guards/                   # AuthGuard, RoleGuard
│   │   ├── interceptors/             # Auth interceptor (JWT + refresh), Error interceptor
│   │   ├── models/                   # Interfaces TypeScript (12 modelos)
│   │   └── services/                 # Servicios HTTP (13 servicios)
│   ├── layouts/
│   │   └── main-layout/              # Layout principal con sidebar + topbar
│   ├── pages/                        # Módulos funcionales (16)
│   │   ├── auth/                     # Login, registro, activación
│   │   ├── dashboard/                # Dashboard con 4 variantes por rol
│   │   ├── duenios/                  # CRUD dueños
│   │   ├── mascotas/                 # Listado y perfil de mascotas
│   │   ├── veterinarios/             # CRUD veterinarios + horarios
│   │   ├── asistentes/               # CRUD asistentes
│   │   ├── usuarios/                 # CRUD usuarios + roles
│   │   ├── servicios/                # CRUD servicios
│   │   ├── citas/                    # Calendario + creación de citas
│   │   ├── vacunas/                  # CRUD vacunas + registro por mascota
│   │   ├── atencion-clinica/         # Registro de atención clínica
│   │   ├── controles-mensuales/      # Controles mensuales por mascota
│   │   ├── inasistencias/            # Registro de inasistencias
│   │   ├── alertas/                  # Panel de alertas diarias
│   │   ├── reportes/                 # Reportes varios
│   │   └── profile/                  # Perfil del usuario
│   ├── shared/                       # Componentes reutilizables
│   │   ├── components/               # loading-spinner, empty-state, confirm-dialog
│   │   └── pipes/
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
```

## Roles y permisos

| Rol | Acceso |
|---|---|
| **ADMIN** | Usuarios, roles, servicios, veterinarios, asistentes, reportes |
| **VETERINARIO** | Atención clínica, vacunas, controles mensuales, citas, reportes |
| **ASISTENTE** | Dueños, mascotas, citas, alertas, servicios |
| **DUENIO** | Perfil propio, mascotas propias, citas propias, vacunas |

## Rutas principales

| Ruta | Componente | Acceso |
|---|---|---|
| `/dashboard` | Dashboard | Todos los roles |
| `/duenios` | Dueños | ADMIN, ASISTENTE, VETERINARIO, DUENIO |
| `/mascotas` | Mascotas | Todos los roles |
| `/citas` | Citas | Todos los roles |
| `/atencion-clinica` | Atención Clínica | ADMIN, VETERINARIO |
| `/vacunas` | Vacunas | Todos los roles |
| `/reportes` | Reportes | ADMIN, VETERINARIO, ASISTENTE |

## Instalación y ejecución

```bash
npm install
ng serve
```

La aplicación se ejecuta en `http://localhost:4200` y se conecta al backend en `http://localhost:8090`.

