// backend/prisma/client.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // Optional: Enable query logging for debugging
});

export default prisma;