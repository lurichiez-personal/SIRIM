export default class Gasto {
  constructor({ id, descripcion, monto, fecha, empresaId }) {
    this.id = id;
    this.descripcion = descripcion;
    this.monto = monto;
    this.fecha = fecha;
    this.empresaId = empresaId;
  }
}
