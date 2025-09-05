# SIRIM - Sistema Inteligente de Registros Impositivos

## Overview

SIRIM is a comprehensive web-based tax and accounting management system specifically designed for businesses operating in the Dominican Republic. The system provides multi-tenant capabilities with role-based access control, allowing accounting professionals to manage multiple client companies. It includes features for invoicing with NCF (Número de Comprobante Fiscal) compliance, expense tracking, inventory management, payroll processing, and accounting with automated journal entries. The application supports both online and offline operations with data synchronization capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 19** with TypeScript for the user interface
- **React Router DOM** for client-side routing with HashRouter for compatibility
- **Zustand** for state management with persistence layer
- **Tailwind CSS** for styling and responsive design
- **Vite** as the build tool and development server
- **Recharts** for data visualization and reporting dashboards

### Backend Architecture  
- **Express.js** REST API server
- **Prisma ORM** for database abstraction and migrations
- **JWT authentication** with bcrypt for password hashing
- **CORS middleware** configured for cross-origin requests
- **PostgreSQL** as the primary database (configurable via DATABASE_URL)

### Data Storage Solutions
- **PostgreSQL** for persistent data storage
- **IndexedDB** for offline capabilities and RNC database caching
- **Local Storage** via Zustand persist for user sessions and app state
- **Mock data stores** for development and demo purposes

### Authentication and Authorization
- **Dual authentication system**: Microsoft OAuth and local password-based auth
- **Role-based permissions** with granular access control (Admin, Contador, Operaciones, etc.)
- **Multi-tenant architecture** where users can access multiple companies
- **Client portal authentication** separate from main application auth
- **JWT tokens** for API authentication with role-based endpoint protection

### Key Design Patterns
- **Store pattern** using Zustand for centralized state management
- **Multi-tenant data isolation** with company-scoped operations
- **Offline-first approach** with action queuing and synchronization
- **Command palette** for quick navigation and search functionality
- **Audit trail** implementation for compliance and tracking
- **Real-time notifications** system for alerts and system events

## External Dependencies

### Third-Party Services
- **Microsoft Authentication** for SSO capabilities
- **DGII (Dominican Tax Authority)** integration for RNC validation and tax reporting
- **CORS proxy services** for accessing external APIs in browser environment

### APIs and Integrations
- **Gemini API** for AI-powered features (configured via GEMINI_API_KEY)
- **DGII RNC database** for taxpayer information validation
- **TSS (Dominican Social Security)** compliance for payroll calculations
- **SIRLA system** integration for labor reporting

### Development Tools
- **ESM imports** via import maps for React dependencies
- **Node.js 18+** runtime requirement
- **PostgreSQL** database with Prisma client
- **Camera permissions** requested for document scanning features

### Compliance Standards
- **NCF (Número de Comprobante Fiscal)** management for Dominican tax compliance
- **DGII reporting formats** (606, 607, 608) for tax submissions
- **Dominican payroll regulations** with automatic tax calculations
- **Multi-currency support** with DOP as primary currency