export interface ServicioRequest {
  nombre: string;
  descripcion: string;
  costoBase: number;
}

export interface ServicioResponse {
  id: number;
  nombre: string;
  descripcion: string;
  costoBase: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostoCitaServicioRequest {
  servicioId: number;
  cantidad: number;
}

export interface CalculoCostoCitaRequest {
  servicios: CostoCitaServicioRequest[];
  descuento?: number;
}

export interface DetalleCostoCitaResponse {
  servicioId: number;
  nombreServicio: string;
  costoUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface CalculoCostoCitaResponse {
  detalles: DetalleCostoCitaResponse[];
  subtotal: number;
  descuento: number;
  total: number;
}
