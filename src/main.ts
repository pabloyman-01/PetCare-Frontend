import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

console.log('[PetCare] API URL:', environment.apiUrl);

try {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', environment.apiUrl + '/health', true);
  xhr.timeout = 10000;
  xhr.onload = function() { console.log('[PetCare] Health:', xhr.status, xhr.responseText); };
  xhr.onerror = function() { console.error('[PetCare] Health XHR error:', xhr.status); };
  xhr.ontimeout = function() { console.error('[PetCare] Health XHR timeout'); };
  xhr.send();
} catch(e) {
  console.error('[PetCare] Health exception:', e);
}

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
