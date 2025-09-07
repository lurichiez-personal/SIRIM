const bcrypt = require("bcryptjs");
const prisma = require("./db");

async function seedMasterUser() {
  console.log("🔄 Inicializando usuario master para producción...");
  
  try {
    // Verificar si ya existe el usuario master
    const existingMaster = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'lurichiez@gmail.com' },
          { role: 'master' }
        ]
      }
    });

    if (existingMaster) {
      console.log("✅ Usuario master ya existe:", existingMaster.email);
      return existingMaster;
    }

    // Crear usuario master
    const hashedPassword = await bcrypt.hash("Alonso260990#", 10);
    
    const masterUser = await prisma.user.create({
      data: {
        email: "lurichiez@gmail.com",
        password: hashedPassword,
        nombre: "Luis Fernando Richiez Mateo", 
        role: "master",
        active: true,
        emailVerified: true
      }
    });

    console.log("✅ Usuario master creado exitosamente:");
    console.log(`   Email: ${masterUser.email}`);
    console.log(`   ID: ${masterUser.id}`);
    console.log(`   Role: ${masterUser.role}`);
    
    return masterUser;
    
  } catch (error) {
    console.error("❌ Error creando usuario master:", error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  seedMasterUser()
    .then(() => {
      console.log("🎯 Inicialización completada");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Error en inicialización:", error);
      process.exit(1);
    });
}

module.exports = { seedMasterUser };