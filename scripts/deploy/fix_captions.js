const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const captions = await prisma.captionHistory.findMany();
  
  let updated = 0;
  for (const c of captions) {
    if (c.caption.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(c.caption);
        if (parsed.titulo) {
          await prisma.captionHistory.update({
            where: { id: c.id },
            data: { caption: parsed.titulo }
          });
          updated++;
        }
      } catch (e) {
        // ignore
      }
    }
  }
  console.log(`Updated ${updated} captions that were raw JSON.`);
}

main().finally(() => prisma.$disconnect());
