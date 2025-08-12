import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { generateUID } from '../src/lib/uid-generator';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test user
  const { uid } = generateUID();
  const hashedPassword = await hashPassword('TestPass123!');

  const testUser = await prisma.user.upsert({
    where: { email: 'test@sevispass.com' },
    update: {},
    create: {
      uid,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@sevispass.com',
      nid: 'S1234567A', // NID format
      phoneNumber: '+675 8123 4567',
      password: hashedPassword,
    },
  });

  // Create another test user with passport format
  const { uid: uid2 } = generateUID();
  const hashedPassword2 = await hashPassword('TestPass456!');

  const testUser2 = await prisma.user.upsert({
    where: { email: 'passport@sevispass.com' },
    update: {},
    create: {
      uid: uid2,
      firstName: 'Passport',
      lastName: 'User',
      email: 'passport@sevispass.com',
      nid: 'A1234567', // Passport format
      phoneNumber: '+675 9876 5432',
      password: hashedPassword2,
    },
  });

  console.log('Created test users:');
  console.log('  - NID User:', { uid: testUser.uid, email: testUser.email, nid: testUser.nid });
  console.log('  - Passport User:', { uid: testUser2.uid, email: testUser2.email, nid: testUser2.nid });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });