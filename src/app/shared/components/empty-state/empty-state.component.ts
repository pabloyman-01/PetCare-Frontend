import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <span class="material-symbols-outlined text-6xl text-outline-variant" [style.font-variation-settings]="'FILL 1'">{{ icon }}</span>
    <h3 class="mt-4 text-headline-md text-on-surface font-semibold">{{ title }}</h3>
    @if (message) {
      <p class="mt-2 text-body-md text-on-surface-variant max-w-md">{{ message }}</p>
    }
  </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Sin datos';
  @Input() message?: string;
}
