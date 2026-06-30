export interface Consejo {
  texto: string;
  ruta?: string;
  etiqueta?: string;
}

const CONSEJOS_POR_DIA: Record<number, Consejo[]> = {
  1: [ // Lunes
    { texto: 'Recuerda revisar que tu mascota tenga siempre agua fresca disponible.' },
    { texto: 'Una buena hidratación ayuda a prevenir problemas urinarios en gatos y perros.' },
  ],
  2: [ // Martes
    { texto: 'Una caminata diaria ayuda a mantener un peso saludable.' },
    { texto: 'El ejercicio regular fortalece el vínculo entre tú y tu mascota.' },
  ],
  3: [ // Miércoles
    { texto: 'Verifica periódicamente las vacunas pendientes de tu mascota.', ruta: '/vacunas', etiqueta: 'Ver vacunas' },
    { texto: 'Mantener el calendario de vacunación al día protege a tu mascota de enfermedades graves.' },
  ],
  4: [ // Jueves
    { texto: 'Los controles preventivos ayudan a detectar enfermedades a tiempo.' },
    { texto: 'Una revisión cada 6 meses puede prolongar la vida de tu mascota.' },
  ],
  5: [ // Viernes
    { texto: 'Cepillar el pelaje regularmente mejora la salud de la piel.' },
    { texto: 'El cepillado frecuente reduce la caída de pelo y fortalece el vínculo con tu mascota.' },
  ],
  6: [ // Sábado
    { texto: 'Dedica tiempo al juego y estimulación mental de tu mascota.' },
    { texto: 'Los juguetes interactivos ayudan a mantener activa la mente de tu mascota.' },
  ],
  0: [ // Domingo
    { texto: 'Revisa la alimentación de tu mascota y evita excesos.' },
    { texto: 'Una dieta balanceada es la base de una vida saludable para tu mascota.' },
  ],
};

export function obtenerConsejoDelDia(): Consejo {
  const dia = new Date().getDay();
  const consejos = CONSEJOS_POR_DIA[dia];
  const indice = Math.floor(Math.random() * consejos.length);
  return consejos[indice];
}
