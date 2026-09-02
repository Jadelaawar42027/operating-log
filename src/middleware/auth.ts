import { NextFunction, Request, Response } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.API_KEY;
  if (!expected) {
    res.status(500).json({ error: "Server misconfigured: API_KEY not set" });
    return;
  }
  const provided = req.header("x-api-key");
  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
