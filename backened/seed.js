// backend/src/seed.js
const prisma = require('./prisma/client');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    console.log('Hashing passwords...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedUserPassword = await bcrypt.hash('user123', 10);

    console.log('Deleting existing data...');
    await prisma.userOfferCode.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.offerCode.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.securityQuestion.deleteMany();
    await prisma.oTP.deleteMany();

    console.log('Seeding admin and user...');
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedAdminPassword,
        name: 'Admin User',
        role: 'admin',
        securityQuestions: {
          create: [
            { question: 'What is your pet’s name?', answer: 'Max' },
            { question: 'What is your mother’s maiden name?', answer: 'Smith' },
          ],
        },
      },
    });

    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        password: hashedUserPassword,
        name: 'Test User',
        role: 'user',
        securityQuestions: {
          create: [
            { question: 'What is your pet’s name?', answer: 'Buddy' },
            { question: 'What is your mother’s maiden name?', answer: 'Jones' },
          ],
        },
      },
    });

    console.log('Seeding products...');
    await prisma.product.createMany({
      data: [
        {
          name: 'T-Shirt',
          description: 'Comfortable cotton t-shirt',
          price: 599,
          mrp: 799,
          images: ['https://res.cloudinary.com/dugh8szaj/image/upload/v1744894443/tshirt1.jpg'],
          category: 'Clothing',
          colors: ['#000000', '#FFFFFF'],
          sizes: ['S', 'M', 'L'],
          quantity: 100,
          stockBySize: { S: 30, M: 40, L: 30 },
        },
        {
          name: 'Jeans',
          description: 'Slim fit denim jeans',
          price: 1299,
          mrp: 1599,
          images: ['https://res.cloudinary.com/dugh8szaj/image/upload/v1744894443/jeans1.jpg'],
          category: 'Clothing',
          colors: ['#0000FF'],
          sizes: ['30', '32', '34'],
          quantity: 90,
          stockBySize: { '30': 20, '32': 40, '34': 30 },
        },
      ],
    });

    console.log('Seeding offer codes...');
    await prisma.offerCode.createMany({
      data: [
        {
          code: 'FIRST20',
          discount: 20,
          isFirstOrder: true,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          code: 'NEXT10',
          discount: 10,
          isFirstOrder: false,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    console.log('✅ Database seeded successfully!');
    console.log('Admin Credentials: admin@example.com / admin123');
    console.log('User Credentials: user@example.com / user123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
module.exports = seed;