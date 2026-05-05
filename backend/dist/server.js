import express from "express";
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
dotenv.config();
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_PATH = path.resolve(__dirname, "../public");
const app = express();
app.use(express.json());
/* CONFIGURAÇÃO DE SESSÃO */
app.use(session({
    name: "presenca.qr.session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax", // ESSENCIAL
    }
}));
/* PASSPORT */
app.use(passport.initialize());
app.use(passport.session());
app.use("/trpc", trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
}));
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});
/* GOOGLE LOGIN */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        const googleId = Number(profile.id);
        if (isNaN(googleId)) {
            return done(new Error("ID inválido do Google"), undefined);
        }
        if (!email) {
            return done(new Error("Email não encontrado no Google"), undefined);
        }
        const adminList = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
        // 1. verifica se já existe aluno no banco
        let student = await db.getStudentByUserId(googleId);
        if (!student) {
            await db.createStudent({
                userId: googleId,
                matricula: `MAT-${Date.now()}`,
                nome: profile.displayName,
                curso: "Não informado",
                email,
                creditosTotais: "0",
            });
            student = await db.getStudentByUserId(googleId);
        }
        // 2. monta usuário da sessão
        const user = {
            id: googleId,
            email,
            name: profile.displayName,
            role: adminList.includes(email) ? "admin" : "student",
        };
        return done(null, user);
    }
    catch (error) {
        return done(error, undefined);
    }
}));
/* LISTA DE ADMINS */
/* MIDDLEWARE DE PROTEÇÃO */
function garantirLogin(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/auth/google");
}
function garantirAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect("/auth/google");
    }
    const user = req.user;
    if (user?.role === "admin") {
        return next();
    }
    res.redirect("/estudante.html");
}
// iniciar login
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// retorno do Google
app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }), (req, res) => {
    const user = req.user;
    if (user?.role === "admin") {
        res.redirect("/secretaria.html");
    }
    else {
        res.redirect("/estudante.html");
    }
});
/* PROTEGER PÁGINAS */
app.get("/estudante.html", garantirLogin, (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "estudante.html"));
});
app.get("/secretaria.html", garantirAdmin, (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "secretaria.html"));
});
/* USUÁRIO LOGADO */
app.get("/user", (req, res) => {
    if (req.user) {
        res.json(req.user);
    }
    else {
        res.status(401).json({ error: "Não autenticado" });
    }
});
/* LOGOUT */
app.get("/logout", (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});
app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "login.html"));
});
/* SERVIDOR */
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
