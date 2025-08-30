export default class Usuario {
  constructor({ id, nombre, email, password, roles, activo }) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.password = password;
    this.roles = roles;
    this.activo = activo;
  }
}
