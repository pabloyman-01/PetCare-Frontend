import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './auth.service';

export interface Notificacion {
  id: number;
  tipo: string;
  mensaje: string;
  fecha: string;
  ruta: string;
  icono: string;
  leida: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  notificaciones = signal<Notificacion[]>([]);
  noLeidas = signal(0);

  constructor(private http: HttpClient) {}

  cargar(): void {
    this.http.get<Notificacion[]>(`${API_URL}/notificaciones`).subscribe({
      next: (data) => {
        this.notificaciones.set(data);
        this.noLeidas.set(data.length);
      },
    });
  }

  marcarLeidas(): void {
    this.notificaciones.update(n => n.map(v => ({ ...v, leida: true })));
    this.noLeidas.set(0);
  }

  ir(ruta: string): string {
    this.marcarLeidas();
    return ruta;
  }
}
