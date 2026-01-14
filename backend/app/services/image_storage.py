"""
Image Storage Service - Abstraction layer for image storage.
Currently stores images in database (Base64), but designed for easy S3 migration.
"""
from abc import ABC, abstractmethod
from typing import Optional, Tuple
import base64
import io
from PIL import Image
from app.config import settings


class ImageStorageBase(ABC):
    """Abstract base class for image storage backends."""
    
    @abstractmethod
    async def store(self, image_data: bytes, filename: str, content_type: str) -> dict:
        """Store an image and return storage info."""
        pass
    
    @abstractmethod
    async def retrieve(self, storage_info: dict) -> Optional[bytes]:
        """Retrieve an image by storage info."""
        pass
    
    @abstractmethod
    async def delete(self, storage_info: dict) -> bool:
        """Delete an image."""
        pass
    
    @abstractmethod
    def get_url(self, storage_info: dict) -> Optional[str]:
        """Get URL for an image (if applicable)."""
        pass


class DatabaseImageStorage(ImageStorageBase):
    """Store images directly in database as Base64."""
    
    async def store(self, image_data: bytes, filename: str, content_type: str) -> dict:
        """Store image as Base64 string."""
        # Compress and optimize image
        optimized_data, width, height = self._optimize_image(image_data, content_type)
        
        # Create thumbnail
        thumbnail_data = self._create_thumbnail(image_data, content_type)
        
        # Encode to base64
        base64_data = base64.b64encode(optimized_data).decode('utf-8')
        base64_thumbnail = base64.b64encode(thumbnail_data).decode('utf-8') if thumbnail_data else None
        
        return {
            "storage_type": "database",
            "image_data": base64_data,
            "thumbnail_data": base64_thumbnail,
            "width": width,
            "height": height,
            "file_size": len(optimized_data),
        }
    
    async def retrieve(self, storage_info: dict) -> Optional[bytes]:
        """Retrieve image from Base64."""
        if storage_info.get("image_data"):
            return base64.b64decode(storage_info["image_data"])
        return None
    
    async def delete(self, storage_info: dict) -> bool:
        """Delete is handled by database cascade."""
        return True
    
    def get_url(self, storage_info: dict) -> Optional[str]:
        """Database storage doesn't have URLs, returns None."""
        return None
    
    def _optimize_image(self, image_data: bytes, content_type: str) -> Tuple[bytes, int, int]:
        """Compress and optimize image."""
        try:
            img = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary (for JPEG)
            if img.mode in ('RGBA', 'P') and content_type == 'image/jpeg':
                img = img.convert('RGB')
            
            # Resize if too large (max 2000px on longest side)
            max_size = 2000
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = tuple(int(dim * ratio) for dim in img.size)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Save optimized
            output = io.BytesIO()
            format_map = {
                'image/jpeg': 'JPEG',
                'image/png': 'PNG',
                'image/webp': 'WEBP',
            }
            img_format = format_map.get(content_type, 'JPEG')
            
            if img_format == 'JPEG':
                img.save(output, format=img_format, quality=settings.IMAGE_QUALITY, optimize=True)
            else:
                img.save(output, format=img_format, optimize=True)
            
            return output.getvalue(), img.size[0], img.size[1]
        except Exception:
            return image_data, 0, 0
    
    def _create_thumbnail(self, image_data: bytes, content_type: str, size: Tuple[int, int] = (300, 300)) -> Optional[bytes]:
        """Create thumbnail image."""
        try:
            img = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=80, optimize=True)
            return output.getvalue()
        except Exception:
            return None


class S3ImageStorage(ImageStorageBase):
    """
    Store images in AWS S3 or compatible storage.
    This is a placeholder for future migration.
    """
    
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        self.region = settings.S3_REGION
        # Initialize boto3 client when needed
        self._client = None
    
    @property
    def client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return self._client
    
    async def store(self, image_data: bytes, filename: str, content_type: str) -> dict:
        """Store image in S3."""
        import uuid
        
        # Generate unique key
        key = f"products/{uuid.uuid4()}/{filename}"
        
        # Upload to S3
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=image_data,
            ContentType=content_type,
        )
        
        # Generate URL
        url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"
        
        return {
            "storage_type": "s3",
            "storage_url": url,
            "s3_key": key,
            "file_size": len(image_data),
        }
    
    async def retrieve(self, storage_info: dict) -> Optional[bytes]:
        """Retrieve image from S3."""
        key = storage_info.get("s3_key")
        if not key:
            return None
        
        response = self.client.get_object(Bucket=self.bucket_name, Key=key)
        return response['Body'].read()
    
    async def delete(self, storage_info: dict) -> bool:
        """Delete image from S3."""
        key = storage_info.get("s3_key")
        if not key:
            return False
        
        self.client.delete_object(Bucket=self.bucket_name, Key=key)
        return True
    
    def get_url(self, storage_info: dict) -> Optional[str]:
        """Get S3 URL."""
        return storage_info.get("storage_url")


class ImageStorageService:
    """
    Main image storage service that delegates to the appropriate backend.
    Easy to switch between database and S3 storage.
    """
    
    def __init__(self):
        self.storage_type = settings.IMAGE_STORAGE_TYPE
        
        if self.storage_type == "s3":
            self._backend = S3ImageStorage()
        else:
            self._backend = DatabaseImageStorage()
    
    async def store_image(self, image_data: bytes, filename: str, content_type: str = "image/jpeg") -> dict:
        """Store an image using the configured backend."""
        return await self._backend.store(image_data, filename, content_type)
    
    async def retrieve_image(self, storage_info: dict) -> Optional[bytes]:
        """Retrieve an image."""
        return await self._backend.retrieve(storage_info)
    
    async def delete_image(self, storage_info: dict) -> bool:
        """Delete an image."""
        return await self._backend.delete(storage_info)
    
    def get_image_url(self, storage_info: dict) -> Optional[str]:
        """Get URL for an image if available."""
        return self._backend.get_url(storage_info)
    
    async def process_base64_upload(self, base64_data: str, filename: str, content_type: str = "image/jpeg") -> dict:
        """Process a base64 encoded image upload."""
        # Remove data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(base64_data)
        
        # Store
        return await self.store_image(image_bytes, filename, content_type)


# Singleton instance
_image_storage: Optional[ImageStorageService] = None


def get_image_storage() -> ImageStorageService:
    """Get the image storage service instance."""
    global _image_storage
    if _image_storage is None:
        _image_storage = ImageStorageService()
    return _image_storage

