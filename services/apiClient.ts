// API Client Service for SIRIM
// Handles all HTTP communications with the backend API

import { useAuthStore } from '../stores/useAuthStore';

const API_BASE = 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  rows?: T[];
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown API error' };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params).toString()}` : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Business Endpoints
  async getClientes(empresaId: number, params?: any) {
    return this.get('/clientes', { empresaId, ...params });
  }

  async createCliente(clienteData: any) {
    return this.post('/clientes', clienteData);
  }

  async updateCliente(clienteId: number, clienteData: any) {
    return this.put(`/clientes/${clienteId}`, clienteData);
  }

  async getFacturas(empresaId: number, params?: any) {
    return this.get('/facturas', { empresaId, ...params });
  }

  async createFactura(facturaData: any) {
    return this.post('/facturas', facturaData);
  }

  async updateFactura(facturaId: number, facturaData: any) {
    return this.put(`/facturas/${facturaId}`, facturaData);
  }

  async getItems(empresaId: number, params?: any) {
    return this.get('/items', { empresaId, ...params });
  }

  async createItem(itemData: any) {
    return this.post('/items', itemData);
  }

  async updateItem(itemId: number, itemData: any) {
    return this.put(`/items/${itemId}`, itemData);
  }

  async getGastos(empresaId: number, params?: any) {
    return this.get('/gastos', { empresaId, ...params });
  }

  async createGasto(gastoData: any) {
    return this.post('/gastos', gastoData);
  }

  async updateGasto(gastoId: number, gastoData: any) {
    return this.put(`/gastos/${gastoId}`, gastoData);
  }

  async getEmpleados(empresaId: number, params?: any) {
    return this.get('/empleados', { empresaId, ...params });
  }

  async createEmpleado(empleadoData: any) {
    return this.post('/empleados', empleadoData);
  }

  async updateEmpleado(empleadoId: number, empleadoData: any) {
    return this.put(`/empleados/${empleadoId}`, empleadoData);
  }

  // Ingresos
  async getIngresos(empresaId: number, params?: any) {
    return this.get('/ingresos', { empresaId, ...params });
  }

  async createIngreso(ingresoData: any) {
    return this.post('/ingresos', ingresoData);
  }

  async updateIngreso(ingresoId: number, ingresoData: any) {
    return this.put(`/ingresos/${ingresoId}`, ingresoData);
  }

  // Cotizaciones
  async getCotizaciones(empresaId: number, params?: any) {
    return this.get('/cotizaciones', { empresaId, ...params });
  }

  async createCotizacion(cotizacionData: any) {
    return this.post('/cotizaciones', cotizacionData);
  }

  async updateCotizacion(cotizacionId: number, cotizacionData: any) {
    return this.put(`/cotizaciones/${cotizacionId}`, cotizacionData);
  }

  // Nominas
  async getNominas(empresaId: number, params?: any) {
    return this.get('/nominas', { empresaId, ...params });
  }

  async createNomina(nominaData: any) {
    return this.post('/nominas', nominaData);
  }

  async auditarNomina(nominaId: string) {
    return this.put(`/nominas/${nominaId}/auditar`, {});
  }

  async contabilizarNomina(nominaId: string) {
    return this.put(`/nominas/${nominaId}/contabilizar`, {});
  }

  // Notas Credito/Debito
  async getNotas(empresaId: number, params?: any) {
    return this.get('/notas', { empresaId, ...params });
  }

  async createNota(notaData: any) {
    return this.post('/notas', notaData);
  }

  // Asientos Contables
  async getAsientos(empresaId: number, params?: any) {
    return this.get('/asientos', { empresaId, ...params });
  }

  async createAsiento(asientoData: any) {
    return this.post('/asientos', asientoData);
  }

}

export const apiClient = new ApiClient();