# SP Customs - Dynamic Vehicle Gadgets Inventory & Catalog Platform

A production-grade web platform for managing vehicle gadgets inventory with barcode/QR scanning, real-time synchronization, and a modern public catalog.

## 🚗 Features

### Admin Dashboard
- **Dynamic Category Management**: Hierarchical categories with unlimited nesting
- **Brand Management**: Full brand CRUD with category associations
- **Product Management**: Rich product creation with dynamic attributes
- **Inventory System**: Real-time stock tracking with barcode/QR scanning
- **Image Management**: Upload and manage product images

### Mobile Features
- **Barcode/QR Scanner**: Scan products to update inventory instantly
- **Camera Upload**: Capture and upload product images from mobile
- **PWA Support**: Install as native app on mobile devices

### Public Catalog
- **Product Browsing**: Search, filter by category/brand
- **Product Details**: Image gallery, specifications, stock status
- **WhatsApp Inquiry**: One-click inquiry via WhatsApp

### Real-Time Sync
- **WebSocket Integration**: Instant updates across all devices
- **Live Inventory**: Stock changes reflected immediately
- **Event Broadcasting**: All actions synced in real-time

## 🛠 Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Primary database
- **SQLAlchemy** - Async ORM
- **WebSockets** - Real-time communication

### Frontend
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **React Query** - Data fetching & caching
- **Zustand** - State management

## 📦 Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create database
createdb sp_customs

# Run migrations
# The database will be auto-initialized on first run

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Configuration

### Backend Environment Variables
Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sp_customs
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost:5432/sp_customs
SECRET_KEY=your-secret-key-change-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
IMAGE_STORAGE_TYPE=database
DEBUG=true
```

### Frontend Environment Variables
Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 🚀 Usage

### Admin Access
1. Navigate to `http://localhost:3000/admin/login`
2. Login with default credentials: `admin` / `admin123`

### Mobile Scanner
1. Open `http://localhost:3000/mobile/scanner` on your phone
2. Allow camera access
3. Scan product barcodes/QR codes to update inventory

### Image Upload
1. Open `http://localhost:3000/mobile/upload` on your phone
2. Search for a product
3. Take or select photos to upload

## 📱 PWA Installation

On mobile devices, you can install the app:
1. Open the website in Chrome/Safari
2. Click "Add to Home Screen"
3. The app will work offline for basic features

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Categories
- `GET /api/categories` - List categories
- `GET /api/categories/tree` - Get category tree
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Brands
- `GET /api/brands` - List brands
- `POST /api/brands` - Create brand
- `PUT /api/brands/{id}` - Update brand
- `DELETE /api/brands/{id}` - Delete brand

### Products
- `GET /api/products` - List products (paginated)
- `GET /api/products/{id}` - Get product
- `GET /api/products/by-barcode/{barcode}` - Get by barcode
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Inventory
- `GET /api/inventory` - List inventory
- `GET /api/inventory/stats` - Get stats
- `POST /api/inventory/scan` - Process scan
- `PUT /api/inventory/{product_id}` - Update inventory

### Images
- `GET /api/images/product/{id}` - Get product images
- `POST /api/images/product/{id}` - Upload image
- `DELETE /api/images/{id}` - Delete image

### WebSocket
- `WS /api/ws` - Real-time updates

## 🔮 Future Roadmap

- [ ] Migrate image storage to S3/Cloudinary
- [ ] Add payment processing
- [ ] Order management system
- [ ] Multi-location inventory
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Export/Import functionality

## 📄 License

MIT License - See LICENSE file for details.

## 👨‍💻 Author

SP Customs - Premium Vehicle Gadgets

---

Built with ❤️ using FastAPI and Next.js

