import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routes/routers.js";
import { createContext } from "./trpc/context.js";
import * as db from "./database/db.js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_PATH = path.resolve(__dirname, "../public");
const app = express();

dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("[ENV] EMAIL_USER:", process.env.EMAIL_USER ? "✅ Configurado" : "❌ NÃO configurado");
console.log("[ENV] EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "✅ Configurado" : "❌ NÃO configurado");
console.log("[ENV] BUILT_IN_FORGE_API_URL:", process.env.BUILT_IN_FORGE_API_URL ? "✅ Configurado" : "❌ NÃO configurado");
console.log("[ENV] BUILT_IN_FORGE_API_KEY:", process.env.BUILT_IN_FORGE_API_KEY ? "✅ Configurado" : "❌ NÃO configurado");

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET não definido");
}
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID não definido");
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET não definido");
}
if (!process.env.GOOGLE_CALLBACK_URL) {
  throw new Error("GOOGLE_CALLBACK_URL não definido");
}

// ✅ MUDANÇA 1: CORS dinâmico baseado em FRONTEND_URL
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const CORS_ORIGIN = process.env.NODE_ENV === "production" 
  ? FRONTEND_URL 
  : "http://localhost:5173";

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  } )
);

app.use(express.json());

/* CONFIGURAÇÃO DE SESSÃO */

app.use(
  session({
    name: "presenca.qr.session",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      // ✅ MUDANÇA 2: secure: true em produção (HTTPS)
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    }
  } )
);

/* PASSPORT */

app.use(passport.initialize());
app.use(passport.session());
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

passport.serializeUser((user: any, done) => {
  // salva apenas o ID na sessão
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const dbUser = await db.getUserById(id);

    if (!dbUser) {
      return done(null, false);
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
    };

    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/* GOOGLE LOGIN */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async(accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;

        if (!googleId) {
          return done(new Error("ID inválido do Google"), undefined);
        }

        if (!email) {
          return done(new Error("Email não encontrado no Google"), undefined);
        }

        const adminList =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];

        // 1. garante usuário no banco
        await db.upsertUser({
          openId: googleId,
          name: profile.displayName,
          email,
          loginMethod: "google",
          role: adminList.includes(email) ? "admin" : "user",
        });

        // 2. busca usuário no banco
        const dbUser = await db.getUserByOpenId(googleId);

        if (!dbUser) {
          return done(new Error("Erro ao recuperar usuário"), undefined);
        }

        // 3. agora usa o ID NUMÉRICO do banco
        let student = await db.getStudentByUserId(dbUser.id);

        if (!student) {
          await db.createStudent({
            userId: dbUser.id,
            matricula: `MAT-${Date.now()}`,
            nome: profile.displayName,
            curso: "Não informado",
            email,
            creditosTotais: "0.00"
          });

          student = await db.getStudentByUserId(dbUser.id);
        }

        // 4. monta usuário da sessão
        const user = {
           id: dbUser.id,
          email,
          name: profile.displayName,
          role: adminList.includes(email) ? "admin" : "user",
        };

        return done(null, user);
      } catch (error) {
        return done(error as any, undefined);
      }
    }
  )
);

/* LISTA DE ADMINS */


/* MIDDLEWARE DE PROTEÇÃO */

function garantirLogin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).isAuthenticated()) {
    return next();
  }

  res.redirect("/auth/google");
}

function garantirAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).isAuthenticated()) {
    return res.redirect("/auth/google");
  }

  const user = (req as any).user;

  if (user?.role === "admin") {
    return next();
  }

  res.redirect("/estudante.html");
}

// iniciar login
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// retorno do Google
// ✅ MUDANÇA 3: Usar FRONTEND_URL dinâmico em redirects
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user?.role === "admin") {
      res.redirect(`${FRONTEND_URL}/admin`);
    } else {
      res.redirect(`${FRONTEND_URL}/student`);
    }
  }
);

/* PROTEGER PÁGINAS */

app.get("/estudante.html", garantirLogin, (req: Request, res: Response) => {
  res.sendFile(path.join(PUBLIC_PATH, "estudante.html"));
});

app.get("/secretaria.html", garantirAdmin, (req: Request, res: Response) => {
  res.sendFile(path.join(PUBLIC_PATH, "secretaria.html"));
});

/* USUÁRIO LOGADO */

app.get("/user", (req: Request, res: Response) => {
  if ((req as any).user) {
    res.json((req as any).user);
  } else {
    res.status(401).json({ error: "Não autenticado" });
  }
});

/* LOGOUT */

// ✅ MUDANÇA 4: Usar FRONTEND_URL dinâmico em logout
app.get("/logout", (req, res, next) => {
  const sessionName = "presenca.qr.session";

  req.logout(function (err) {
    if (err) return next(err);

    if (!req.session) {
      return res.redirect(`${FRONTEND_URL}/`);
    }

    req.session.destroy((err) => {
      if (err) return next(err);

      res.clearCookie(sessionName, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      } );

      res.redirect(`${FRONTEND_URL}/`);
    });
  });
});

/* ✅ MUDANÇA 5: SERVIR FRONTEND COMPILADO EM PRODUÇÃO */

if (process.env.NODE_ENV === "production") {
  // Caminho para o frontend compilado
  const FRONTEND_DIST = path.join(__dirname, "../../frontend/dist");
  
  // Servir arquivos estáticos (CSS, JS, imagens, etc)
  app.use(express.static(FRONTEND_DIST));
  
  // SPA fallback: redirecionar rotas desconhecidas para index.html
  // Mas não redirecionar APIs
  app.use("*", (req, res) => {
    // Não redirecionar endpoints de API
    if (req.path.startsWith("/api") || req.path.startsWith("/auth") || req.path.startsWith("/trpc")) {
      return res.status(404).json({ error: "Not found" });
    }
    
    // Redirecionar tudo mais para index.html (SPA)
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

/* SERVIDOR */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}` );
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`FRONTEND_URL: ${FRONTEND_URL}`);
});
