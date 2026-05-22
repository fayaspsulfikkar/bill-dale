import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Barcode, Printer, HelpCircle, Check, AlertTriangle, AlertCircle, 
  RefreshCw, Power, PowerOff, Sparkles, Sliders, ChevronDown
} from "lucide-react";
import { useDeviceStore } from "@/store/deviceStore";
import { 
  isSerialSupported, pairPrinter, getPairedPorts, 
  connectPrinter, disconnectPrinter, printTestPage 
} from "@/lib/devices/thermalPrinter";
import { initScannerDetector } from "@/lib/devices/scannerDetector";
import { motion, AnimatePresence } from "framer-motion";

function ToggleRow({ 
  label, 
  desc, 
  value, 
  onChange, 
  disabled = false 
}: { 
  label: string; 
  desc: string; 
  value: boolean; 
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${disabled ? "opacity-50" : ""}`}>
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button 
        disabled={disabled}
        onClick={onChange} 
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-primary" : "bg-muted"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function ChipSelect<T extends string | number>({ 
  value, 
  options, 
  onChange,
  disabled = false
}: { 
  value: T; 
  options: { label: string; value: T }[]; 
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {options.map(o => (
        <button
          key={String(o.value)}
          disabled={disabled}
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

export default function DevicesTab() {
  const { scanner, thermal, a4, updateScanner, updateThermal, updateA4 } = useDeviceStore();
  
  const [serialSupported, setSerialSupported] = useState(false);
  const [pairedPorts, setPairedPorts] = useState<any[]>([]);
  const [activePortInfo, setActivePortInfo] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  
  // Scanner test mode highlights
  const [isScannerTesting, setIsScannerTesting] = useState(false);

  // Check browser support
  useEffect(() => {
    setSerialSupported(isSerialSupported());
    if (isSerialSupported()) {
      refreshPorts();
    }
  }, []);

  // Keyboard wedge scanner live emulator
  useEffect(() => {
    if (scanner.scanner_mode === 'keyboard') {
      const cleanup = initScannerDetector((barcode) => {
        setScannedBarcodes(prev => [barcode, ...prev].slice(0, 5));
        // Add beautiful quick flash
        setIsScannerTesting(true);
        const timer = setTimeout(() => setIsScannerTesting(false), 200);
        return () => clearTimeout(timer);
      }, {
        scanner_suffix: scanner.scanner_suffix,
        scanner_min_speed_ms: scanner.scanner_min_speed_ms,
        scanner_prefix: scanner.scanner_prefix,
      });
      return cleanup;
    }
  }, [scanner.scanner_mode, scanner.scanner_suffix, scanner.scanner_min_speed_ms, scanner.scanner_prefix]);

  const refreshPorts = async () => {
    const ports = await getPairedPorts();
    setPairedPorts(ports);
  };

  const handlePairPrinter = async () => {
    setErrorMessage(null);
    try {
      const port = await pairPrinter();
      await refreshPorts();
      // Auto connect to newly paired port
      await handleConnectPrinter(port);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to pair serial port.");
    }
  };

  const handleConnectPrinter = async (port: any) => {
    setErrorMessage(null);
    setIsConnecting(true);
    try {
      await connectPrinter(port, thermal.thermal_baud_rate);
      setIsConnected(true);
      // Storing port information display
      const info = port.getInfo();
      const portStr = info.usbVendorId ? `USB Device (VID: ${info.usbVendorId}, PID: ${info.usbProductId})` : "Serial Port";
      setActivePortInfo(portStr);
      updateThermal({ thermal_serial_port_info: portStr });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect to printer.");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await disconnectPrinter();
    setIsConnected(false);
    setActivePortInfo(null);
    updateThermal({ thermal_serial_port_info: undefined });
  };

  const handleTestThermalPrint = async () => {
    setErrorMessage(null);
    if (!isConnected) {
      // If direct mode but not connected, warn
      if (thermal.thermal_connection === 'serial') {
        setErrorMessage("Please connect the thermal printer first.");
        return;
      }
      // If browser mode, use native print trigger
      window.print();
      return;
    }

    try {
      await printTestPage(thermal.thermal_paper_width);
    } catch (err: any) {
      setErrorMessage(err.message || "Error printing test page.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      {/* Compatibility warning if not HTTPS or Chrome/Edge */}
      {!serialSupported && (
        <Card className="bg-amber-500/10 border-amber-500/20 text-amber-500">
          <CardContent className="pt-6 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-bold text-sm">Web Serial Not Supported</p>
              <p className="text-xs text-amber-500/80 leading-relaxed mt-1">
                Direct USB / Thermal receipt printing requires a Chromium browser (Chrome, Edge, or Opera) running over an HTTPS connection or localhost. 
                Standard browser printing is still fully functional as a fallback.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {errorMessage && (
        <Card className="bg-red-500/10 border-red-500/20 text-red-400">
          <CardContent className="pt-6 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-bold text-sm">Device Error</p>
              <p className="text-xs text-red-400/80 leading-relaxed mt-1">
                {errorMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. BARCODE SCANNER SECTION */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Barcode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Barcode Scanner</CardTitle>
              <CardDescription className="text-xs">Configure input matching and speeds for retail scanners</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scanner Type / Mode</Label>
              <div className="mt-2">
                <ChipSelect
                  value={scanner.scanner_mode}
                  options={[
                    { label: "Keyboard Wedge (USB HID - Recommended)", value: "keyboard" },
                    { label: "Serial Port (Direct connection)", value: "serial" }
                  ]}
                  onChange={(val) => updateScanner({ scanner_mode: val })}
                />
              </div>
            </div>

            {scanner.scanner_mode === 'keyboard' ? (
              <div className="grid gap-4 md:grid-cols-3 pt-2">
                <div>
                  <Label className="text-xs font-medium">Scan Suffix Key</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">Appended character by scanner</p>
                  <ChipSelect
                    value={scanner.scanner_suffix}
                    options={[
                      { label: "Enter", value: "enter" },
                      { label: "Tab", value: "tab" },
                      { label: "None", value: "none" }
                    ]}
                    onChange={(val) => updateScanner({ scanner_suffix: val })}
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Prefix Character</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">Optional starting symbol (e.g. %)</p>
                  <Input
                    className="max-w-[120px] h-9"
                    value={scanner.scanner_prefix}
                    maxLength={1}
                    placeholder="None"
                    onChange={(e) => updateScanner({ scanner_prefix: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Keystroke Delta Threshold</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">Max ms between keys: {scanner.scanner_min_speed_ms}ms</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="20"
                      max="150"
                      step="5"
                      value={scanner.scanner_min_speed_ms}
                      onChange={(e) => updateScanner({ scanner_min_speed_ms: Number(e.target.value) })}
                      className="w-full accent-primary bg-muted h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 p-4 rounded-xl border border-border/40 text-sm">
                <p className="text-xs text-muted-foreground">
                  Direct serial mode is currently under development. Please utilize Keyboard Wedge (USB HID) which instantly works out-of-the-box by outputting text directly.
                </p>
              </div>
            )}

            {/* LIVE wedge emulator tester */}
            {scanner.scanner_mode === 'keyboard' && (
              <div className={`mt-4 p-4 rounded-2xl border transition-all duration-300 ${
                isScannerTesting 
                  ? "bg-primary/10 border-primary shadow-lg shadow-primary/5" 
                  : "bg-muted/20 border-border/50"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Live Scanner Test Area</span>
                  </div>
                  {scannedBarcodes.length > 0 && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setScannedBarcodes([])}
                      className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2"
                    >
                      Clear Log
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mb-4">
                  Aim your barcode scanner at a product barcode and trigger a scan. The system will capture the Wedge output below:
                </p>

                <div className="min-h-[60px] bg-background/50 border border-border/60 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                  <AnimatePresence>
                    {scannedBarcodes.length === 0 ? (
                      <span className="text-xs text-muted-foreground/60 italic animate-pulse mx-auto">Waiting for hardware scan...</span>
                    ) : (
                      scannedBarcodes.map((barcode, idx) => (
                        <motion.span
                          key={barcode + idx}
                          initial={{ scale: 0.8, opacity: 0, x: -10 }}
                          animate={{ scale: 1, opacity: 1, x: 0 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${
                            idx === 0 
                              ? "bg-primary/20 text-primary border border-primary/30" 
                              : "bg-muted text-muted-foreground border border-border/40"
                          }`}
                        >
                          <Barcode className="w-3.5 h-3.5" />
                          {barcode}
                        </motion.span>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. THERMAL RECEIPT PRINTER SECTION */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Printer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Thermal Receipt Printer</CardTitle>
              <CardDescription className="text-xs">Manage thermal rolls, custom cutting, and page sizes</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => updateThermal({ thermal_enabled: !thermal.thermal_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${thermal.thermal_enabled ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${thermal.thermal_enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className={`space-y-6 ${!thermal.thermal_enabled ? "opacity-40 pointer-events-none" : ""}`}>
            
            {/* Connection method */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connection Protocol</Label>
              <div className="mt-2">
                <ChipSelect
                  value={thermal.thermal_connection}
                  options={[
                    { label: "Browser Print Dialog (System Layout)", value: "browser" },
                    { label: "Direct ESC/POS Connection (Web Serial - Instant)", value: "serial" }
                  ]}
                  onChange={(val) => {
                    if (val === 'serial' && !serialSupported) {
                      setErrorMessage("Direct ESC/POS connection is unsupported in this environment. Standard browser printing is activated.");
                      return;
                    }
                    updateThermal({ thermal_connection: val });
                  }}
                />
              </div>
            </div>

            {/* Direct Web Serial controls */}
            {thermal.thermal_connection === 'serial' && (
              <div className="bg-muted/20 border border-border/60 rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Web Serial Connection Status</p>
                    {isConnected ? (
                      <p className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Connected to: {activePortInfo || "Paired Printer"}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                        Not connected
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isConnected ? (
                      <Button 
                        variant="outline" 
                        onClick={handleDisconnectPrinter}
                        className="h-9 gap-1.5 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <PowerOff className="w-4 h-4" />
                        Disconnect
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={handlePairPrinter}
                          disabled={isConnecting}
                          className="h-9 gap-1.5"
                        >
                          {isConnecting ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                          Pair & Connect Port
                        </Button>
                        
                        {pairedPorts.length > 0 && (
                          <Button
                            variant="ghost"
                            onClick={() => handleConnectPrinter(pairedPorts[0])}
                            className="h-9 text-xs"
                          >
                            Reconnect paired ({pairedPorts.length})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/40">
                  <div>
                    <Label className="text-xs font-medium">Baud Rate (Speed)</Label>
                    <p className="text-[11px] text-muted-foreground mb-2">Should match printer hardware dip-switch settings</p>
                    <ChipSelect
                      value={thermal.thermal_baud_rate}
                      options={[
                        { label: "9600 bps", value: 9600 },
                        { label: "19200 bps", value: 19200 },
                        { label: "38400 bps", value: 38400 },
                        { label: "115200 bps", value: 115200 }
                      ]}
                      onChange={(val) => updateThermal({ thermal_baud_rate: Number(val) })}
                    />
                  </div>

                  <div className="space-y-4">
                    <ToggleRow 
                      label="Paper Auto Cut" 
                      desc="Send cut command after print is finished" 
                      value={thermal.thermal_auto_cut} 
                      onChange={() => updateThermal({ thermal_auto_cut: !thermal.thermal_auto_cut })} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Standard settings */}
            <div className="grid gap-6 pt-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium">Receipt Paper Width</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">Size of the thermal receipt paper roll</p>
                  <ChipSelect
                    value={thermal.thermal_paper_width}
                    options={[
                      { label: "80 mm (Standard)", value: "80mm" },
                      { label: "58 mm (Compact)", value: "58mm" }
                    ]}
                    onChange={(val) => updateThermal({ thermal_paper_width: val })}
                  />
                </div>

                <div className="space-y-4">
                  <ToggleRow
                    label="Auto Print on Sale Completion"
                    desc="Automatically trigger printing when checking out a transaction"
                    value={thermal.thermal_auto_print}
                    onChange={() => updateThermal({ thermal_auto_print: !thermal.thermal_auto_print })}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-border/40 pt-4">
                <Button 
                  onClick={handleTestThermalPrint}
                  variant="outline" 
                  className="h-10 text-xs font-bold gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Test Print Receipt
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 3. A4 DOCUMENT PRINTER SECTION */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Printer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Standard A4 / Document Printer</CardTitle>
              <CardDescription className="text-xs">Configure standard A4 invoicing settings</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => updateA4({ a4_enabled: !a4.a4_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${a4.a4_enabled ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${a4.a4_enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className={`space-y-6 ${!a4.a4_enabled ? "opacity-40 pointer-events-none" : ""}`}>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-xs font-medium">Default Print Copies</Label>
                <p className="text-[11px] text-muted-foreground mb-2">Number of invoice printouts to request</p>
                <ChipSelect
                  value={a4.a4_default_copies}
                  options={[
                    { label: "1 Copy", value: 1 },
                    { label: "2 Copies", value: 2 },
                    { label: "3 Copies", value: 3 }
                  ]}
                  onChange={(val) => updateA4({ a4_default_copies: Number(val) })}
                />
              </div>

              <div>
                <ToggleRow
                  label="Auto Print A4 Invoice on Sale"
                  desc="Automatically summon standard browser print dialog on checkout"
                  value={a4.a4_auto_print}
                  onChange={() => updateA4({ a4_auto_print: !a4.a4_auto_print })}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-border/40 pt-4">
              <Button 
                onClick={() => window.print()}
                variant="outline" 
                className="h-10 text-xs font-bold gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Test Print A4 Page
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
