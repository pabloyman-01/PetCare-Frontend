import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.css'
})
export class PlansComponent {
  readonly annual = signal(false);
  readonly plans = [
    { name: 'Consultorio', icon: 'medical_services', audience: 'Para empezar a organizarte', description: 'Una propuesta para profesionales independientes y equipos peque\u00f1os.', monthly: 59, staff: 2, pets: 500, recommended: false },
    { name: 'Cl\u00ednica Pro', icon: 'pets', audience: 'Para coordinar a tu equipo', description: 'M\u00e1s capacidad para una veterinaria con varios profesionales y una agenda compartida.', monthly: 129, staff: 5, pets: 2500, recommended: true }
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
    { question: '\u00bfYa puedo contratar estos planes?', answer: 'Todav\u00eda no. Esta p\u00e1gina presenta la propuesta comercial de PetCare. Puedes registrar tu cl\u00ednica con el flujo actual, pero ese registro no selecciona un plan de pago ni genera un cobro.' },
    { question: '\u00bfC\u00f3mo se calcula el precio anual?', answer: 'La propuesta anual equivale a pagar 10 mensualidades por 12 meses: S/ 590 para Consultorio y S/ 1,290 para Cl\u00ednica Pro. Es aproximadamente un 16.7% de ahorro, no un 20%. El total se pagar\u00eda por adelantado cuando las suscripciones est\u00e9n disponibles.' },
    { question: '\u00bfQu\u00e9 incluye una cuenta de personal?', answer: 'Cada administrador, veterinario o asistente con su propia cuenta contar\u00eda como un integrante. Una misma cuenta con varios roles se contar\u00eda una sola vez. Los due\u00f1os de mascotas no consumir\u00edan esos cupos. Los l\u00edmites mostrados son propuestos y a\u00fan no se aplican.' },
    { question: '\u00bfMis clientes tendr\u00edan que pagar?', answer: 'La propuesta mantiene sin costo el acceso al portal para los due\u00f1os de mascotas. El pago corresponder\u00eda a la cl\u00ednica por su espacio de gesti\u00f3n, no a cada cliente.' },
    { question: '\u00bfHabr\u00e1 una prueba de 14 d\u00edas sin tarjeta?', answer: 'Est\u00e1 prevista para la etapa de suscripciones. A\u00fan no hay un plazo de 14 d\u00edas implementado ni un formulario de pago. Crear una cuenta ahora no inicia una prueba con ese vencimiento.' },
    { question: '\u00bfPuedo pagar con Yape, Plin o tarjeta?', answer: 'Los medios de pago todav\u00eda no est\u00e1n habilitados. La propuesta contempla evaluar transferencias y Yape o Plin con verificaci\u00f3n manual, y despu\u00e9s una pasarela para tarjetas. No hay renovaciones ni cobros autom\u00e1ticos actualmente.' },
    { question: '\u00bfIncluye WhatsApp, facturaci\u00f3n electr\u00f3nica o varias sedes?', answer: 'No en la versi\u00f3n actual. Los recordatorios autom\u00e1ticos por WhatsApp, la facturaci\u00f3n electr\u00f3nica, el inventario y la gesti\u00f3n centralizada de sucursales requieren desarrollos adicionales. Tampoco ofrecemos una certificaci\u00f3n m\u00e9dica por contratar PetCare.' }
  ];

  money(value: number): string {
    return value.toLocaleString('es-PE', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });
  }
}
