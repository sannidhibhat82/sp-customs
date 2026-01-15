"""
Barcode and QR Code Generation Service.
Generates unique barcodes and QR codes for products.
"""
import io
import base64
from typing import Tuple
import barcode
from barcode.writer import ImageWriter
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer


class BarcodeGenerator:
    """Service for generating barcodes and QR codes."""
    
    @staticmethod
    def generate_sku(product_id: int, prefix: str = "SPC") -> str:
        """Generate a unique SKU for a product."""
        return f"{prefix}-{product_id:06d}"
    
    @staticmethod
    def generate_barcode_number(product_id: int) -> str:
        """Generate a barcode number (EAN-13 compatible)."""
        # Use a prefix (could be company-specific) + product ID + check digit
        # For simplicity, we'll generate a code that works with Code128
        return f"SPC{product_id:09d}"
    
    @staticmethod
    def generate_barcode_image(barcode_number: str, barcode_type: str = "code128") -> Tuple[str, bytes]:
        """
        Generate a barcode image.
        
        Returns:
            Tuple of (base64_encoded_image, raw_bytes)
        """
        # Create barcode
        barcode_class = barcode.get_barcode_class(barcode_type)
        barcode_instance = barcode_class(barcode_number, writer=ImageWriter())
        
        # Save to bytes
        output = io.BytesIO()
        barcode_instance.write(output, options={
            "module_width": 0.4,
            "module_height": 15,
            "font_size": 10,
            "text_distance": 5,
            "quiet_zone": 6,
        })
        output.seek(0)
        
        # Read and encode
        image_bytes = output.getvalue()
        base64_data = base64.b64encode(image_bytes).decode('utf-8')
        
        return base64_data, image_bytes
    
    @staticmethod
    def generate_qr_code(data: str, size: int = 10, border: int = 2) -> Tuple[str, bytes]:
        """
        Generate a QR code image.
        
        Args:
            data: Data to encode (e.g., product_id or URL)
            size: QR code size (box_size parameter)
            border: Border size in boxes
        
        Returns:
            Tuple of (base64_encoded_image, raw_bytes)
        """
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=size,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create styled image
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            fill_color="black",
            back_color="white",
        )
        
        # Save to bytes
        output = io.BytesIO()
        img.save(output, format='PNG')
        output.seek(0)
        
        # Read and encode
        image_bytes = output.getvalue()
        base64_data = base64.b64encode(image_bytes).decode('utf-8')
        
        return base64_data, image_bytes
    
    @staticmethod
    def generate_product_codes(product_id: int, product_name: str = "") -> dict:
        """
        Generate all codes for a product.
        
        Returns:
            Dictionary with sku, barcode, barcode_data, qr_code_data
        """
        sku = BarcodeGenerator.generate_sku(product_id)
        barcode_number = BarcodeGenerator.generate_barcode_number(product_id)
        
        # Generate barcode image
        barcode_base64, _ = BarcodeGenerator.generate_barcode_image(barcode_number)
        
        # Generate QR code with product ID
        qr_data = f"SPCPRODUCT:{product_id}"
        qr_base64, _ = BarcodeGenerator.generate_qr_code(qr_data)
        
        return {
            "sku": sku,
            "barcode": barcode_number,
            "barcode_data": barcode_base64,
            "qr_code_data": qr_base64,
        }
    
    @staticmethod
    def generate_barcode_from_sku(custom_sku: str, product_id: int) -> dict:
        """
        Generate barcode and QR code from a custom SKU.
        
        Args:
            custom_sku: The user-provided SKU to use as barcode
            product_id: The product ID for QR code reference
        
        Returns:
            Dictionary with barcode_data and qr_code_data
        """
        # Generate barcode image from custom SKU
        barcode_base64, _ = BarcodeGenerator.generate_barcode_image(custom_sku)
        
        # Generate QR code with both product ID and SKU for flexibility
        qr_data = f"SPCPRODUCT:{product_id}|SKU:{custom_sku}"
        qr_base64, _ = BarcodeGenerator.generate_qr_code(qr_data)
        
        return {
            "barcode_data": barcode_base64,
            "qr_code_data": qr_base64,
        }
    
    @staticmethod
    def decode_qr_data(qr_content: str) -> dict:
        """
        Decode QR code content to extract product info.
        
        Returns:
            Dictionary with product_id if found
        """
        if qr_content.startswith("SPCPRODUCT:"):
            try:
                product_id = int(qr_content.replace("SPCPRODUCT:", ""))
                return {"product_id": product_id}
            except ValueError:
                pass
        return {}
    
    @staticmethod
    def decode_barcode(barcode_content: str) -> dict:
        """
        Decode barcode content to extract product info.
        
        Returns:
            Dictionary with product_id if found
        """
        if barcode_content.startswith("SPC"):
            try:
                # Remove prefix and leading zeros
                product_id = int(barcode_content[3:])
                return {"product_id": product_id, "barcode": barcode_content}
            except ValueError:
                pass
        return {"barcode": barcode_content}

