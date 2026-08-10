const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]; // 'list' or 'reset'
  
  try {
    if (command === 'reset') {
      const email = args[1];
      const newPassword = args[2];
      
      if (!email || !newPassword) {
        console.error('Usage: node scripts/debug/manage-users.js reset <email> <newPassword>');
        process.exit(1);
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      
      if (!user) {
        console.error(`User with email "${normalizedEmail}" not found.`);
        process.exit(1);
      }
      
      const hashedPassword = hashPassword(newPassword);
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { password: hashedPassword }
      });
      
      console.log(`Successfully updated password for user: ${normalizedEmail}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
    } else {
      // Default: List users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          password: true,
          createdAt: true
        }
      });
      
      console.log("=== USERS LIST ===");
      console.log(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        hasPassword: !!u.password,
        createdAt: u.createdAt
      })));
      console.log("==================");
      console.log("To reset a user's password, run:");
      console.log("node scripts/debug/manage-users.js reset <email> <newPassword>");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
