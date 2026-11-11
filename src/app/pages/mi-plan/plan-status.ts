import { PlanStatus } from '../../core/models/clinica.model';

export function planStatusLabel(status: PlanStatus): string {
  return {
    TRIAL: 'En prueba', EXPIRED: 'Prueba vencida', ACTIVE: 'Mensualidad activa', READ_ONLY: 'Solo lectura',
    SUSPENDED: 'Suspendido', PAYMENT_PENDING: 'Pago pendiente de registro', SUBSCRIPTION_EXPIRED: 'Mensualidad vencida'
  }[status];
}

export function planStatusMessage(status: PlanStatus | undefined): string {
  switch (status) {
    case 'TRIAL': return 'Prueba PRO de 14 d\u00edas. No se generan cobros autom\u00e1ticos.';
    case 'EXPIRED': return 'La prueba de 14 d\u00edas termin\u00f3. Contacta al operador para activar una mensualidad con pago confirmado manualmente.';
    case 'ACTIVE': return 'Cobertura mensual registrada por el operador. La renovaci\u00f3n requiere otro pago confirmado manualmente; no hay cobros autom\u00e1ticos.';
    case 'SUBSCRIPTION_EXPIRED': return 'La cobertura mensual termin\u00f3. Contacta al operador para registrar una renovaci\u00f3n.';
    case 'PAYMENT_PENDING': return 'No hay un registro de pago mensual que habilite la escritura. Contacta al operador; seleccionar un plan no acredita un pago.';
    case 'SUSPENDED': return 'La cl\u00ednica est\u00e1 suspendida administrativamente. Registrar un pago no la reactiva; contacta al operador.';
    default: return 'La escritura est\u00e1 restringida. Contacta al administrador para revisar el acceso.';
  }
}
