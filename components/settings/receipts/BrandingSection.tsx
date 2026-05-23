"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Upload, Trash2, Image, QrCode, Camera, Globe, AtSign, Play } from "lucide-react";
import type { ReceiptSettingsSnapshot, LogoPosition } from "./receipt-types";
import { LOGO_POSITION_OPTIONS, LOGO_SIZE_RANGE } from "./receipt-constants";

interface Props {
  form: ReceiptSettingsSnapshot;
  u: (patch: Partial<ReceiptSettingsSnapshot>) => void;
}

function ChipSelect<T extends string | number>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            value === o.value
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-primary" : "bg-muted"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

// Lightweight QR code generator using canvas
function generateQRDataURL(data: string, size: number = 120): string {
  // Simple QR-like pattern for preview. In production, you'd use a library.
  // We'll generate a visual placeholder that looks like a QR code.
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";

  // Generate a deterministic pattern based on the data string
  const cellSize = Math.floor(size / 21);
  const offset = Math.floor((size - cellSize * 21) / 2);

  // Position detection patterns (corners)
  const drawFinder = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          ctx.fillRect(offset + (x + i) * cellSize, offset + (y + j) * cellSize, cellSize, cellSize);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // Fill data area with pseudo-random pattern based on input
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }

  for (let row = 0; row < 21; row++) {
    for (let col = 0; col < 21; col++) {
      // Skip finder patterns
      if ((row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8)) continue;
      // Deterministic pseudo-random fill
      const seed = (hash + row * 21 + col) * 2654435761;
      if ((seed >>> 0) % 3 === 0) {
        ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
      }
    }
  }

  return canvas.toDataURL("image/png");
}

