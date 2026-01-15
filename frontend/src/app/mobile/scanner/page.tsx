'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  Check,
  X,
  Plus,
  Minus,
  Camera,
  History,
  Trash2,
  Smartphone,
  Wifi,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Simple barcode parser
function parseBarcode(barcode: string) {
  if (barcode.startsWith('SPC')) {
    const productId = parseInt(barcode.slice(3), 10);
    return { type: 'product', productId, barcode };
  }
  return { type: 'unknown', barcode };
}

export default function MobileScannerPage() {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handleScanRef = useRef<((barcode: string) => Promise<void>) | null>(null);
  
  const [scanMode, setScanMode] = useState<'scan_in' | 'scan_out'>('scan_in');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [undoingIndex, setUndoingIndex] = useState<number | null>(null);

  // Load BarcodeDetector API (available in modern mobile browsers)
  const [barcodeDetector, setBarcodeDetector] = useState<any>(null);

  useEffect(() => {
    // Check if BarcodeDetector API is available
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      const detector = new window.BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
      });
      setBarcodeDetector(detector);
    }
  }, []);

  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing || !barcode.trim()) return;
    
    // Prevent duplicate scans - check if same code was scanned recently
    if (barcode === lastScannedCode) return;
    setLastScannedCode(barcode);
    
    // Reset duplicate prevention after 5 seconds (longer delay to prevent re-scans)
    setTimeout(() => setLastScannedCode(null), 5000);
    
    setIsProcessing(true);
    
    // Vibrate on scan (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    try {
      const parsed = parseBarcode(barcode);
      
      const result = await api.scanInventory({
        barcode: barcode,
        product_id: parsed.productId,
        action: scanMode,
        quantity: 1,
        device_type: 'mobile',
      });
      
      setLastScan(result);
      setScanHistory(prev => [result, ...prev.slice(0, 19)]);
      
      // Vibrate success pattern
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      toast({
        title: scanMode === 'scan_in' ? '✅ Stock Added!' : '📦 Stock Removed!',
        description: `${result.product_name}: ${result.previous_quantity} → ${result.new_quantity}`,
        variant: 'success',
      });
    } catch (error: any) {
      // Vibrate error pattern
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      toast({
        title: '❌ Scan Failed',
        description: error.response?.data?.detail || 'Product not found',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [scanMode, isProcessing, lastScannedCode]);

  // Keep ref updated with latest handleScan
  useEffect(() => {
    handleScanRef.current = handleScan;
  }, [handleScan]);

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        
        // Start scanning loop if BarcodeDetector is available
        if (barcodeDetector) {
          startScanning();
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.message || 'Failed to access camera. Please allow camera permission.');
    }
  }, [barcodeDetector]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Scanning loop using BarcodeDetector API
  // Uses ref to always get the latest handleScan (which includes current scanMode)
  const startScanning = useCallback(() => {
    if (!barcodeDetector || !videoRef.current) return;
    
    // Clear existing interval first
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    let lastDetectedCode: string | null = null;
    
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      
      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code && code !== lastDetectedCode && handleScanRef.current) {
            lastDetectedCode = code;
            // Reset after 5 seconds
            setTimeout(() => { lastDetectedCode = null; }, 5000);
            handleScanRef.current(code);
          }
        }
      } catch (err) {
        // Ignore detection errors
      }
    }, 500); // Scan every 500ms (slower to prevent multiple scans)
  }, [barcodeDetector]);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Restart scanning when barcodeDetector becomes available
  useEffect(() => {
    if (barcodeDetector && cameraActive && !scanIntervalRef.current) {
      startScanning();
    }
  }, [barcodeDetector, cameraActive, startScanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim());
      setManualBarcode('');
    }
  };
  
  // Undo a scan (reverse the inventory change)
  const handleUndoScan = async (scan: any, index: number) => {
    setUndoingIndex(index);
    
    // Vibrate
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    try {
      // Reverse the action
      const reverseAction = scan.change > 0 ? 'scan_out' : 'scan_in';
      
      await api.scanInventory({
        product_id: scan.product_id,
        action: reverseAction,
        quantity: Math.abs(scan.change),
        reason: 'Undo scan',
        device_type: 'mobile',
      });
      
      // Remove from history
      setScanHistory(prev => prev.filter((_, i) => i !== index));
      
      // Clear last scan if it's the same
      if (lastScan?.product_id === scan.product_id) {
        setLastScan(null);
      }
      
      // Vibrate success
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
      
      toast({
        title: '↩️ Undone',
        description: `${scan.product_name}: Reversed`,
        variant: 'success',
      });
    } catch (error: any) {
      // Vibrate error
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      toast({
        title: 'Undo Failed',
        description: error.response?.data?.detail || 'Failed to undo',
        variant: 'destructive',
      });
    } finally {
      setUndoingIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Mobile Scanner</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Camera View */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden max-h-[250px]">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive" />
                <p className="text-destructive font-medium mb-2">Camera Error</p>
                <p className="text-sm text-muted-foreground mb-4">{cameraError}</p>
                <Button onClick={startCamera} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] h-16 border-2 border-primary rounded-lg relative">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-primary rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-primary rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-primary rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-primary rounded-br" />
                  
                  {/* Animated scan line */}
                  <motion.div
                    className="absolute left-2 right-2 h-0.5 bg-primary"
                    animate={{ top: ['20%', '80%', '20%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
              
              {/* Processing indicator */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              
              {/* Instructions */}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-center text-xs bg-black/60 px-3 py-1.5 rounded-full">
                  Point camera at barcode
                </p>
              </div>
            </>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            className={cn(
              "h-12",
              scanMode === 'scan_in' && "bg-green-600 hover:bg-green-700"
            )}
            variant={scanMode === 'scan_in' ? 'default' : 'outline'}
            onClick={() => setScanMode('scan_in')}
          >
            <Plus className="w-5 h-5 mr-1" />
            Add (+1)
          </Button>
          <Button
            className={cn(
              "h-12",
              scanMode === 'scan_out' && "bg-red-600 hover:bg-red-700"
            )}
            variant={scanMode === 'scan_out' ? 'default' : 'outline'}
            onClick={() => setScanMode('scan_out')}
          >
            <Minus className="w-5 h-5 mr-1" />
            Remove (-1)
          </Button>
        </div>

        {/* Manual Entry Toggle */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowManual(!showManual)}
        >
          {showManual ? 'Hide' : 'Show'} Manual Entry
        </Button>

        {/* Manual Entry */}
        <AnimatePresence>
          {showManual && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleManualSubmit}
              className="space-y-3 overflow-hidden"
            >
              <Input
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Type barcode number..."
                className="h-12 text-lg font-mono"
              />
              <Button type="submit" className="w-full h-12" disabled={!manualBarcode.trim() || isProcessing}>
                Process Scan
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Last Scan Result */}
        <AnimatePresence>
          {lastScan && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={cn(
                "p-4 rounded-2xl border-2",
                lastScan.change > 0 ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  lastScan.change > 0 ? "bg-green-500" : "bg-red-500"
                )}>
                  {lastScan.change > 0 ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <Minus className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{lastScan.product_name}</p>
                  <p className="text-xs text-muted-foreground">{lastScan.product_sku}</p>
                </div>
                <button onClick={() => setLastScan(null)} className="p-1.5 shrink-0">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {/* Quick +/- Adjustment */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 rounded-full border-2 border-red-500/50 hover:bg-red-500/20 hover:border-red-500"
                  onClick={async () => {
                    if (lastScan.new_quantity <= 0) {
                      if (navigator.vibrate) navigator.vibrate(200);
                      toast({ title: 'Cannot remove - stock is 0', variant: 'destructive' });
                      return;
                    }
                    if (navigator.vibrate) navigator.vibrate(50);
                    try {
                      const result = await api.scanInventory({
                        product_id: lastScan.product_id,
                        action: 'scan_out',
                        quantity: 1,
                        device_type: 'mobile',
                      });
                      setLastScan(result);
                      setScanHistory(prev => [result, ...prev.slice(0, 19)]);
                      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                      toast({ title: '📦 Removed (-1)', variant: 'success' });
                    } catch (error: any) {
                      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                      toast({ title: 'Failed', variant: 'destructive' });
                    }
                  }}
                  disabled={isProcessing || lastScan.new_quantity <= 0}
                >
                  <Minus className="w-6 h-6 text-red-500" />
                </Button>
                <div className="text-center">
                  <p className="text-3xl font-bold">{lastScan.new_quantity}</p>
                  <p className="text-xs text-muted-foreground">in stock</p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 rounded-full border-2 border-green-500/50 hover:bg-green-500/20 hover:border-green-500"
                  onClick={async () => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    try {
                      const result = await api.scanInventory({
                        product_id: lastScan.product_id,
                        action: 'scan_in',
                        quantity: 1,
                        device_type: 'mobile',
                      });
                      setLastScan(result);
                      setScanHistory(prev => [result, ...prev.slice(0, 19)]);
                      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                      toast({ title: '✅ Added (+1)', variant: 'success' });
                    } catch (error: any) {
                      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                      toast({ title: 'Failed', variant: 'destructive' });
                    }
                  }}
                  disabled={isProcessing}
                >
                  <Plus className="w-6 h-6 text-green-500" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <History className="w-4 h-4" />
                Scans ({scanHistory.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setScanHistory([])}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tap ✕ to undo wrong scans
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {scanHistory.map((scan, index) => (
                  <motion.div 
                    key={`${scan.product_id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      scan.change > 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    )}>
                      {scan.change > 0 ? '+' : ''}{scan.change}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{scan.product_name}</p>
                      <p className="text-xs text-muted-foreground">Stock: {scan.new_quantity}</p>
                    </div>
                    <button
                      onClick={() => handleUndoScan(scan, index)}
                      disabled={undoingIndex === index}
                      className={cn(
                        "p-2 rounded-full bg-destructive/10 text-destructive active:bg-destructive/30 transition-colors shrink-0",
                        undoingIndex === index && "opacity-50"
                      )}
                    >
                      {undoingIndex === index ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!barcodeDetector && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm">
            <p className="font-medium text-yellow-600 mb-1">⚠️ Limited Browser Support</p>
            <p className="text-muted-foreground">
              Your browser doesn't support automatic barcode detection. 
              Please use the manual entry option or try Chrome/Edge on Android.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
