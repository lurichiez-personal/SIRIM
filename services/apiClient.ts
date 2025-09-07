// API Client Service for SIRIM
// Handles all HTTP communications with the backend API

import { useAuthStore } from '../stores/useAuthStore';

const API_BASE = '/api';

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

  async deleteGasto(gastoId: number) {
    return this.delete(`/gastos/${gastoId}`);
  }

  async bulkDeleteGastos(gastoIds: number[]) {
    return this.delete('/gastos', { ids: gastoIds });
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

  // User management for master
  async getMasterEmpresas() {
    return this.get('/master/empresas');
  }

  async getEmpresaUsers(empresaId: number) {
    return this.get(`/master/empresa/${empresaId}/usuarios`);
  }

  async createEmpresaUser(empresaId: number, userData: any) {
    return this.post(`/master/empresa/${empresaId}/usuarios`, userData);
  }

  async updateEmpresaUser(empresaId: number, userId: number, userData: any) {
    return this.put(`/master/empresa/${empresaId}/usuarios/${userId}`, userData);
  }

  async deleteEmpresaUser(empresaId: number, userId: number) {
    return this.delete(`/master/empresa/${empresaId}/usuarios/${userId}`);
  }
}

export const apiClient = new ApiClient();