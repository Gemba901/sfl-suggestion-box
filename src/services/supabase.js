// src/services/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://guqnbwztmpgzyzemgvjh.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cW5id3p0bXBnenl6ZW1ndmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Njg2MzIsImV4cCI6MjA4NzQ0NDYzMn0.yC-YtNSD6P_krkUWQA0nn5pnhnlcv4FfhtyJ6bOwJTQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
