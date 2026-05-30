const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const businessId = crypto.randomUUID();
  const newBusiness = {
    id: businessId,
    name: "My Business",
    owner_name: "Owner",
    mobile: "1234567890",
    email: "test@test.com",
    logo_url: null,
    gstin: "",
    pan: "",
    address: "",
    state: "",
    pincode: "",
    invoice_prefix: "INV",
    tax_type: "regular",
    bank_name: "",
    account_number: "",
    ifsc: "",
    upi_id: "",
    admin_pin: "1234",
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.rpc('create_business_with_owner', {
    business_data: newBusiness,
    owner_user_id: 'd4ad42e1-bbcb-4147-9fae-3a512c60823b' // The real user ID
  });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Success:", data);
  }
}

test();
