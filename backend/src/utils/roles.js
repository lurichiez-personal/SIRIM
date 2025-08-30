export const Roles = {
  MASTER: 'master',
  ADMIN: 'admin',
  CONTADOR: 'contador',
  USUARIO: 'usuario',
};

export function hasRole(user, role) {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

export function hasAnyRole(user, roles) {
  if (!user || !user.roles) return false;
  return roles.some(r => user.roles.includes(r));
}
