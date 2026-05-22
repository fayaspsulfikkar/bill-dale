interface ScannerOptions {
  scanner_suffix: 'enter' | 'tab' | 'none';
  scanner_min_speed_ms: number;
  scanner_prefix: string;
}

let buffer: string[] = [];
let lastKeyTime = 0;
let timeoutId: any = null;

export function initScannerDetector(
  onScan: (barcode: string) => void,
  options: ScannerOptions
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
      return;
    }

    const currentTime = Date.now();
    const minSpeed = options.scanner_min_speed_ms || 50;

    // Reset buffer if delay since last keystroke is too long
    if (currentTime - lastKeyTime > minSpeed) {
      buffer = [];
    }

    lastKeyTime = currentTime;

    // Optional prefix detection
    if (options.scanner_prefix && e.key === options.scanner_prefix) {
      buffer = [];
      e.preventDefault();
      return;
    }

    // Check suffix match
    const isEnter = e.key === 'Enter' && options.scanner_suffix === 'enter';
    const isTab = e.key === 'Tab' && options.scanner_suffix === 'tab';

    if (isEnter || isTab) {
      if (buffer.length >= 2) {
        e.preventDefault();
        e.stopPropagation();
        const barcode = buffer.join('');
        buffer = [];
        onScan(barcode);
      }
      return;
    }

    // Only buffer single character inputs (alphanumeric, etc.)
    if (e.key.length === 1) {
      buffer.push(e.key);
    }

    // Fallback if no suffix is specified
    if (timeoutId) clearTimeout(timeoutId);
    
    if (options.scanner_suffix === 'none') {
      timeoutId = setTimeout(() => {
        if (buffer.length >= 2) {
          const barcode = buffer.join('');
          buffer = [];
          onScan(barcode);
        }
      }, minSpeed + 15);
    }
  };

  // Add capture: true to intercept before other handlers
  window.addEventListener('keydown', handleKeyDown, true);

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    if (timeoutId) clearTimeout(timeoutId);
  };
}
