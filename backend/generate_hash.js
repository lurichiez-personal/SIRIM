const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'Alonso260990#';
    const saltRounds = 10;
    
    try {
        console.log('=== GENERANDO HASH PARA CONTRASEÑA CORRECTA ===');
        console.log('Contraseña original:', password);
        
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Hash generado:', hash);
        
        // Verificar que el hash funciona
        const isValid = await bcrypt.compare(password, hash);
        console.log('Verificación del hash:', isValid ? '✅ Válido' : '❌ Inválido');
        
        // Verificar hash actual con contraseña correcta
        const currentHash = '$2b$10$9yPoUHU0XGPs9SBhgW8rouOHdz8FsRbl/tSu4NDjpdWFK7s6KX1DK';
        const isCurrentValid = await bcrypt.compare(password, currentHash);
        console.log('Contraseña correcta vs Hash actual:', isCurrentValid ? '✅ Válido' : '❌ Inválido');
        
        const isOldValid = await bcrypt.compare('password123', currentHash);
        console.log('Contraseña antigua vs Hash actual:', isOldValid ? '✅ Válido' : '❌ Inválido');
        
        console.log('\n=== SQL PARA ACTUALIZAR ===');
        console.log(`UPDATE "User" SET password = '${hash}' WHERE email = 'lurichiez@gmail.com';`);
        
        return hash;
    } catch (error) {
        console.error('Error generando hash:', error);
    }
}

generateHash();