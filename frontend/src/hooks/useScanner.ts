'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';

interface UseScannerOptions {
  onScan?: (result: string) => void;
  onError?: (error: Error) => void;
  formats?: string[];
}

export function useScanner(options: UseScannerOptions = {}) {
  const { onScan, onError } = options;
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize code reader
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();

    // Get available cameras
    codeReader.current
      .listVideoInputDevices()
      .then((devices) => {
        setAvailableCameras(devices);
        // Prefer back camera on mobile
        const backCamera = devices.find(
          (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera?.deviceId || devices[0]?.deviceId || '');
      })
      .catch((err) => {
        console.error('Error listing cameras:', err);
      });

    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      setHasPermission(false);
      onError?.(error as Error);
      return false;
    }
  }, [onError]);

  const startScanning = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (!codeReader.current) return;

      videoRef.current = videoElement;

      try {
        await codeReader.current.decodeFromVideoDevice(
          selectedCamera || null,
          videoElement,
          (result: Result | null, error?: Error) => {
            if (result) {
              const text = result.getText();
              setLastResult(text);
              onScan?.(text);
            }
            if (error && !(error instanceof NotFoundException)) {
              onError?.(error);
            }
          }
        );
        setIsScanning(true);
        setHasPermission(true);
      } catch (error) {
        setHasPermission(false);
        onError?.(error as Error);
      }
    },
    [selectedCamera, onScan, onError]
  );

  const stopScanning = useCallback(() => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
    setLastResult(null);
  }, []);

  const switchCamera = useCallback((deviceId: string) => {
    setSelectedCamera(deviceId);
    if (isScanning && videoRef.current) {
      stopScanning();
      setTimeout(() => {
        if (videoRef.current) {
          startScanning(videoRef.current);
        }
      }, 100);
    }
  }, [isScanning, startScanning, stopScanning]);

  return {
    isScanning,
    lastResult,
    hasPermission,
    availableCameras,
    selectedCamera,
    requestPermission,
    startScanning,
    stopScanning,
    switchCamera,
  };
}

// Hook for processing scanned barcodes
export function useBarcodeProcessor() {
  const parseBarcode = useCallback((barcode: string) => {
    // SP Customs barcode format: SPC + 9 digit product ID
    if (barcode.startsWith('SPC')) {
      const productId = parseInt(barcode.slice(3), 10);
      return { type: 'product', productId, barcode };
    }

    // QR Code format: SPCPRODUCT:productId
    if (barcode.startsWith('SPCPRODUCT:')) {
      const productId = parseInt(barcode.split(':')[1], 10);
      return { type: 'product', productId, barcode };
    }

    // Unknown format
    return { type: 'unknown', barcode };
  }, []);

  return { parseBarcode };
}

