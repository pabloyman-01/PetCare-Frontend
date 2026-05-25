import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
  @if (visible) {
    <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" (click)="cancel()">
      <div class="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6" (click)="\$event.stopPropagation()">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-full bg-error-container/30 flex items-center justify-center text-error flex-shrink-0">
            <span class="material-symbols-outlined text-2xl fill">warning</span>
          </div>
          <div>
            <h3 class="text-headline-md font-bold text-on-surface">{{ title }}</h3>
            <p class="text-body-md text-on-surface-variant">{{ message }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button class="btn btn-ghost" (click)="cancel()">
            {{ cancelText }}
          </button>
          <button class="btn btn-error" (click)="confirm()">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  }
  `
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirmar acci&oacute;n';
  @Input() message = '¿Est&aacute;s seguro?';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  confirm() { this.onConfirm.emit(); }
  cancel() { this.onCancel.emit(); }
}
