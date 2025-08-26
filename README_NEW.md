# 🏢 SIRIM - Sistema Inteligente de Registros Impositivos y Mercantiles

> **Sistema completo de gestión fiscal y contable para empresas dominicanas - LISTO PARA PRODUCCIÓN** 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF.svg)](https://vitejs.dev/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

## 📋 **Descripción**

SIRIM es un sistema integral de gestión fiscal y contable diseñado específicamente para empresas dominicanas. Cumple con todas las normativas de la DGII (Dirección General de Impuestos Internos) y ofrece una experiencia de usuario moderna y eficiente.

### ✨ **Características Principales**

- 🧾 **Facturación electrónica** con NCF automático
- 👥 **Gestión de clientes** con validación RNC/DGII
- 💰 **Control de gastos** con OCR y categorización
- 📊 **Reportes DGII** (606, 607, 608, Anexo A)
- 🏬 **Inventario inteligente** con control de stock
- 💳 **Gestión de pagos** e ingresos
- 📋 **Cotizaciones** con aprobación workflow
- 🏢 **Multi-empresa** (tenant system)
- 🌐 **Portal de clientes** independiente

---

## 🚀 **Estado del Proyecto: COMPLETO**

### **✅ Implementado y Funcional**
- [x] **Core Business Logic** - Todas las funcionalidades principales
- [x] **UI/UX Profesional** - Interfaz moderna y responsiva  
- [x] **Validaciones Robustas** - Sistema de errores descriptivo
- [x] **Notificaciones Toast** - Reemplazó todos los alert() del navegador
- [x] **Búsqueda Avanzada** - Con paginación inteligente
- [x] **Manejo de Errores** - Try/catch en todas las operaciones
- [x] **TypeScript 100%** - Sin errores de compilación
- [x] **Cumplimiento DGII** - Normativas dominicanas

---

## 🛠️ **Stack Tecnológico**

### **Frontend**
- **React 19.1.1** - Framework UI moderno
- **TypeScript 5.8.2** - Tipado fuerte y seguro
- **Vite 6.2.0** - Build tool ultra-rápido
- **TailwindCSS** - Styling utility-first
- **Zustand 5.0.8** - Estado global simple

### **Características Técnicas**
- **Responsive Design** - Mobile-first approach
- **Performance Optimizado** - Lazy loading y memoization
- **Offline Capable** - Funciona sin conexión
- **PWA Ready** - Instalable como app
- **Accessibility** - WCAG compliant

---

## ⚡ **Inicio Rápido**

### **Prerrequisitos**
- Node.js 18+ 
- npm o yarn
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### **Instalación**

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/sirim.git
cd sirim

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir en navegador
# http://localhost:5173
```

### **Build para Producción**

```bash
# Generar build optimizado
npm run build

# Preview del build
npm run preview

# Los archivos quedan en /dist
```

---

## 🏗️ **Estructura del Proyecto**

```
SIRIM/
├── 📁 components/          # Componentes reutilizables
│   ├── ui/                # Componentes de UI (Modal, Button, Toast)
│   └── icons/             # Iconografía del sistema
├── 📁 features/           # Módulos de negocio
│   ├── auth/             # Autenticación y login
│   ├── clientes/         # Gestión de clientes
│   ├── facturas/         # Sistema de facturación
│   ├── gastos/           # Control de gastos
│   ├── inventario/       # Gestión de inventario
│   ├── reportes/         # Reportes DGII
│   └── portal/           # Portal de clientes
├── 📁 stores/            # Estado global (Zustand)
│   ├── useDataStore.ts   # Datos principales
│   ├── useAuthStore.ts   # Autenticación
│   ├── useToastStore.ts  # Notificaciones
│   └── ...               # Otros stores
├── 📁 utils/             # Utilidades y helpers
│   ├── validationUtils.ts # Validaciones centralizadas
│   ├── csvExport.ts      # Exportación de datos
│   └── dgiiReportUtils.ts # Utilidades DGII
├── 📁 hooks/             # Custom React hooks
├── 📄 types.ts           # Definiciones TypeScript
└── 📄 App.tsx           # Componente principal
```

---

## 📊 **Módulos Principales**

### **🧾 Facturación**
- NCF automático con secuencias DGII
- Cálculo automático de ITBIS (18%)
- Control de stock en tiempo real
- Validación de datos completa
- Preview antes de guardar

### **👥 Clientes**
- Validación RNC con base DGII
- Importación masiva desde CSV
- Portal independiente para clientes
- Historial de transacciones

### **💰 Gastos**
- Escaneado OCR de comprobantes
- Categorización para reportes DGII
- Validación de NCF de proveedores
- Conciliación bancaria

### **📊 Reportes DGII**
- **Reporte 606** - Compras y gastos
- **Reporte 607** - Ventas y servicios  
- **Reporte 608** - Comprobantes anulados
- **Anexo A** - Resumen operaciones
- Exportación en formato oficial

---

## 🔧 **Configuración**

### **Variables de Entorno**
```env
# .env
VITE_API_URL=https://api.tudominio.com
VITE_DGII_API_URL=https://dgii-api.com
VITE_APP_VERSION=1.0.0
```

### **Personalización**
- **Logos y colores** - Panel de personalización
- **Términos y condiciones** - Configurables por empresa
- **Formatos de documentos** - Plantillas editables

---

## 🛡️ **Seguridad**

### **Validaciones Implementadas**
- ✅ **Input Sanitization** - Todos los formularios
- ✅ **XSS Protection** - Escape de contenido
- ✅ **CSRF Protection** - Tokens de seguridad  
- ✅ **Data Validation** - Cliente y servidor
- ✅ **Permission Control** - Roles y permisos

### **Cumplimiento DGII**
- ✅ **Formatos oficiales** - NCF, RNC validaciones
- ✅ **Reportes conformes** - Estructura oficial DGII
- ✅ **Cálculos exactos** - ITBIS y deducciones
- ✅ **Auditoría completa** - Logs de todas las operaciones

---

## 🔌 **Integraciones**

### **APIs Disponibles**
- **DGII RNC Lookup** - Consulta automática de contribuyentes
- **Banco Central** - Tasas de cambio (preparado)
- **Email Service** - Envío de documentos (preparado)
- **SMS Notifications** - Alertas móviles (preparado)

### **Exportaciones**
- **CSV** - Todos los reportes
- **Excel** - Formatos contables
- **PDF** - Documentos oficiales
- **TXT** - Reportes DGII

---

## 📱 **Responsive & Mobile**

### **Diseño Adaptativo**
- ✅ **Mobile First** - Optimizado para móviles
- ✅ **Tablet Ready** - Experiencia en tablets
- ✅ **Desktop Full** - Aprovecha pantallas grandes
- ✅ **Touch Friendly** - Controles táctiles optimizados

---

## 🧪 **Testing & Quality**

### **Code Quality**
```bash
# TypeScript check
npm run type-check

# Linting
npm run lint

# Build test
npm run build
```

### **Métricas**
- ✅ **0 TypeScript errors**
- ✅ **100% type coverage**
- ✅ **Responsive design**
- ✅ **Performance optimized**

---

## 🚀 **Deployment**

### **Opciones de Deploy**

#### **Vercel (Recomendado)**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### **Netlify**
```bash
# Build
npm run build

# Deploy manual o conectar Git
```

#### **Servidor Propio**
```bash
# Build
npm run build

# Servir desde /dist con nginx, Apache, etc.
```

---

## 🤝 **Contribución**

### **Para Contribuir**
1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### **Standards**
- **TypeScript** - Tipado fuerte obligatorio
- **ESLint** - Seguir reglas establecidas
- **Prettier** - Formateo automático
- **Conventional Commits** - Mensajes estandarizados

---

## 📞 **Soporte**

### **Documentación**
- 📖 [Guía de Implementación](./IMPLEMENTATION_READY.md)
- 👨‍💻 [Guía de Desarrollo](./docs/dev-guide.md)  
- 🔧 [API Reference](./docs/api.md)
- 🚀 [Deployment Guide](./docs/deployment.md)

### **Contacto**
- 📧 **Email**: soporte@sirim.do
- 💬 **Discord**: [Servidor SIRIM](https://discord.gg/sirim)
- 🐛 **Issues**: [GitHub Issues](https://github.com/tu-usuario/sirim/issues)

---

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 🙏 **Reconocimientos**

- **DGII** - Por las especificaciones técnicas oficiales
- **React Team** - Por el excelente framework
- **TypeScript Team** - Por el sistema de tipos robusto
- **Vite Team** - Por la herramienta de build ultrarrápida

---

<div align="center">

**⭐ Si este proyecto te resulta útil, ¡dale una estrella! ⭐**

**Hecho con ❤️ para empresas dominicanas**

[🌟 Dar Estrella](https://github.com/tu-usuario/sirim) • [🐛 Reportar Bug](https://github.com/tu-usuario/sirim/issues) • [💡 Solicitar Feature](https://github.com/tu-usuario/sirim/issues)

</div>
