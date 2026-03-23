// src/config/client.js
// ─────────────────────────────────────────────────────────────
// ALL client-specific values live here and nowhere else.
// To deploy for a new client, set these environment variables
// in Vercel (or your hosting platform) — never edit this file.
//
// For Lean Energy deployment example:
//   REACT_APP_COMPANY_NAME     = Lean Energy
//   REACT_APP_APP_NAME         = Lean Energy Suggestion Box
//   REACT_APP_APP_TAGLINE      = Making Lean Energy better, one idea at a time
//   REACT_APP_LOGO_URL         = /lean-energy-logo.png
//   REACT_APP_STORAGE_PREFIX   = lean
//   REACT_APP_PRIMARY_COLOR    = #e11d48
//   REACT_APP_SUPABASE_URL     = https://your-project.supabase.co
//   REACT_APP_SUPABASE_ANON_KEY = your-anon-key
// ─────────────────────────────────────────────────────────────

const client = {
  // Short company name — used in phrases like "improve SFL"
  COMPANY_NAME: process.env.REACT_APP_COMPANY_NAME || "SFL",

  // Full app title shown in the header and login screen
  APP_NAME: process.env.REACT_APP_APP_NAME || "SFL Suggestion Box",

  // Subtitle shown on the login page
  APP_TAGLINE:
    process.env.REACT_APP_APP_TAGLINE ||
    "Making SFL better, one idea at a time",

  // Logo image — put the file in /public and set the path here
  LOGO_URL: process.env.REACT_APP_LOGO_URL || "/sfl-logo.png",

  // Prefix for all localStorage keys (e.g. "sfl" → "sfl_dark", "sfl_name")
  STORAGE_PREFIX: process.env.REACT_APP_STORAGE_PREFIX || "sfl",

  // Brand primary color — used for the manifest theme color
  PRIMARY_COLOR: process.env.REACT_APP_PRIMARY_COLOR || "#6366f1",

  // Supabase — each client has their own Supabase project
  SUPABASE_URL:
    process.env.REACT_APP_SUPABASE_URL ||
    "https://guqnbwztmpgzyzemgvjh.supabase.co",

  SUPABASE_ANON_KEY:
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    "sb_publishable__cTdnaq02hEDj9b2PMdfeg_TAXkrqcG",
};

export default client;
