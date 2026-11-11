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

## P5: Mensualidades y operaciones SaaS

`ROLE_SAAS_OPERATOR` utiliza una pantalla independiente de `MainLayout`: no carga
notificaciones, pacientes ni servicios de una clinica. El rol de operador tiene
precedencia incluso en cuentas con roles mixtos. Login, cambio de contrasena,
raiz y rechazos de guards usan el destino de la sesion. Los cambios obligatorios
de contrasena se atienden antes de entrar al panel. El editor de roles de la
clinica no permite asignar este rol global.

Solo hay dos planes mensuales: Consultorio S/ 59 (2 cuentas activas de personal,
500 mascotas activas) y PRO S/ 129 (5 cuentas, 2500 mascotas). La prueba PRO de
14 dias sigue sin cambios, sin tarjeta. No hay checkout, pasarela, cargos ni
renovaciones automaticas. Un operador confirma manualmente el pago y registra
la mensualidad; la casilla es su declaracion, no una verificacion bancaria
automatizada. Los importes exactos 59/129 son calculados por el servidor. No se
agregan impuestos, comisiones ni recargos, ni se emiten comprobantes fiscales
en este flujo. Esto no define el tratamiento fiscal del precio comercial.

El panel conserva la UI de operaciones: busqueda por nombre/slug, paginacion
real de 20 clinicas, uso/capacidad del servidor y auditoria de 10 registros.
Agrega activacion, renovacion del mismo plan e historial de pagos paginado de
10 registros, separado de los cambios de estado administrativo. El perfil se
actualiza desde `/auth/me` al entrar, cada 60 segundos y a peticion; permite
cerrar sesion sin entrar al perfil clinico.

Contrato utilizado (relativo a `environment.apiUrl`):

- `GET /saas/clinicas?q=&page=0&size=20` devuelve `{items,page,totalPages,totalElements}` con `plan: ClinicaPlan` por clinica.
- `GET /clinicas/me/plan` y el listado devuelven `ClinicaPlan`: conserva los campos de prueba, uso, `monthlyPrice` y `currency`, mas `billingCycle: 'MONTHLY'`, `subscriptionStartedAt` / `subscriptionEndsAt` (`string | null`, ISO UTC con Z), `subscriptionDaysRemaining`, `lastPaymentId: number | null`, `canActivate` y `canRenew`.
- Estados efectivos: `TRIAL`, `EXPIRED` (prueba vencida), `ACTIVE`, `READ_ONLY`, `SUSPENDED`, `PAYMENT_PENDING` (sin registro de pago habilitante) y `SUBSCRIPTION_EXPIRED` (cobertura mensual vencida). La clinica de sesion tambien recibe `planStatus` y las fechas de suscripcion del servidor. Las nuevas propiedades de sesion son opcionales en TypeScript para consumidores con fixtures minimos; no se inventa un estado ni se calculan fechas si faltan.
- `POST /saas/clinicas/{id}/mensualidades` envia `{plan: 'CONSULTORIO' | 'PRO', operation: 'ACTIVATE' | 'RENEW', paymentReference, reason, paymentConfirmed: true, expectedPaymentId: number | null}` y devuelve la clinica SaaS actualizada con HTTP 200. No se envia importe ni fecha.
- `expectedPaymentId` se captura desde `selected.plan.lastPaymentId || null` al preparar el formulario y se conserva en los reintentos fallidos. Nunca se sustituye silenciosamente por un ID mas reciente al enviar.
- Referencia obligatoria de 5 a 120 caracteres recortados, normalizada a mayusculas: letras, digitos, espacios, `.`, `_`, `/`, `-`; sin controles, incluso en los extremos. Ejemplo: `BCP-2026-11-12345`. Es globalmente unica. Repetir exactamente el mismo payload y referencia es idempotente: no concede nueva cobertura. Cambiar el payload con la misma referencia da 409; un snapshot obsoleto tambien se rechaza.
- `GET /saas/clinicas/{id}/mensualidades?page=0&size=10` devuelve `SaasPage<MonthlyPaymentResponse>`. Cada registro incluye `id`, `clinicId`, `plan`, `operation`, `paymentReference`, `amount`, `currency`, `billingCycle`, `periodStartedAt`, `periodEndsAt`, `confirmedAt`, `anchorDay`, `actorId`, `actorEmail`, `reason`, `previousPaymentId`, `auditId`. El historial y la auditoria muestran el importe/moneda y cobertura guardados en el pago, no la tarifa actual recalculada.
- El antiguo `PATCH /saas/clinicas/{id}/plan` esta retirado: 410 `MONTHLY_PAYMENT_REQUIRED`. El cliente ya no lo expone ni intenta compatibilidad o bypass.
- `PATCH /saas/clinicas/{id}/estado` envia `{estado: 'ACTIVA' | 'SUSPENDIDA', reason}`.
- Todas las operaciones exigen un motivo de 5 a 500 caracteres recortados y confirmacion explicita al enviar, no al seleccionar una tarjeta. Referencia y casilla de pago solo son obligatorias para mensualidades; al cambiar de operacion se limpian referencia, casilla y motivo. Cambiar el destino de activacion tambien los limpia.
- `GET /saas/clinicas/{id}/auditoria?page=0&size=10` conserva actor, accion, valores previos/nuevos, motivo y fecha; agrega `monthlyPayment: MonthlyPaymentResponse | null`, acciones `MONTHLY_ACTIVATED` / `MONTHLY_RENEWED` y mantiene `PLAN_CHANGED` / `ESTADO_CHANGED` historicos. Pagos y auditoria vuelven a la primera pagina despues de cada cambio exitoso. No se agregan endpoints de estadisticas globales ni filtros adicionales.

