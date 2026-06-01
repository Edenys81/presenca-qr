import "express-session";
import "passport";

declare global {
  namespace Express {
    interface Request {
      logout(callback: (err?: Error) => void): void;
    }
  }
}
