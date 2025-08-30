export default class FacturaRecurrente {
  constructor({ id, clienteId, monto, frecuencia, empresaId }) {
    this.id = id;
    this.clienteId = clienteId;
    this.monto = monto;
    this.frecuencia = frecuencia;
    this.empresaId = empresaId;
  }
}
