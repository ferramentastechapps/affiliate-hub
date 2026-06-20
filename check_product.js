const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.product.findUnique({
  where: {id: 'cmqb6leis000muhngxttx6q43'},
  select: {links: true, name: true, description: true}
}).then(r => console.log(JSON.stringify(r, null, 2))).finally(() => p.$disconnect());
