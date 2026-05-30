const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("URL:", supabaseUrl);
console.log("Key prefix:", supabaseKey.substring(0, 10));

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Calling RPC...");
  const { data, error } = await supabase.rpc("verify_admin_pin", {
    bid: "91bacaf9-24ae-4ef6-853c-5db784784e30", // Beast business
    pin_attempt: "1234",
  });
  console.log("Data:", data);
  console.log("Error:", error);
}

run();
