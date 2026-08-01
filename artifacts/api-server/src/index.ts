import app from "./app.js";
import { logger } from "./lib/logger.js";

// VercelではExpressアプリをそのままexportする
export default app;

// Replitやローカル環境で起動するときだけポートを待ち受ける
if (!process.env.VERCEL) {
  const rawPort = process.env.PORT ?? "3000";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}
