const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('crypto');
const prisma = new PrismaClient();

async function main() {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync('admin123', salt, 64).toString('hex');
  const password = salt + ':' + hash;
  await prisma.user.updateMany({
    where: { email: 'jotanogueira@icloud.com' },
    data: { password }
  });
  console.log('Senha definida com sucesso no banco de dados!');
}

main().finally(() => prisma.$disconnect());
