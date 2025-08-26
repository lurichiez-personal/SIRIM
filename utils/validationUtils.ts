// Mensajes de error descriptivos y contextuales
export const ErrorMessages = {
  // Campos obligatorios
  NOMBRE_REQUERIDO: 'El nombre es obligatorio y debe tener al menos 2 caracteres.',
  FECHA_REQUERIDA: 'La fecha es obligatoria.',
  DESCRIPCION_REQUERIDA: 'La descripción es obligatoria y debe tener al menos 5 caracteres.',
  CLIENTE_REQUERIDO: 'Debe seleccionar o especificar un cliente válido.',
  CATEGORIA_REQUERIDA: 'Debe seleccionar una categoría de gasto.',
  FACTURA_REQUERIDA: 'Debe seleccionar una factura válida para procesar el pago.',
  
  // Validaciones numéricas
  PRECIO_INVALIDO: 'El precio debe ser un número válido mayor o igual a cero.',
  PRECIO_EXCEDE_LIMITE: 'El precio no puede exceder $999,999,999.00.',
  CANTIDAD_INVALIDA: 'La cantidad debe ser un número entero mayor o igual a cero.',
  CANTIDAD_EXCEDE_LIMITE: 'La cantidad no puede exceder 999,999,999 unidades.',
  SUBTOTAL_INVALIDO: 'El subtotal debe ser un número válido mayor a cero.',
  SUBTOTAL_EXCEDE_LIMITE: 'El subtotal no puede exceder $99,999,999.00.',
  MONTO_INVALIDO: 'El monto debe ser un número válido mayor a cero.',
  MONTO_EXCEDE_BALANCE: 'El monto no puede ser mayor al balance pendiente de la factura.',
  
  // Validaciones de fecha
  FECHA_FUTURA: 'La fecha no puede ser futura.',
  FECHA_FUTURA_INVALIDA: 'La fecha de pago no puede ser posterior a la fecha actual.',
  FECHA_MUY_ANTIGUA: 'La fecha no puede ser anterior a 5 años.',
  FECHA_VENCIMIENTO_PASADA: 'La fecha de vencimiento no puede ser en el pasado.',
  
  // Validaciones de texto
  TEXTO_MUY_CORTO: (campo: string, minimo: number) => `${campo} debe tener al menos ${minimo} caracteres.`,
  CODIGO_INVALIDO: 'El código debe tener al menos 2 caracteres y no contener espacios.',
  EMAIL_INVALIDO: 'El formato del email no es válido.',
  TELEFONO_INVALIDO: 'El formato del teléfono no es válido.',
  
  // Validaciones de RNC/NCF
  RNC_FORMATO_INVALIDO: 'El RNC debe tener 9 u 11 dígitos (formato: 123456789 o 12345678901).',
  RNC_NO_ENCONTRADO: 'No se encontró información para este RNC en DGII.',
  RNC_ERROR_BUSQUEDA: 'Error al consultar el RNC en DGII. Verifique su conexión a internet.',
  NCF_FORMATO_INVALIDO: 'El NCF debe tener entre 11 y 19 caracteres y seguir el formato correcto.',
  NCF_NO_DISPONIBLE: 'No hay NCF disponibles para el tipo seleccionado. Configure nuevas secuencias.',
  
  // Validaciones de secuencias NCF
  SECUENCIA_DESDE_INVALIDA: 'El número inicial debe ser mayor a cero.',
  SECUENCIA_HASTA_INVALIDA: 'El número final debe ser mayor que el número inicial.',
  SECUENCIA_RANGO_INVALIDO: 'El rango de secuencia debe ser válido (máximo 50,000,000 comprobantes).',
  
  // Validaciones de stock
  STOCK_INSUFICIENTE: (disponible: number) => `Stock insuficiente. Disponible: ${disponible} unidades.`,
  ITEMS_REQUERIDOS: 'Debe agregar al menos un ítem válido con cantidad y precio.',
  ITEM_INVALIDO: 'Todos los ítems deben tener una cantidad mayor a cero y precio válido.',
  
  // Errores de operación
  OPERACION_FALLIDA: 'La operación no pudo completarse. Intente nuevamente.',
  CONEXION_ERROR: 'Error de conexión. Verifique su conexión a internet.',
  DATOS_INCONSISTENTES: 'Los datos proporcionados son inconsistentes. Revise la información.',
  PERMISOS_INSUFICIENTES: 'No tiene permisos suficientes para realizar esta operación.',
  
  // Validaciones específicas del dominio
  PASSWORD_MUY_CORTA: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORD_SIN_COMPLEJIDAD: 'La contraseña debe incluir al menos una mayúscula, minúscula y número.',
  EMAIL_YA_EXISTE: 'Ya existe un usuario con este email.',
  CODIGO_YA_EXISTE: 'Ya existe un ítem con este código.',
  RNC_YA_EXISTE: 'Ya existe un cliente con este RNC.',
  
  // Success messages
  SUCCESS_CREAR: (entidad: string) => `${entidad} creado exitosamente.`,
  SUCCESS_ACTUALIZAR: (entidad: string) => `${entidad} actualizado exitosamente.`,
  SUCCESS_ELIMINAR: (entidad: string) => `${entidad} eliminado exitosamente.`,
  SUCCESS_OPERACION: 'Operación completada exitosamente.',
};

// Helper function para validar email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function para validar RNC dominicano
export const isValidRNC = (rnc: string): boolean => {
  const cleanRNC = rnc.replace(/[-\s]/g, '');
  return /^\d{9}$|^\d{11}$/.test(cleanRNC);
};

// Helper function para validar contraseña
export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /\d/.test(password);
};

// Helper function para formatear números
export const formatNumber = (value: number | string, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
};
