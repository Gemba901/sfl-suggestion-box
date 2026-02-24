// src/services/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://guqnbwztmpgzyzemgvjh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__cTdnaq02hEDj9b2PMdfeg_TAXkrqcG";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
