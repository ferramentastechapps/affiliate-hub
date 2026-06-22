import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inserindo produtos de teste...');

  const products = [
    {
      name: 'Notebook Lenovo IdeaPad 3 15.6" Intel Core i5',
      category: 'Informática e Games',
      imageUrl: 'https://m.media-amazon.com/images/I/61M7MBv3M+L._AC_SL1500_.jpg',
      price: 2199.90,
      status: 'active',
      links: { amazon: 'https://amzn.to/exemplo1' },
    },
    {
      name: 'Smartphone Samsung Galaxy A55 5G 256GB',
      category: 'Smartphones e TV',
      imageUrl: 'https://m.media-amazon.com/images/I/71RqHe-GFQL._AC_SL1500_.jpg',
      price: 1599.00,
      status: 'active',
      links: { shopee: 'https://shope.ee/exemplo2', mercadoLivre: 'https://mlk.me/exemplo2' },
    },
    {
      name: 'Fone de Ouvido JBL Tune 520BT Bluetooth',
      category: 'Informática e Games',
      imageUrl: 'https://m.media-amazon.com/images/I/61V+GIDRRLL._AC_SL1500_.jpg',
      price: 249.90,
      status: 'active',
      links: { amazon: 'https://amzn.to/exemplo3', shopee: 'https://shope.ee/exemplo3' },
    },
    {
      name: 'Aspirador de Pó Robô Xiaomi Robot Vacuum S10',
      category: 'Casa e Eletrodomésticos',
      imageUrl: 'https://m.media-amazon.com/images/I/61qPCkNpuKL._AC_SL1500_.jpg',
      price: 899.99,
      status: 'active',
      links: { aliexpress: 'https://s.click.aliexpress.com/exemplo4' },
    },
    {
      name: 'Tênis Nike Air Max 270 Masculino',
      category: 'Moda e Acessórios',
      imageUrl: 'https://imgnike-a.akamaihd.net/1920x1920/19177IAF.jpg',
      price: 599.99,
      status: 'active',
      links: { amazon: 'https://amzn.to/exemplo5', magalu: 'https://go.magalu.com/exemplo5' },
    },
    {
      name: 'Smart TV Samsung 50" 4K QLED Crystal',
      category: 'Smartphones e TV',
      imageUrl: 'https://m.media-amazon.com/images/I/81DHKDQ+MrL._AC_SL1500_.jpg',
      price: 2499.00,
      status: 'active',
      links: { amazon: 'https://amzn.to/exemplo6', kabum: 'https://www.kabum.com.br/exemplo6' },
    },
    {
      name: 'Cadeira Gamer ThunderX3 TC3 Ergonômica',
      category: 'Informática e Games',
      imageUrl: 'https://m.media-amazon.com/images/I/81vPRqMiGDL._AC_SL1500_.jpg',
      price: 1299.90,
      status: 'active',
      links: { amazon: 'https://amzn.to/exemplo7', mercadoLivre: 'https://mlk.me/exemplo7' },
    },
    {
      name: 'Air Fryer Philips Walita Turbo Star 4.1L',
      category: 'Casa e Eletrodomésticos',
      imageUrl: 'https://m.media-amazon.com/images/I/71Tr1Moa1CL._AC_SL1500_.jpg',
      price: 449.90,
      status: 'active',
      links: { shopee: 'https://shope.ee/exemplo8', tiktok: 'https://vm.tiktok.com/exemplo8' },
    },
  ];

  for (const p of products) {
    const { links, ...productData } = p;
    await prisma.product.create({
      data: {
        ...productData,
        links: { create: links },
      },
    });
    console.log(`✅ Produto criado: ${p.name}`);
  }

  console.log('🌱 Configurando usuário admin...');
  const adminEmail = 'jotanogueira@icloud.com';
  
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'admin' },
    create: {
      email: adminEmail,
      name: 'Admin Jota',
      role: 'admin',
    },
  });
  console.log(`✅ Admin configurado: ${adminEmail}`);

  console.log('\n🎉 Seed concluído! Produtos adicionados ao banco.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
