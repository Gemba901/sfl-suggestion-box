// src/services/supabase.js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://guqnbwztmpgzyzemgvjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cW5id3p0bXBnenl6ZW1ndmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Njg2MzIsImV4cCI6MjA4NzQ0NDYzMn0.yC-YtNSD6P_krkUWQA0nn5pnhnlcv4FfhtyJ6bOwJTQ"
);
