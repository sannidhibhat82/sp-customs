'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import {
  Scan,
  Check,
  X,
  Plus,
  Minus,
  History,
  Trash2,
  Barcode,
  Smartphone,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScanStore } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Simple barcode parser
function parseBarcode(barcode: string) {
  // SP Customs barcode format: SPC + 9 digit product ID
  if (barcode.startsWith('SPC')) {
    const productId = parseInt(barcode.slice(3), 10);
    return { type: 'product', productId, barcode };
  }
  // Unknown format
  return { type: 'unknown', barcode };
}

export default function AdminScannerPage() {
  const queryClient = useQueryClient();
  const [scanMode, setScanMode] = useState<'scan_in' | 'scan_out'>('scan_in');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showMobileQR, setShowMobileQR] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { scanHistory, addToHistory, clearHistory, removeFromHistory } = useScanStore();
  const [undoingIndex, setUndoingIndex] = useState<number | null>(null);
  
  const mobileUrl = typeof window !== 'undefined' ? `${window.location.origin}/mobile/scanner` : '';
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copied!', variant: 'success' });
  };
  
  // Undo a scan (reverse the inventory change)
  const handleUndoScan = async (scan: any, index: number) => {
    setUndoingIndex(index);
    try {
      // Reverse the action
      const reverseAction = scan.change > 0 ? 'scan_out' : 'scan_in';
      
      await api.scanInventory({
        product_id: scan.product_id,
        action: reverseAction,
        quantity: Math.abs(scan.change),
        reason: 'Undo scan',
        device_type: 'desktop',
      });
      
      // Remove from history
      removeFromHistory(index);
      
      // Clear last scan if it's the same
      if (lastScan?.product_id === scan.product_id) {
        setLastScan(null);
      }
      
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      
      toast({
        title: '↩️ Scan Undone',
        description: `${scan.product_name}: Reversed ${scan.change > 0 ? '+' : ''}${scan.change}`,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Undo Failed',
        description: error.response?.data?.detail || 'Failed to undo scan',
        variant: 'destructive',
      });
    } finally {
      setUndoingIndex(null);
    }
  };
  
  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing || !barcode.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const parsed = parseBarcode(barcode);
      
      const result = await api.scanInventory({
        barcode: barcode,
        product_id: parsed.productId,
        action: scanMode,
        quantity: 1,
        device_type: 'desktop',
      });
      
      setLastScan(result);
      addToHistory(result);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      
      toast({
        title: scanMode === 'scan_in' ? 'Stock Added!' : 'Stock Removed!',
        description: `${result.product_name}: ${result.previous_quantity} → ${result.new_quantity}`,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Scan Failed',
        description: error.response?.data?.detail || 'Product not found',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [scanMode, isProcessing, addToHistory, queryClient]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Barcode className="w-8 h-8" />
            Barcode Scanner
          </h1>
          <p className="text-muted-foreground">
            Scan barcodes to update inventory
          </p>
        </div>
        <Button
          variant={showMobileQR ? 'default' : 'outline'}
          onClick={() => setShowMobileQR(!showMobileQR)}
        >
          <Smartphone className="w-4 h-4 mr-2" />
          {showMobileQR ? 'Hide' : 'Use'} Mobile Scanner
        </Button>
      </div>

      {/* Mobile Scanner QR */}
      <AnimatePresence>
        {showMobileQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCode value={mobileUrl} size={150} level="H" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold flex items-center gap-2 justify-center md:justify-start">
                      <Smartphone className="w-5 h-5 text-primary" />
                      Mobile Scanner
                    </h3>
                    <p className="text-muted-foreground mt-2 mb-4">
                      Scan this QR code with your phone to open the mobile scanner.
                      Use your phone's camera to scan product barcodes directly!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                        <code className="text-sm truncate flex-1">{mobileUrl}</code>
                        <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button variant="outline" asChild>
                        <a href={mobileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      💡 Tip: Make sure your phone is on the same WiFi network as this computer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scanner Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" />
                Scan Barcode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Enter or Scan Barcode</label>
                  <Input
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Type or scan barcode (e.g., SPC000000001)..."
                    autoFocus
                    className="text-lg font-mono h-14"
                  />
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg text-sm space-y-2">
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <span className="text-lg">💡</span> How to use:
                  </p>
                  <ul className="space-y-1 text-muted-foreground ml-6">
                    <li>• <strong>USB/Bluetooth Scanner:</strong> Click in the input field and scan - the barcode auto-types</li>
                    <li>• <strong>Manual Entry:</strong> Type the barcode number shown below the barcode on the product label</li>
                  </ul>
                </div>
                <Button type="submit" disabled={!manualBarcode.trim() || isProcessing} className="w-full h-12 text-lg">
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : (
                    <Scan className="w-5 h-5 mr-2" />
                  )}
                  Process Scan
                </Button>
              </form>

              {/* Mode Toggle */}
              <div className="flex gap-2 mt-6">
                <Button
                  className={cn(
                    "flex-1 h-12",
                    scanMode === 'scan_in' && "bg-green-600 hover:bg-green-700"
                  )}
                  variant={scanMode === 'scan_in' ? 'default' : 'outline'}
                  onClick={() => setScanMode('scan_in')}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Stock (+1)
                </Button>
                <Button
                  className={cn(
                    "flex-1 h-12",
                    scanMode === 'scan_out' && "bg-red-600 hover:bg-red-700"
                  )}
                  variant={scanMode === 'scan_out' ? 'default' : 'outline'}
                  onClick={() => setScanMode('scan_out')}
                >
                  <Minus className="w-5 h-5 mr-2" />
                  Remove Stock (-1)
                </Button>
              </div>

              {/* Last Scan Result */}
              <AnimatePresence>
                {lastScan && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mt-6"
                  >
                    <Card className={cn(
                      "border-2",
                      lastScan.change > 0 ? "border-green-500" : "border-red-500"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center",
                            lastScan.change > 0 ? "bg-green-500/20" : "bg-red-500/20"
                          )}>
                            {lastScan.change > 0 ? (
                              <Check className="w-7 h-7 text-green-500" />
                            ) : (
                              <Minus className="w-7 h-7 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-lg">{lastScan.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {lastScan.product_sku}
                            </p>
                            <p className="text-base mt-1">
                              {lastScan.previous_quantity} → {lastScan.new_quantity}
                              <span className={cn(
                                "ml-2 font-bold",
                                lastScan.change > 0 ? "text-green-500" : "text-red-500"
                              )}>
                                ({lastScan.change > 0 ? '+' : ''}{lastScan.change})
                              </span>
                            </p>
                          </div>
                          <button onClick={() => setLastScan(null)} className="p-2 hover:bg-secondary rounded-lg">
                            <X className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* History Section */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Scan History
                </CardTitle>
                {scanHistory.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Scan className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No scans yet</p>
                  <p className="text-sm">Scan a barcode to get started</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">
                    Click ✕ to undo a scan
                  </p>
                  {scanHistory.map((scan: any, index: number) => (
                    <motion.div 
                      key={`${scan.product_id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg group hover:bg-secondary/70 transition-colors"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        scan.change > 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {scan.change > 0 ? '+' : ''}{scan.change}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{scan.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {scan.product_sku} • Stock: {scan.new_quantity}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUndoScan(scan, index)}
                        disabled={undoingIndex === index}
                        className={cn(
                          "p-1.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0",
                          undoingIndex === index && "opacity-50"
                        )}
                        title="Undo this scan"
                      >
                        {undoingIndex === index ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
