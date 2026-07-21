const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const reviewCount = await prisma.productReview.count();
    console.log("=== ProductReview Count ===");
    console.log(reviewCount);
    
    // Check fields of ProductAlert
    console.log("=== ProductAlert exists ===");
    const testAlert = await prisma.productAlert.findFirst();
    console.log(testAlert ? "Found an alert" : "Table is empty but exists");

    console.log("Tabelas da Fase 7 prontas no banco de dados!");
  } catch (err) {
    console.error("Erro Prisma:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
