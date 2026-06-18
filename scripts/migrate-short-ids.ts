import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Migrando produtos existentes para usar shortIds...')
  
  // Buscar todos os produtos sem shortId
  const products = await prisma.product.findMany({
    where: {
      shortId: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  console.log(`📦 Encontrados ${products.length} produtos para migrar`)

  let count = 1
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { shortId: count }
    })
    console.log(`✅ Produto ${count}: ${product.name.substring(0, 50)}...`)
    count++
  }

  console.log(`\n🎉 Migração concluída! ${products.length} produtos atualizados.`)
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