Las tarjetas nativas solo eligen un destino de activacion cuando `canActivate`
lo permite. Renovar requiere `canRenew` y mantiene el mismo plan, incluso si
coincide con el actual. Una cobertura pagada vigente no permite cambiar de plan
ni reiniciarla; el cambio se realiza al vencimiento, sin prorrateo. Reducir
capacidad da 409 si el uso supera el destino. `TRIAL -> PRO` conserva el exceso
heredado (grandfathering); el frontend no lo bloquea por su cuenta.

Renovar temprano extiende desde el fin vigente; renovar vencido comienza ahora.
Se usa mes calendario en Lima con anclaje conservado: 31 de enero, 28 de febrero,
31 de marzo. Solo el servidor calcula cobertura y dias restantes. El navegador
unicamente formatea fechas ISO Z con `formatPlanDate`, en `America/Lima`, sin
aritmetica mensual ni edicion de fechas. `daysRemaining` es solo de la prueba,
no de la cobertura pagada. Las fechas historicas de prueba siguen visibles por
separado en el panel y Mi plan y nunca se reinician ni renuevan.

Registrar un pago no levanta una suspension administrativa. Reactivar tampoco
modifica el plan ni su cobertura. Prueba vencida, mensualidad vencida, falta de
registro de pago y suspension tienen mensajes distintos; se conserva el acceso
de consulta y el historial, pero no las escrituras en modo solo lectura.

Las busquedas y consultas de auditoria/pagos anteriores se cancelan al cambiar de
consulta o seleccion. La seleccion se limpia al buscar o paginar. Durante un
cambio se bloquean el formulario y la navegacion del directorio para evitar
operaciones duplicadas o aplicadas sobre otra seleccion. Todas las suscripciones
y el refresco periodico terminan al salir. Cancelar una peticion al salir no
revierte una operacion que el servidor ya haya recibido; ante una respuesta de
red incierta (incluidos fallos 5xx), revisar pagos y auditoria antes de reintentar.
No usar una referencia nueva para resolver la incertidumbre: conservar la
referencia, payload y snapshot originales para un reintento idempotente. Para
una nueva operacion tras un 409, actualizar el directorio y revisar el historial.
El error 410 queda visible sin usar el endpoint retirado.

Verificacion focalizada, sin modificar la configuracion Karma existente (que
referencia un `tsconfig.spec.json` ausente):

```bash
node --test tests/*.test.cjs  # Node 20.20+; usa las dependencias ya instaladas
npm run build:render
```

Las pruebas Node ejercitan las clases TypeScript reales, guards, contrato HTTP,
validacion, concurrencia y limpieza de suscripciones. No sustituyen una prueba
de extremo a extremo contra un backend con operador provisionado; la autorizacion,
los limites y la persistencia de auditoria siempre se validan en el servidor.

## Clinical Pilot Regression

Appointment and attention failures are visible and retain entered values.
Medication rows are persisted as labeled text in `tratamiento`; vital signs are
persisted in `observacionesClinicas`, not as separate structured records. Both
composed fields respect the backend's existing 1000-character limits.
Owner/admin profile edits use real authorized API writes; veterinarian/assistant
self-profiles are explicitly read-only. Staff user edits include the required
phone number and preserve unchanged roles.

```sh
node --test tests/clinical-pilot.test.cjs tests/saas.test.cjs
npm run build:render
```

The complete real-browser/local-PostgreSQL pilot and backend rollout requirements
are documented in the backend repository at `scripts/pilot-readiness.md`.

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
