import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomCursorComponent } from './shared/components/custom-cursor/custom-cursor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomCursorComponent],
  template: `
    <app-custom-cursor />
    <router-outlet />
  `
})
export class AppComponent {}