export default function BrandingSection({ form, u }: Props) {
  const [uploading, setUploading] = useState(false);
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const [qrPreview, setQrPreview] = useState<string>("");
  const [socialQrPreviews, setSocialQrPreviews] = useState<Record<string, string>>({});

  // Generate QR preview when data changes
  useEffect(() => {
    if (form.receipt_qr_data && form.receipt_show_qr) {
      setQrPreview(generateQRDataURL(form.receipt_qr_data));
    } else {
      setQrPreview("");
    }
  }, [form.receipt_qr_data, form.receipt_show_qr]);

  // Generate social QR previews
  useEffect(() => {
    if (!form.receipt_show_social_qr) { setSocialQrPreviews({}); return; }
    const previews: Record<string, string> = {};
    if (form.receipt_social_instagram) previews.instagram = generateQRDataURL(form.receipt_social_instagram, 80);
    if (form.receipt_social_facebook) previews.facebook = generateQRDataURL(form.receipt_social_facebook, 80);
    if (form.receipt_social_twitter) previews.twitter = generateQRDataURL(form.receipt_social_twitter, 80);
    if (form.receipt_social_youtube) previews.youtube = generateQRDataURL(form.receipt_social_youtube, 80);
    setSocialQrPreviews(previews);
  }, [form.receipt_social_instagram, form.receipt_social_facebook, form.receipt_social_twitter, form.receipt_social_youtube, form.receipt_show_social_qr]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, field: 'receipt_logo_url' | 'receipt_watermark_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("Image must be less than 1MB"); return; }

    const setter = field === 'receipt_logo_url' ? setUploading : setWatermarkUploading;
    setter(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) u({ [field]: ev.target.result as string } as any);
      setter(false);
    };
    reader.onerror = () => { alert("Failed to read file"); setter(false); };
    reader.readAsDataURL(file);
  }, [u]);

  return (
    <div className="space-y-4">
      {/* Logo Card */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="w-4 h-4 text-primary" /> Logo
          </CardTitle>
          <CardDescription>Upload and position your logo on the receipt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-4">
            {form.receipt_logo_url ? (
              <img src={form.receipt_logo_url} alt="Logo" className="w-20 h-20 rounded-xl object-contain border border-border bg-white p-1" />
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                <Upload className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer text-sm text-primary hover:underline font-medium inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading…" : form.receipt_logo_url ? "Change Logo" : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'receipt_logo_url')} disabled={uploading} />
              </label>
              {form.receipt_logo_url && (
                <button onClick={() => u({ receipt_logo_url: "" })} className="text-xs text-destructive hover:underline inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
              <p className="text-[10px] text-muted-foreground">PNG or JPG, max 1MB. Recommended: square logo.</p>
            </div>
          </div>

          {form.receipt_logo_url && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Logo Position</Label>
                <ChipSelect
                  value={form.receipt_logo_position || "center"}
                  options={LOGO_POSITION_OPTIONS}
                  onChange={(v) => u({ receipt_logo_position: v as LogoPosition })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Logo Size</Label>
                  <span className="text-xs text-muted-foreground font-mono">{form.receipt_logo_size || 60}px</span>
                </div>
                <input
                  type="range"
                  min={LOGO_SIZE_RANGE.min}
                  max={LOGO_SIZE_RANGE.max}
                  step={LOGO_SIZE_RANGE.step}
                  value={form.receipt_logo_size || 60}
                  onChange={(e) => u({ receipt_logo_size: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{LOGO_SIZE_RANGE.min}px</span>
                  <span>{LOGO_SIZE_RANGE.max}px</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Watermark */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="w-4 h-4 text-primary" /> Watermark
          </CardTitle>
          <CardDescription>Optional background watermark image.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {form.receipt_watermark_url ? (
              <img src={form.receipt_watermark_url} alt="Watermark" className="w-12 h-12 rounded-lg object-contain border border-border bg-white opacity-30" />
            ) : (
              <div className="w-12 h-12 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                <Image className="w-4 h-4" />
              </div>
            )}
            <label className="cursor-pointer text-xs text-primary hover:underline font-medium">
              {watermarkUploading ? "Uploading…" : form.receipt_watermark_url ? "Change" : "Upload Watermark"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'receipt_watermark_url')} disabled={watermarkUploading} />
            </label>
            {form.receipt_watermark_url && (
              <button onClick={() => u({ receipt_watermark_url: "" })} className="text-xs text-destructive hover:underline">Remove</button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="w-4 h-4 text-primary" /> QR Code
          </CardTitle>
          <CardDescription>Add a QR code to your receipt for quick access to your website, offers, or payment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Show QR Code"
            desc="Display a QR code at the bottom of the receipt."
            value={form.receipt_show_qr || false}
            onChange={() => u({ receipt_show_qr: !form.receipt_show_qr })}
          />
          {form.receipt_show_qr && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">QR Code Payload Type</Label>
                <ChipSelect
                  value={form.receipt_qr_payload || "none"}
                  options={[
                    { label: "Digital Invoice Link", value: "invoice_link" },
                    { label: "UPI Payment QR", value: "upi_payment" },
                    { label: "Custom Static URL", value: "none" }
                  ]}
                  onChange={(v) => u({ receipt_qr_payload: v as any })}
                />
              </div>
              
              {(!form.receipt_qr_payload || form.receipt_qr_payload === "none") && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-sm">Custom QR URL</Label>
                  <Input
                    value={form.receipt_qr_data || ""}
                    onChange={(e) => u({ receipt_qr_data: e.target.value })}
                    placeholder="https://mystore.com/feedback"
                    className="bg-background/50"
                  />
                </div>
              )}
              {qrPreview && (!form.receipt_qr_payload || form.receipt_qr_payload === "none") && (
                <div className="flex justify-center pt-2">
                  <img src={qrPreview} alt="QR Preview" className="w-24 h-24 border border-border rounded-lg" />
                </div>
              )}
              {form.receipt_qr_payload === "invoice_link" && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
                  The QR code will automatically link to the digital version of the customer's specific invoice.
                </div>
              )}
              {form.receipt_qr_payload === "upi_payment" && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-500">
                  The QR code will contain UPI payment details based on the total invoice amount.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Media QR Codes */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-primary" /> Social Media
          </CardTitle>
          <CardDescription>Add social media links as QR codes on your receipt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Show Social QR Codes"
            desc="Print QR codes linking to your social profiles."
            value={form.receipt_show_social_qr || false}
            onChange={() => u({ receipt_show_social_qr: !form.receipt_show_social_qr })}
          />
          {form.receipt_show_social_qr && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: "receipt_social_instagram" as const, icon: Camera, label: "Instagram", placeholder: "https://instagram.com/yourstore", qr: socialQrPreviews.instagram },
                { key: "receipt_social_facebook" as const, icon: Globe, label: "Facebook", placeholder: "https://facebook.com/yourstore", qr: socialQrPreviews.facebook },
                { key: "receipt_social_twitter" as const, icon: AtSign, label: "Twitter / X", placeholder: "https://x.com/yourstore", qr: socialQrPreviews.twitter },
                { key: "receipt_social_youtube" as const, icon: Play, label: "YouTube", placeholder: "https://youtube.com/@yourstore", qr: socialQrPreviews.youtube },
              ].map(({ key, icon: Icon, label, placeholder, qr }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </Label>
                  <Input
                    value={(form[key] as string) || ""}
                    onChange={(e) => u({ [key]: e.target.value } as any)}
                    placeholder={placeholder}
                    className="bg-background/50 text-sm"
                  />
                  {qr && (
                    <div className="flex justify-center pt-1">
                      <img src={qr} alt={`${label} QR`} className="w-16 h-16 border border-border/50 rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Color */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-primary" /> Brand Color
          </CardTitle>
          <CardDescription>Set an accent color for the receipt preview.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.receipt_brand_color || "#000000"}
              onChange={(e) => u({ receipt_brand_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium font-mono">{form.receipt_brand_color || "#000000"}</p>
              <p className="text-xs text-muted-foreground">Used as accent in the receipt preview</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
