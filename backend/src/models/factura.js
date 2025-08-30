export default class Factura {
  constructor({ id, clienteId, monto, fecha, estado, empresaId }) {
    this.id = id;
    this.clienteId = clienteId;
    this.monto = monto;
    this.fecha = fecha;
    this.estado = estado;
    this.empresaId = empresaId;
  }
}
