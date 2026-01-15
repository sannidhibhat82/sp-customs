import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateWhatsAppLink(product: {
  name: string;
  sku: string;
  price?: number | null;
}): string {
  const phoneNumber = "919999999999"; // Replace with actual phone number
  const message = encodeURIComponent(
    `Hi, I'm interested in:\n\n` +
    `*${product.name}*\n` +
    `SKU: ${product.sku}\n` +
    `${product.price ? `Price: ${formatCurrency(product.price)}\n` : ''}` +
    `\nPlease provide more details.`
  );
  return `https://wa.me/${phoneNumber}?text=${message}`;
}

export function getImageSrc(imageData: string | null | undefined): string {
  if (!imageData) return "/placeholder-product.png";
  if (imageData.startsWith("http")) return imageData;
  if (imageData.startsWith("data:")) return imageData;
  
  // Detect image type from base64 prefix
  // SVG starts with PHN2Z (base64 for "<svg") or PD94b (<?xml)
  // JPEG starts with /9j/
  // PNG starts with iVBOR
  // GIF starts with R0lGO
  // WebP starts with UklGR
  if (imageData.startsWith('PHN2Z') || imageData.startsWith('PD94b')) {
    return `data:image/svg+xml;base64,${imageData}`;
  } else if (imageData.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${imageData}`;
  } else if (imageData.startsWith('iVBOR')) {
    return `data:image/png;base64,${imageData}`;
  } else if (imageData.startsWith('R0lGO')) {
    return `data:image/gif;base64,${imageData}`;
  } else if (imageData.startsWith('UklGR')) {
    return `data:image/webp;base64,${imageData}`;
  }
  // Default to JPEG for unknown types
  return `data:image/jpeg;base64,${imageData}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

