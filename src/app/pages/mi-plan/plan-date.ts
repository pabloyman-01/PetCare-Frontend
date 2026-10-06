export function formatPlanDate(value: string | null | undefined): string {
  if (!value) return 'No disponible';
  // The API's unzoned LocalDateTime represents UTC, not the browser's timezone.
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(zoned);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short'
  }).format(date);
}
