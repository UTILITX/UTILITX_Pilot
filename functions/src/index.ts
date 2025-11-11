/**
 * UTILITX: Firebase SSR Entrypoint
 * 
 * Runs Next.js server (SSR) in Firebase Functions environment.
 * Requires Blaze plan for outbound API calls (Supabase, GPT, Esri, Flask).
 * 
 * IMPORTANT:
 * - DO NOT use output: 'export' in next.config.mjs (breaks SSR)
 * - All routes are handled by this function (configured in firebase.json)
 * - Region is set to us-central1 for optimal performance
 * - Structured logging is enabled for debugging Supabase/Esri/GPT calls
 */

import * as functions from "firebase-functions";
import * as express from "express";
import * as fs from "fs";
import * as path from "path";
import next from "next";

// Region configuration - us-central1 for optimal performance
// Change to "northamerica-northeast1" for Canada if needed
const region = "us-central1";

// Detect environment - use dev mode only in local emulator
const dev = process.env.NODE_ENV !== "production";

// Initialize Next.js app
// distDir points to .next directory (copied to functions/.next during deployment)
// The copy-next-build.js script copies .next from project root to functions/.next
// After TypeScript compilation, __dirname is functions/lib, so we go up to functions/.next
// In deployed Functions: functions/.next (copied during predeploy)
// In local development: functions/.next (if copied) or ../.next (project root)
const functionsNextDir = path.join(__dirname, '..', '.next'); // functions/.next
const parentNextDir = path.join(__dirname, '..', '..', '.next'); // ../.next (project root)
const distDir = fs.existsSync(functionsNextDir) 
  ? functionsNextDir
  : parentNextDir;

const app = next({ 
  dev, 
  conf: { 
    distDir: distDir,
  } 
});

const handle = app.getRequestHandler();

/**
 * Next.js SSR Function
 * 
 * Handles all routes for UTILITX application.
 * Supports:
 * - Server-side rendering (SSR)
 * - Dynamic routes (/share/[id], /contribute/[id], etc.)
 * - API routes (/api/*)
 * - Outbound API calls (Supabase, Esri, GPT, Flask) - requires Blaze plan
 * 
 * Logging:
 * - Request method and path
 * - Response status
 * - Execution time
 * - Errors (if any)
 */
export const nextApp = functions
  .region(region)
  .https.onRequest(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { method, url } = req;
    
    // Log request
    functions.logger.info("Next.js SSR Request", {
      method,
      url,
      userAgent: req.get("user-agent"),
      timestamp: new Date().toISOString(),
    });
    
    try {
      // Prepare Next.js app (warmup)
      await app.prepare();
      
      // Handle request
      await handle(req, res);
      
      // Log successful response
      const duration = Date.now() - startTime;
      functions.logger.info("Next.js SSR Response", {
        method,
        url,
        status: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      // Log error
      const duration = Date.now() - startTime;
      functions.logger.error("Next.js SSR Error", {
        method,
        url,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      
      // Send error response
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal Server Error",
          message: error.message,
        });
      }
    }
  });

