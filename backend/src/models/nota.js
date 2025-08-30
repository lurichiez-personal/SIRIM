export default class Nota {
  constructor({ id, tipo, monto, fecha, empresaId }) {
    this.id = id;
    this.tipo = tipo;
    this.monto = monto;
    this.fecha = fecha;
    this.empresaId = empresaId;
  }
}
