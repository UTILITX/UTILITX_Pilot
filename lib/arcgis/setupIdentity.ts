// lib/arcgis/setupIdentity.ts
"use client";

import esriId from "@arcgis/core/identity/IdentityManager";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import { ARCGIS_CLIENT_ID, ARCGIS_PORTAL_URL } from "./config";

let initialized = false;

export function setupIdentity() {
  if (initialized) return;
  initialized = true;

  if (!ARCGIS_CLIENT_ID) {
    console.error(
      "ArcGIS OAuth: NEXT_PUBLIC_ARCGIS_CLIENT_ID is missing. Check your .env.local."
    );
    return;
  }

  const info = new OAuthInfo({
    appId: ARCGIS_CLIENT_ID,
    portalUrl: ARCGIS_PORTAL_URL,
    popup: false, // full-page redirect flow
    // Let ArcGIS pick flow type automatically
  });

  esriId.registerOAuthInfos([info]);
}

/**
 * Gets (or prompts for) a credential against your org portal.
 */
export async function getCredential() {
  setupIdentity();

  const sharingUrl = `${ARCGIS_PORTAL_URL}/sharing`;

  try {
    // If the user already signed in in this browser
    const cred = await esriId.checkSignInStatus(`${sharingUrl}/rest`);
    return cred;
  } catch {
    // Will trigger the OAuth redirect / callback flow
    const cred = await esriId.getCredential(`${sharingUrl}/rest`);
    return cred;
  }
}

export function signOut() {
  esriId.destroyCredentials();
}

