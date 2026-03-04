# Usar imagen base ligera de Node.js
FROM node:22-slim

# Instalar dependencias necesarias para algunas librerías
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de definición de paquetes
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de Vite
EXPOSE 3000

# Comando para correr en modo desarrollo con host externo habilitado
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
