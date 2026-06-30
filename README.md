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
