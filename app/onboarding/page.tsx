"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Store, MapPin, Users, Building2, CheckCircle2, Upload, X, Shield, Eye, EyeOff, Plus, Trash2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activityLogger";
import Image from "next/image";

const STEPS = [
  { id: 1, name: "Identity", icon: Store },
  { id: 2, name: "Location", icon: MapPin },
  { id: 3, name: "Team & Security", icon: Users },
  { id: 4, name: "Tax & Bank", icon: Building2 },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, setOnboardingComplete } = useAuthStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Identity
    shopName: "", ownerName: "", mobile: "", email: "", businessType: "retail",
    logoFile: null as File | null, logoPreview: "",
    
    // Step 2: Location
    branchName: "Main Store", address: "", city: "", state: "", pincode: "",
    
    // Step 3: Team & Security
    staff: [] as { name: string, roleTitle: string, phone: string }[],
    adminPin: "", confirmPin: "",
    
    // Step 4: Tax & Financials
    gstin: "", pan: "", invoicePrefix: "INV", bankName: "", accountNumber: "", ifsc: "", upiId: ""
  });

  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const updateForm = (updates: Partial<typeof form>) => setForm(f => ({ ...f, ...updates }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateForm({ logoFile: file, logoPreview: URL.createObjectURL(file) });
    }
  };

  const addStaff = () => {
    updateForm({ staff: [...form.staff, { name: "", roleTitle: "Cashier", phone: "" }] });
  };
  
  const removeStaff = (index: number) => {
    updateForm({ staff: form.staff.filter((_, i) => i !== index) });
  };

  const updateStaff = (index: number, field: string, value: string) => {
    const newStaff = [...form.staff];
    newStaff[index] = { ...newStaff[index], [field]: value };
    updateForm({ staff: newStaff });
  };

  const handleNext = () => {
    if (step === 3) {
      if (form.adminPin.length !== 4) return setPinError("PIN must be 4 digits");
      if (form.adminPin !== form.confirmPin) return setPinError("PINs do not match");
      setPinError("");
    }
    setStep(s => Math.min(s + 1, 5));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const submitWizard = async () => {
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const businessId = crypto.randomUUID();
      
      let logoUrl = null;
      if (form.logoFile) {
        const fileExt = form.logoFile.name.split('.').pop();
        const fileName = `${businessId}-logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, form.logoFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      // 1. Create Business
      const newBusiness = {
        id: businessId,
        name: form.shopName || "My Business",
        owner_name: form.ownerName,
        mobile: form.mobile,
        email: form.email,
        logo_url: logoUrl,
        gstin: form.gstin,
        pan: form.pan,
        address: form.address,
        state: form.state,
        pincode: form.pincode,
        invoice_prefix: form.invoicePrefix || "INV",
        tax_type: "regular",
        bank_name: form.bankName,
        account_number: form.accountNumber,
        ifsc: form.ifsc,
        upi_id: form.upiId,
        admin_pin: form.adminPin,
        created_at: new Date().toISOString(),
      };
      await supabase.from("businesses").insert(newBusiness);

      // 2. Add Owner as Business Member
      await supabase.from("business_members").insert({
        business_id: businessId, user_id: user.id, role: "admin", permissions: []
      });

      // 3. Create First Branch
      await supabase.from("branches").insert({
        business_id: businessId,
        name: form.branchName || "Main Store",
        location: form.address,
        is_active: true
      });

      // 4. Create Staff Members
      if (form.staff.length > 0) {
        const staffInserts = form.staff.map(s => ({
          business_id: businessId,
          name: s.name,
          phone: s.phone,
          role_title: s.roleTitle,
          is_active: true
        }));
        await supabase.from("staff_members").insert(staffInserts);
      }

      setOnboardingComplete(businessId, newBusiness.name);
      await logActivity(businessId, user.id, "business_created", { name: newBusiness.name });

      setStep(5); // Success step
      setTimeout(() => router.push("/dashboard"), 2000);

    } catch (err) {
      console.error(err);
      alert("Failed to save setup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Step Progress Bar */}
      {step < 5 && (
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step >= s.id;
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-100 text-slate-400 border-2 border-slate-200'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-semibold ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{s.name}</span>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        
        {/* STEP 1: IDENTITY */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Business Identity</h2>
            <p className="text-slate-500 mb-6">Let's start with the basics of your business.</p>

            <div className="space-y-5">
              <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer">
                  <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${form.logoPreview ? 'border-blue-500' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`}>
                    {form.logoPreview ? (
                      <Image src={form.logoPreview} alt="Logo" fill className="object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Upload Logo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Shop / Business Name <span className="text-red-500">*</span></Label>
                  <Input autoFocus value={form.shopName} onChange={e => updateForm({ shopName: e.target.value })} placeholder="e.g. Sole Street Sneakers" className="bg-slate-50 h-11" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Full Name <span className="text-red-500">*</span></Label>
                  <Input value={form.ownerName} onChange={e => updateForm({ ownerName: e.target.value })} placeholder="Jane Doe" className="bg-slate-50 h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <select value={form.businessType} onChange={e => updateForm({ businessType: e.target.value })} className="w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none">
                    <option value="retail">Retail Store</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="service">Service</option>
                    <option value="restaurant">Restaurant / Cafe</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mobile Number <span className="text-red-500">*</span></Label>
                  <Input type="tel" value={form.mobile} onChange={e => updateForm({ mobile: e.target.value })} placeholder="+91 9876543210" className="bg-slate-50 h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Business Email</Label>
                  <Input type="email" value={form.email} onChange={e => updateForm({ email: e.target.value })} placeholder="shop@email.com" className="bg-slate-50 h-11" />
                </div>
              </div>

              <Button onClick={handleNext} disabled={!form.shopName || !form.ownerName || !form.mobile} className="w-full h-12 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-base">
                Continue to Location
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: LOCATION */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Store Location</h2>
            <p className="text-slate-500 mb-6">Setup your primary branch and address details.</p>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Primary Branch Name <span className="text-red-500">*</span></Label>
                <Input autoFocus value={form.branchName} onChange={e => updateForm({ branchName: e.target.value })} placeholder="e.g. Downtown Main Store" className="bg-slate-50 h-11" />
              </div>

              <div className="space-y-2">
                <Label>Full Address</Label>
                <Input value={form.address} onChange={e => updateForm({ address: e.target.value })} placeholder="123 Market Street, Shop #4" className="bg-slate-50 h-11" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => updateForm({ city: e.target.value })} placeholder="Mumbai" className="bg-slate-50 h-11" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => updateForm({ state: e.target.value })} placeholder="Maharashtra" className="bg-slate-50 h-11" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={e => updateForm({ pincode: e.target.value })} placeholder="400001" className="bg-slate-50 h-11" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-12 rounded-xl text-slate-600">Back</Button>
                <Button onClick={handleNext} disabled={!form.branchName} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">Continue to Security</Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: TEAM & SECURITY */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Team & Security</h2>
            <p className="text-slate-500 mb-6">Lock your dashboard and add initial staff profiles.</p>

            <div className="space-y-6">
              {/* PIN SETUP */}
              <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-tight">Admin Dashboard PIN</h3>
                    <p className="text-xs text-slate-500">Required to unlock reports, settings, and sensitive data.</p>
                  </div>
                </div>

                {pinError && <p className="text-red-500 text-sm font-semibold mb-3">{pinError}</p>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Label className="text-xs text-slate-600 mb-1 block">4-Digit PIN <span className="text-red-500">*</span></Label>
                    <input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={4} value={form.adminPin} onChange={e => { updateForm({ adminPin: e.target.value.replace(/\D/g, "") }); setPinError(""); }} className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-xl font-mono tracking-widest text-center focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                    <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-700">
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Label className="text-xs text-slate-600 mb-1 block">Confirm PIN <span className="text-red-500">*</span></Label>
                    <input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={4} value={form.confirmPin} onChange={e => { updateForm({ confirmPin: e.target.value.replace(/\D/g, "") }); setPinError(""); }} className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-xl font-mono tracking-widest text-center focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* STAFF PROFILES */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">Initial Staff Members <span className="text-slate-400 font-normal text-sm">(Optional)</span></h3>
                  <Button variant="ghost" size="sm" onClick={addStaff} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Plus className="w-4 h-4 mr-1" /> Add Staff
                  </Button>
                </div>
                
                {form.staff.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <p className="text-sm text-slate-500">No staff added yet. You can add them later.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.staff.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                        <Input value={s.name} onChange={e => updateStaff(idx, 'name', e.target.value)} placeholder="Name" className="h-9 bg-white" />
                        <Input value={s.roleTitle} onChange={e => updateStaff(idx, 'roleTitle', e.target.value)} placeholder="Role (e.g. Cashier)" className="h-9 bg-white" />
                        <button type="button" onClick={() => removeStaff(idx)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack} className="flex-1 h-12 rounded-xl text-slate-600">Back</Button>
                <Button onClick={handleNext} disabled={form.adminPin.length !== 4 || form.confirmPin.length !== 4} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">Continue to Financials</Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: TAX & FINANCIALS */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Tax & Banking</h2>
                <p className="text-slate-500">Add details for professional invoices. <span className="font-semibold text-blue-600">Completely optional.</span></p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GSTIN Number</Label>
                  <Input value={form.gstin} onChange={e => updateForm({ gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" className="bg-slate-50 h-11 uppercase" />
                </div>
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input value={form.pan} onChange={e => updateForm({ pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" className="bg-slate-50 h-11 uppercase" />
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-4">
                <h3 className="font-semibold text-slate-800 text-sm">Bank Details (For Receipts)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input value={form.bankName} onChange={e => updateForm({ bankName: e.target.value })} placeholder="HDFC Bank" className="bg-slate-50 h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>UPI ID</Label>
                    <Input value={form.upiId} onChange={e => updateForm({ upiId: e.target.value })} placeholder="shop@upi" className="bg-slate-50 h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input type="text" inputMode="numeric" value={form.accountNumber} onChange={e => updateForm({ accountNumber: e.target.value })} placeholder="XXXX XXXX" className="bg-slate-50 h-11 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input value={form.ifsc} onChange={e => updateForm({ ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" className="bg-slate-50 h-11 font-mono uppercase" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack} disabled={saving} className="flex-1 h-12 rounded-xl text-slate-600">Back</Button>
                <Button onClick={submitWizard} disabled={saving} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl relative overflow-hidden group">
                  {saving ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Saving...</span>
                  ) : (
                    "Complete Setup ✨"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 5: SUCCESS */}
        {step === 5 && (
          <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 rounded-2xl p-12 shadow-xl text-center">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1, rotate: 360 }} 
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </motion.div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">You're all set!</h2>
            <p className="text-slate-500 mb-8">Your business profile has been created successfully.</p>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
