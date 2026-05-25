import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
  <div class="flex flex-col items-center justify-center py-12">
    <span class="loading loading-spinner loading-lg text-primary"></span>
    @if (message) {
      <p class="mt-4 text-body-sm text-on-surface-variant">{{ message }}</p>
    }
  </div>
  `
})
export class LoadingSpinnerComponent {
  @Input() message?: string;
}
