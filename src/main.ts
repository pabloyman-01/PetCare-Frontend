import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

console.log('[PetCare] API URL:', environment.apiUrl);

fetch(environment.apiUrl + '/health')
  .then(r => r.text())
  .then(t => console.log('[PetCare] Health:', t))
  .catch(e => console.error('[PetCare] Health error:', e));

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
