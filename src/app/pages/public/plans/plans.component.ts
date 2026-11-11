import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.css'
})
export class PlansComponent {
  readonly plans = [
    { name: 'Consultorio', icon: 'medical_services', audience: 'Para empezar a organizarte', description: 'Para profesionales independientes y equipos peque\u00f1os.', monthly: 59, staff: 2, pets: 500, recommended: false },
    { name: 'PRO', icon: 'pets', audience: 'Para coordinar a tu equipo', description: 'M\u00e1s capacidad para una veterinaria con varios profesionales y una agenda compartida.', monthly: 129, staff: 5, pets: 2500, recommended: true }
  ];
  readonly features = [
    { icon: 'clinical_notes', name: 'Historias cl\u00ednicas', description: 'Informaci\u00f3n y seguimiento de tus pacientes en un mismo lugar.' },
    { icon: 'calendar_month', name: 'Agenda y citas', description: 'Organiza las visitas y coordina la atenci\u00f3n de tu equipo.' },
    { icon: 'vaccines', name: 'Vacunas y controles', description: 'Consulta aplicaciones, pr\u00f3ximas dosis y controles mensuales.' },
    { icon: 'storefront', name: 'P\u00e1gina p\u00fablica', description: 'Publica los servicios y datos de contacto de tu cl\u00ednica.' },
    { icon: 'pets', name: 'Portal de due\u00f1os', description: 'Tus clientes consultan las citas y el historial de sus mascotas.' },
    { icon: 'shield', name: 'Acceso por roles', description: 'Cada integrante accede seg\u00fan su rol, dentro de su cl\u00ednica.' }
  ];
  readonly faqs = [
    { question: '\u00bfC\u00f3mo activo una mensualidad?', answer: 'Contacta al operador para coordinar el pago. El operador confirma manualmente el pago y registra la activaci\u00f3n o renovaci\u00f3n mensual. Consultorio cuesta S/ 59 al mes y PRO S/ 129 al mes. El registro inicial sigue iniciando una prueba PRO de 14 d\u00edas, sin tarjeta, con 5 cuentas de personal y 2,500 mascotas activas.' },
    { question: '\u00bfC\u00f3mo se renueva la cobertura?', answer: 'La renovaci\u00f3n es manual y del mismo plan. Si se registra antes del vencimiento, extiende desde el fin vigente; si ya venci\u00f3, comienza al registrarla. Se usa un mes calendario en hora de Lima y se conserva el d\u00eda de anclaje. Mi plan muestra las fechas calculadas por el servidor. Una cobertura vigente no se reinicia ni cambia de plan: el cambio se coordina al vencimiento, sin prorrateo.' },
    { question: '\u00bfQu\u00e9 incluye una cuenta de personal?', answer: 'Cada cuenta activa de administrador, veterinario o asistente cuenta como un integrante. Una cuenta con varios roles cuenta una sola vez. Los due\u00f1os de mascotas no consumen esos cupos. Durante la prueba PRO se aplica el l\u00edmite de 5 integrantes, incluido el administrador que registra la cl\u00ednica.' },
    { question: '\u00bfMis clientes tienen que pagar?', answer: 'El acceso al portal para los due\u00f1os de mascotas no tiene costo. La mensualidad corresponde a la cl\u00ednica por su espacio de gesti\u00f3n, no a cada cliente.' },
    { question: '\u00bfQu\u00e9 pasa al finalizar los 14 d\u00edas?', answer: 'La fecha de vencimiento se fija al crear la cl\u00ednica y se muestra en Mi plan. Si no hay cobertura mensual vigente, la cl\u00ednica queda en modo de consulta: conservas el acceso al historial, pero no puedes crear, editar ni eliminar registros. Lo mismo ocurre al vencer una mensualidad sin renovaci\u00f3n. No se borra informaci\u00f3n ni se genera un cobro autom\u00e1tico.' },
    { question: '\u00bfQu\u00e9 ocurre cuando alcanzo un cupo?', answer: 'No puedes a\u00f1adir m\u00e1s cuentas activas de personal o mascotas activas cuando su cupo est\u00e1 completo. Se cuentan tambi\u00e9n las mascotas pendientes de aprobaci\u00f3n. Durante una prueba vigente puedes desactivar registros desde el panel; su historial se conserva. Una cl\u00ednica que ya supera un cupo no pierde sus registros existentes.' },
    { question: '\u00bfPuedo pagar desde la web?', answer: 'No hay checkout, pasarela, renovaciones autom\u00e1ticas ni cargos autom\u00e1ticos. Coordina el medio de pago con el operador; su confirmaci\u00f3n manual no es una verificaci\u00f3n bancaria automatizada. PetCare no emite comprobantes fiscales ni calcula impuestos o recargos en este flujo.' },
    { question: '\u00bfIncluye WhatsApp, facturaci\u00f3n electr\u00f3nica o varias sedes?', answer: 'No en la versi\u00f3n actual. Los recordatorios autom\u00e1ticos por WhatsApp, la facturaci\u00f3n electr\u00f3nica, el inventario y la gesti\u00f3n centralizada de sucursales requieren desarrollos adicionales. Tampoco ofrecemos una certificaci\u00f3n m\u00e9dica por contratar PetCare.' }
  ];

  money(value: number): string {
    return value.toLocaleString('es-PE', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });
  }
}
