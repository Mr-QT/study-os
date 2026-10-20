import type { DatabaseHandle } from "./db";

declare module "fastify" {
  interface FastifyInstance {
    database: DatabaseHandle | null;
  }
}
