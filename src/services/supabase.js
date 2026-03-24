// src/services/supabase.js
import { createClient } from "@supabase/supabase-js";
import client from "../config/client";

export const supabase = createClient(client.SUPABASE_URL, client.SUPABASE_ANON_KEY);
