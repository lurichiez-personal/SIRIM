export default class Cotizacion {
  constructor({ id, clienteId, monto, fecha, empresaId }) {
    this.id = id;
    this.clienteId = clienteId;
    this.monto = monto;
    this.fecha = fecha;
    this.empresaId = empresaId;
  }
}
