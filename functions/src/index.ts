// IMPORTANT: UTILITX requires SSR. This Firebase Function handles all Next.js routes.
import * as functions from "firebase-functions";
import * as path from "path";
import next from "next";

// Path to the Next.js app (parent directory of functions)
// When deployed, __dirname will be functions/lib, so we go up to project root
const nextjsDistDir = path.join(__dirname, "../..");

// Initialize Next.js app
const app = next({ 
  dev: false, 
  conf: { 
    distDir: path.join(nextjsDistDir, ".next"),
  } 
});

const handle = app.getRequestHandler();

export const nextApp = functions.https.onRequest(async (req, res) => {
  await app.prepare();
  return handle(req, res);
});

