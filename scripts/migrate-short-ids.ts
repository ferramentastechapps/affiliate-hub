import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Migrando produtos existentes para usar shortIds...')
  
  // Buscar todos os produtos
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: 'asc'
    }
  })

  console.log(`📦 Encontrados ${products.length} produtos`)

  // Encontrar o maior shortId atual
  const maxShortId = await prisma.product.findFirst({
    orderBy: {
      shortId: 'desc'
    },
    select: {
      shortId: true
    }
  })

  let nextId = (maxShortId?.shortId || 0) + 1

  // Atualizar produtos que não têm shortId definido corretamente
  for (const product of products) {
    // Se o produto já tem um shortId válido, pular
    if (product.shortId && product.shortId > 0) {
      console.log(`⏭️  Produto já tem shortId ${product.shortId}: ${product.name.substring(0, 50)}...`)
      continue
    }

    // Atualizar com o próximo ID
    await prisma.product.update({
      where: { id: product.id },
      data: { shortId: nextId }
    })
    console.log(`✅ Produto ${nextId}: ${product.name.substring(0, 50)}...`)
    nextId++
  }

  console.log(`\n🎉 Migração concluída!`)
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
