import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import * as db from "../database/db.js";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: any | null;
};

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<TrpcContext> {
  // usuário do Passport fica dentro da sessão
  const sessionUserId = (req.session as any)?.passport?.user;

  if (!sessionUserId) {
    return {
      req,
      res,
      user: null,
    };
  }

  // busca usuário real no banco
  const dbUser = await db.getUserById(sessionUserId);

  if (!dbUser) {
    return {
      req,
      res,
      user: null,
    };
  }

  return {
    req,
    res,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
    },
  };
}