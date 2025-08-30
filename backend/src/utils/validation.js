const Joi = require('joi');

const usuarioSchema = Joi.object({
  nombre: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  roles: Joi.string().required(),
  activo: Joi.number().valid(0,1)
});

const clienteSchema = Joi.object({
  nombre: Joi.string().required(),
  rnc: Joi.string().optional(),
  empresaId: Joi.number().required()
});

const gastoSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto: Joi.number().required(),
  fecha: Joi.string().required(),
  empresaId: Joi.number().required()
});

const cotizacionSchema = Joi.object({
  clienteId: Joi.number().required(),
  monto: Joi.number().required(),
  fecha: Joi.string().required(),
  empresaId: Joi.number().required()
});

const notaSchema = Joi.object({
  tipo: Joi.string().required(),
  monto: Joi.number().required(),
  fecha: Joi.string().required(),
  empresaId: Joi.number().required()
});

const ingresoSchema = Joi.object({
  descripcion: Joi.string().required(),
  monto: Joi.number().required(),
  fecha: Joi.string().required(),
  empresaId: Joi.number().required()
});

const facturaRecurrenteSchema = Joi.object({
  clienteId: Joi.number().required(),
  monto: Joi.number().required(),
  frecuencia: Joi.string().required(),
  empresaId: Joi.number().required()
});

module.exports = {
  usuarioSchema,
  clienteSchema,
  gastoSchema,
  cotizacionSchema,
  notaSchema,
  ingresoSchema,
  facturaRecurrenteSchema
};
