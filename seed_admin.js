const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const email = "jotanogueira@icloud.com";
  const password = "ASYfNW4bIksRdQ30S0pSyw";
  const hashed = hashPassword(password);

  console.log("Recriando usuario admin...");
  await prisma.user.upsert({
    where: { email },
    update: {
      role: 'admin',
      password: hashed,
    },
    create: {
      name: 'Administrador',
      email: email,
      password: hashed,
      role: 'admin',
    }
  });
  console.log("Admin criado com sucesso!");
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);process.exit(1)});