# PetCare Frontend

Sistema de gestión veterinaria integral. Frontend desarrollado con **Angular 18**, **Tailwind CSS** y empaquetado como app móvil con **Capacitor**.

## Tecnologías

| Tecnología | Versión |
|---|---|
| Angular | 18.2.x |
| TypeScript | ~5.5.0 |
| RxJS | ~7.8.0 |
| Tailwind CSS | 3.4.10 |
| Angular CLI | 18.2.x |
| Capacitor | 7.x |
| Ionic Capacitor Android | SDK 35+ |
| Ionic Capacitor iOS | 18+ |

## Deploy

| Plataforma | URL |
|------------|-----|
| **Web (GitHub Pages)** | `https://pabloyman-01.github.io/PetCare-Frontend/` |
| **APK Android** | Generado con Capacitor (`android/app/build/outputs/apk/debug/app-debug.apk`) |
| **iOS** | Proyecto Xcode en `ios/App/App.xcworkspace` |
| **Backend** | `https://petcare-backend-o9go.onrender.com/api` |

## Scripts

```bash
npm run build              # Build para web (base href = /PetCare-Frontend/)
npm run build:capacitor    # Build para APK + copia a Android (base href = /)
npx cap copy android       # Copia build a Android (si ya se compiló)
npx cap copy ios           # Copia build a iOS
npx cap open android       # Abre Android Studio
npx cap open ios           # Abre Xcode
```

## Estructura del proyecto

```
src/
├── app/
│   ├── core/                         # Guards, interceptors, models, services
│   ├── layouts/
│   │   └── main-layout/              # Sidebar + topbar responsive + notificaciones
│   ├── pages/                        # 16 módulos funcionales
│   │   ├── auth/                     # Login, registro, activación de cuenta
│   │   ├── dashboard/                # Dashboard con variante por rol
│   │   ├── duenios/mascotas/         # CRUD dueños y mascotas
│   │   ├── veterinarios/asistentes/  # CRUD con selección de usuario existente
│   │   ├── usuarios/                 # CRUD usuarios + roles + eliminar
│   │   ├── servicios/                # CRUD servicios + cálculo de costos
│   │   ├── citas/                    # Calendario + creación/cancelación de citas
│   │   ├── vacunas/                  # CRUD vacunas + registro por mascota
│   │   ├── atencion-clinica/         # Atención clínica con estado de mascota
│   │   ├── alertas/                  # Panel de alertas diarias
│   │   ├── reportes/                 # Reportes operativos y clínicos
│   │   └── profile/                  # Perfil del usuario
│   ├── shared/                       # Componentes reutilizables
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
├── android/                          # Proyecto Android (Capacitor)
├── ios/                              # Proyecto iOS (Capacitor)
├── capacitor.config.ts               # Configuración Capacitor
└── ngsw-config.json                  # Service worker config
```

## Roles y permisos

| Rol | Módulos |
|-----|---------|
| **ADMIN** | Usuarios, roles, servicios, veterinarios, asistentes, alertas |
| **VETERINARIO** | Citas, atención clínica, vacunas, controles mensuales, reportes |
| **ASISTENTE** | Dueños, mascotas, citas, alertas, inasistencias |
| **DUENIO** | Dashboard, mascotas propias, citas propias, vacunas |
| **SAAS_OPERATOR** | Panel global `/saas/clinicas`, sin contexto de clinica ni acceso clinico |

## P4: Operaciones SaaS

`ROLE_SAAS_OPERATOR` utiliza una pantalla independiente de `MainLayout`: no carga
notificaciones, pacientes ni servicios de una clinica. El rol de operador tiene
precedencia incluso en cuentas con roles mixtos. Login, cambio de contrasena,
raiz y rechazos de guards usan el destino de la sesion. Los cambios obligatorios
de contrasena se atienden antes de entrar al panel. El editor de roles de la
clinica no permite asignar este rol global.

El panel ofrece busqueda por nombre/slug, paginacion real de 20 clinicas, uso y
capacidad informados por el servidor, fechas historicas de prueba en hora de
Lima, cambios de plan/estado y auditoria paginada de 10 registros. El perfil se
actualiza desde `/auth/me` al entrar, cada 60 segundos y a peticion; permite
cerrar sesion sin entrar al perfil clinico.

Contrato utilizado (relativo a `environment.apiUrl`):

- `GET /saas/clinicas?q=&page=0&size=20` devuelve `{items,page,totalPages,totalElements}` con `plan: ClinicaPlan` por clinica.
- `PATCH /saas/clinicas/{id}/plan` envia `{plan: 'CONSULTORIO' | 'PRO', reason}`.
- `PATCH /saas/clinicas/{id}/estado` envia `{estado: 'ACTIVA' | 'SUSPENDIDA', reason}`.
- Ambos cambios devuelven el DTO actualizado de la clinica. El motivo se recorta y exige 5 a 500 caracteres; no se guarda al seleccionar una opcion, solo al confirmar.
- `GET /saas/clinicas/{id}/auditoria?page=0&size=10` devuelve la misma envoltura paginada. Muestra actor, accion, valores previos/nuevos, motivo y fecha; se vuelve a consultar desde la primera pagina despues de cada cambio exitoso.

Reducir capacidad se rechaza con `409` si el uso supera el destino. El paso
`TRIAL -> PRO` conserva capacidad y permite uso heredado por encima del limite
(grandfathering); el frontend no lo bloquea por su cuenta. Cambiar el plan no
suspende ni reactiva automaticamente. Reactivar tampoco cambia el plan ni su
vencimiento. No hay pagos, renovaciones de prueba ni edicion de fechas.

Las busquedas y consultas de auditoria anteriores se cancelan al cambiar de
consulta o seleccion. La seleccion se limpia al buscar o paginar. Durante un
cambio se bloquean el formulario y la navegacion del directorio para evitar
operaciones duplicadas o aplicadas sobre otra seleccion. Todas las suscripciones
y el refresco periodico terminan al salir. Cancelar una peticion al salir no
revierte una operacion que el servidor ya haya recibido; ante una respuesta de
red incierta, actualizar el directorio y revisar la auditoria antes de reintentar.

Verificacion focalizada, sin modificar la configuracion Karma existente (que
referencia un `tsconfig.spec.json` ausente):

```bash
node --test tests/saas.test.cjs  # Node 20.20+; usa las dependencias ya instaladas
npm run build:render
```

Las pruebas Node ejercitan las clases TypeScript reales, guards, contrato HTTP,
validacion, concurrencia y limpieza de suscripciones. No sustituyen una prueba
de extremo a extremo contra un backend con operador provisionado; la autorizacion,
los limites y la persistencia de auditoria siempre se validan en el servidor.

## Instalación y ejecución

```bash
npm install
ng serve
```

La app se ejecuta en `http://localhost:4200` y se conecta al backend en `https://petcare-backend-o9go.onrender.com/api`.

## Generar APK

```bash
npm run build:capacitor
cd android && ./gradlew assembleDebug
```

El APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.

## iOS

```bash
npx cap open ios
```

Requiere Xcode 16+ y CocoaPods instalados.
