// Sistema de validación robusto para SIRIM

export interface ValidationRule<T = any> {
  validate: (value: T, data?: any) => boolean;
  message: string;
}

export interface FieldValidation {
  [field: string]: ValidationRule[];
}

export interface ValidationErrors {
  [field: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

// Sanitización de datos para prevenir XSS
export const sanitizeInput = (value: string): string => {
  if (typeof value !== 'string') return '';
  
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

// Validaciones comunes
export const ValidationRules = {
  // Campo requerido
  required: (message = 'Este campo es obligatorio'): ValidationRule<string> => ({
    validate: (value) => value != null && value.toString().trim().length > 0,
    message
  }),

  // Longitud mínima
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.toString().length >= min,
    message: message || `Debe tener al menos ${min} caracteres`
  }),

  // Longitud máxima
  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.toString().length <= max,
    message: message || `No puede exceder ${max} caracteres`
  }),

  // Email válido
  email: (message = 'Email no válido'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Opcional, usar con required() si es obligatorio
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message
  }),

  // RNC dominicano válido
  rnc: (message = 'RNC no válido'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Opcional
      const cleaned = value.replace(/\D/g, '');
      return cleaned.length === 9 || cleaned.length === 11;
    },
    message
  }),

  // Teléfono dominicano
  telefono: (message = 'Teléfono no válido'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Opcional
      const cleaned = value.replace(/\D/g, '');
      return cleaned.length >= 10 && cleaned.length <= 12;
    },
    message
  }),

  // Número positivo
  positiveNumber: (message = 'Debe ser un número positivo'): ValidationRule<number | string> => ({
    validate: (value) => {
      if (value == null || value === '') return true; // Opcional
      const num = Number(value);
      return !isNaN(num) && num >= 0;
    },
    message
  }),

  // Número mayor que
  greaterThan: (min: number, message?: string): ValidationRule<number | string> => ({
    validate: (value) => {
      if (value == null || value === '') return true;
      const num = Number(value);
      return !isNaN(num) && num > min;
    },
    message: message || `Debe ser mayor que ${min}`
  }),

  // NCF válido
  ncf: (message = 'NCF no válido'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      const ncfRegex = /^[BE]\d{10}$/i;
      return ncfRegex.test(value.replace(/\s/g, ''));
    },
    message
  }),

  // Fecha válida
  date: (message = 'Fecha no válida'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return date instanceof Date && !isNaN(date.getTime());
    },
    message
  }),

  // Fecha no futura
  notFuture: (message = 'La fecha no puede ser futura'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Fin del día de hoy
      return date <= today;
    },
    message
  }),

  // Validación personalizada
  custom: <T>(validator: (value: T, data?: any) => boolean, message: string): ValidationRule<T> => ({
    validate: validator,
    message
  }),

  // Validación condicional
  conditionalRequired: (condition: (data: any) => boolean, message = 'Este campo es obligatorio'): ValidationRule => ({
    validate: (value, data) => {
      if (!condition(data)) return true; // Si no se cumple la condición, no es requerido
      return value != null && value.toString().trim().length > 0;
    },
    message
  })
};

// Validador principal
export class FormValidator {
  private validationSchema: FieldValidation;
  private data: any;

  constructor(validationSchema: FieldValidation) {
    this.validationSchema = validationSchema;
  }

  validate(data: any): ValidationResult {
    this.data = data;
    const errors: ValidationErrors = {};

    for (const [field, rules] of Object.entries(this.validationSchema)) {
      const fieldValue = data[field];
      
      for (const rule of rules) {
        if (!rule.validate(fieldValue, data)) {
          errors[field] = rule.message;
          break; // Solo mostrar el primer error por campo
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Validar un solo campo
  validateField(field: string, value: any): { isValid: boolean; error?: string } {
    const rules = this.validationSchema[field];
    if (!rules) return { isValid: true };

    for (const rule of rules) {
      if (!rule.validate(value, this.data)) {
        return { isValid: false, error: rule.message };
      }
    }

    return { isValid: true };
  }
}

// Hook personalizado para usar validación en componentes React
import { useState, useCallback } from 'react';

export const useFormValidation = (validationSchema: FieldValidation) => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const validator = new FormValidator(validationSchema);

  const validate = useCallback((data: any): boolean => {
    const result = validator.validate(data);
    setErrors(result.errors);
    return result.isValid;
  }, [validator]);

  const validateField = useCallback((field: string, value: any, formData?: any): boolean => {
    const result = validator.validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: result.error || ''
    }));
    return result.isValid;
  }, [validator]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).some(key => errors[key])
  };
};

// Esquemas de validación predefinidos para formularios comunes
export const ValidationSchemas = {
  cliente: {
    nombre: [ValidationRules.required('El nombre del cliente es obligatorio'), ValidationRules.maxLength(100)],
    rnc: [ValidationRules.rnc()],
    email: [ValidationRules.email()],
    telefono: [ValidationRules.telefono()]
  },

  factura: {
    clienteNombre: [ValidationRules.required('Debe especificar un cliente')],
    fecha: [ValidationRules.required('La fecha es obligatoria'), ValidationRules.date(), ValidationRules.notFuture()],
    lineItems: [ValidationRules.custom((items: any[]) => items && items.length > 0, 'Debe agregar al menos un ítem')]
  },

  gasto: {
    descripcion: [ValidationRules.required('La descripción es obligatoria')],
    fecha: [ValidationRules.required('La fecha es obligatoria'), ValidationRules.date(), ValidationRules.notFuture()],
    subtotal: [ValidationRules.required('El subtotal es obligatorio'), ValidationRules.positiveNumber()],
    monto: [ValidationRules.required('El monto total es obligatorio'), ValidationRules.positiveNumber()]
  },

  empleado: {
    nombre: [ValidationRules.required('El nombre es obligatorio'), ValidationRules.maxLength(100)],
    cedula: [ValidationRules.required('La cédula es obligatoria'), ValidationRules.minLength(11, 'La cédula debe tener 11 dígitos')],
    email: [ValidationRules.email()],
    telefono: [ValidationRules.telefono()],
    salario: [ValidationRules.required('El salario es obligatorio'), ValidationRules.positiveNumber()]
  }
};