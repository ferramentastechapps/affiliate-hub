import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Limpando banco de dados...')
  await prisma.coupon.deleteMany()
  await prisma.link.deleteMany()
  await prisma.product.deleteMany()

  console.log('Populando banco de dados com 5 produtos...')

  const products = [
    {
      name: 'Notebook Dell Inspiron',
      category: 'Informática',
      description: 'Notebook de alta performance para trabalho e estudos.',
      imageUrl: 'https://m.media-amazon.com/images/I/61sGEkgN6CL._AC_SL1500_.jpg',
      price: 3499.00,
      originalPrice: 4200.00,
      links: {
        create: {
          amazon: 'https://amazon.com.br/dp/B00123456',
        }
      },
      coupons: {
        create: [
          {
            code: 'DELL100',
            description: 'R$ 100 de desconto no carrinho',
            discount: 'R$ 100 OFF',
            platform: 'Amazon',
          }
        ]
      }
    },
    {
      name: 'Smartphone Samsung Galaxy S23',
      category: 'Smartphones',
      description: 'Câmera principal de 50MP, Bateria de longa duração.',
      imageUrl: 'https://m.media-amazon.com/images/I/61RVNWZA7TL._AC_SL1500_.jpg',
      price: 4599.00,
      originalPrice: 5399.00,
      links: {
        create: {
          amazon: 'https://amazon.com.br/dp/B00123457',
        }
      }
    },
    {
      name: 'Cadeira Gamer XT',
      category: 'Setup',
      description: 'Cadeira ergonômica com almofadas.',
      imageUrl: 'https://m.media-amazon.com/images/I/61G+nZIfTPL._AC_SL1200_.jpg',
      price: 899.90,
      originalPrice: 1199.90,
      links: {
        create: {
          amazon: 'https://amazon.com.br/dp/B00123458',
          shopee: 'https://shopee.com.br/product/123/456'
        }
      },
      coupons: {
        create: [
          {
            code: 'GAMER10',
            description: '10% de desconto',
            discount: '10% OFF',
            platform: 'Shopee',
          }
        ]
      }
    },
    {
      name: 'Monitor LG Ultrawide 29"',
      category: 'Home Office',
      description: 'Monitor Ultrawide IPS 75Hz e FreeSync.',
      imageUrl: 'https://m.media-amazon.com/images/I/71DvwU9728L._AC_SL1500_.jpg',
      price: 1099.00,
      originalPrice: 1399.00,
      links: {
        create: {
          amazon: 'https://amazon.com.br/dp/B00123459',
          mercadoLivre: 'https://produto.mercadolivre.com.br/MLB-1234'
        }
      }
    },
    {
      name: 'Fone de Ouvido Bluetooth JBL',
      category: 'Áudio',
      description: 'Fone de ouvido on-ear sem fio JBL Tune 510BT Pure Bass.',
      imageUrl: 'https://m.media-amazon.com/images/I/61kWB+uzR2L._AC_SL1500_.jpg',
      price: 249.90,
      originalPrice: 299.00,
      links: {
        create: {
          amazon: 'https://amazon.com.br/dp/B00123460',
          tiktok: 'https://tiktok.com/shop/jbl-510'
        }
      }
    }
  ]

  for (const product of products) {
    await prisma.product.create({
      data: product
    })
  }

  console.log('Produtos cadastrados com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
