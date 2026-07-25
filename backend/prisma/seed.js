const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const seedAdmin = async () => {
  const email = "admin@travora.com";
  const password = "Admin12345";

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingAdmin) {
    console.log("Admin user already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      firstName: "Travora",
      lastName: "Admin",
      email,
      passwordHash,
      role: "ADMIN",
      provider: "LOCAL",
      status: "ACTIVE",
      isEmailVerified: true,
    },
  });

  console.log("Admin user created successfully");
  console.log(`Email: ${admin.email}`);
};

const main = async () => {
  await seedAdmin();
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });