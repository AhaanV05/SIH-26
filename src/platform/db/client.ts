import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

const createPrismaCollectionStub = () =>
  new Proxy(
    async () => null,
    {
      get: () => async () => null,
    },
  );

const offlinePrismaStub = new Proxy(
  {},
  {
    get: () => createPrismaCollectionStub(),
  },
) as PrismaClient;

export const prisma = hasDatabaseUrl()
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : (globalForPrisma.prisma ?? offlinePrismaStub);

if (process.env.NODE_ENV !== "production" && hasDatabaseUrl()) {
  globalForPrisma.prisma = prisma;
}
