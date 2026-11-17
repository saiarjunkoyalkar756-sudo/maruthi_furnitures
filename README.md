# 🛋️ Maruthi Furnitures & Mattresses — POS & Retail ERP

[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3+-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_Cloud-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Fast2SMS](https://img.shields.io/badge/Fast2SMS-Cellular_OTP-f59e0b?style=flat-square)](https://www.fast2sms.com/)

An all-in-one Point of Sale (POS) and Retail Enterprise Resource Planning (ERP) platform purpose-built for **Maruthi Furnitures & Mattresses** — Siddipet's premier wholesale and retail destination for summer air coolers, luxury orthopedic mattresses, heavy steel almirahs, dressing tables, and home furniture.

---

## 📍 Showroom Identity & Flagship Information

* **Establishment**: Maruthi Furnitures & Mattresses (EST. 2010)
* **Proprietor**: Alakanti Sai Nithin
* **Showroom Address**: Bypass Road, Mytri Vanam, Beside RS Metro Garden, Siddipet, Telangana — 502103
* **Operating Hours**: 9:30 AM – 9:30 PM (All 7 Days)
* **Phone / Helpline**: `+91 9908267125`
* **Email**: `Maruthifurnitures001@gmail.com`
* **UPI ID**: `paytm.s36d65m@pty` / `9908267125@ybl`

---

## 🚀 Core Features

### 1. 🧾 Zero-GST Tax-Exempt Invoicing
* Compliant with retail tax-exempt furniture billing without GST overhead.
* Automated consecutive bill numbering (`MF-2026-0001`, etc.).
* Dual printing options: Full A4 Invoices and 3-inch Thermal Counter Receipts.
* One-click WhatsApp invoice sharing directly to customers.

### 2. 💳 Dynamic UPI QR Standee Integration
* Every bill generates a dynamic Bharat QR / Paytm / UPI QR code pre-filled with the exact payable amount.
* Displays showroom UPI ID and payee name (`Maruthi Furnitures`).
* Customers scan and pay instantly via PhonePe, Google Pay, or Paytm.

### 3. 📦 Wholesale Inventory & Stock Management
* Real-time tracking across 34 active furniture models and categories:
  * **Desert & Summer Air Coolers** (Heavy 20-gauge, Khaitan / Symphony pumps)
  * **Orthopedic Mattresses** (Coir, High-Density Foam, Pocket Spring, Memory Foam)
  * **Heavy Steel Almirahs & Wardrobes** (Double Door, Triple Door, Powder-Coated)
  * **Dressing Tables & Vanity Mirrors** (Teak Finish, Engineered Wood)
  * **Commercial & Office Seating** (Plastic Chairs, Ergonomic Mesh, Visitor Chairs)
* Tracks wholesale purchase prices, retail selling margins, minimum stock alerts, and inward batches.

### 4. 👥 Customer Khata & Credit Ledger
* Dedicated credit ledger for trade buyers, regular customers, and interior contractors.
* Running credit balances, payment logs (Cash, UPI, Cheque), and settlement tracking.

### 5. 🔐 Multi-Tier Security & Authentication
* **Edge JWT Authentication**: Secure HMAC-SHA256 session tokens with HTTP-only cookies and 30-day "Remember Me" option.
* **Cellular SMS OTP**: Two-factor authentication dispatched directly to the proprietor's registered phone (`+919908267125`) powered by Fast2SMS.
* **Showroom Lock Mode**: 4-digit PIN lock screen protects counter terminals when unattended.
* **Universal Log Out**: Accessible with 1 click from both the top header and the left sidebar.

### 6. 🎨 Modern Vector Mockup UI
* Clean, minimalist card-in-canvas aesthetic with custom SVG illustrations.
* Responsive across desktop counter terminals, tablets, and mobile devices.
* Customizable software theme switcher (Emerald, Royal Slate, Midnight, Indigo).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 14](https://nextjs.org/) (App Router, Server Actions, React 18) |
| **Styling & Icons** | [Tailwind CSS](https://tailwindcss.com/), Custom SVG Icons & Illustrations |
| **Database** | [Supabase](https://supabase.com/) Cloud PostgreSQL (Session & Transaction Poolers) |
| **ORM** | [Prisma](https://www.prisma.io/) Client & Migrations |
| **Authentication** | Web Crypto HMAC-SHA256 JWT, Next.js Edge Middleware, Session Cookies |
| **SMS Gateway** | [Fast2SMS](https://www.fast2sms.com/) REST API for Cellular OTP Delivery |
| **Printing & QR** | HTML5 Canvas Print CSS, Dynamic UPI Deep-link QR Engine |

---

## 📂 Project Architecture

```
maruthi/
├── app/
│   ├── (shop)/                  # Protected showroom POS & ERP routes
│   │   ├── billing/             # Invoice creation, ledger & thermal prints
│   │   ├── customers/           # Khata credit ledger & customer directory
│   │   ├── dashboard/           # Real-time analytics, daily revenue & sales
│   │   ├── expenses/            # Operating expenses & net profit tracker
│   │   ├── offers/              # WhatsApp broadcast & marketing banner uploads
│   │   ├── products/            # Wholesale stock inventory & catalog manager
│   │   ├── reports/             # P&L statements, monthly turnover reports
│   │   └── settings/            # PIN security, showroom info & system preferences
│   ├── api/
│   │   ├── auth/                # Login, logout, SMS OTP send & verify
│   │   ├── bills/               # Bill creation, consecutive numbering & lookup
│   │   ├── customers/           # Khata ledger mutations & balance updates
│   │   ├── expenses/            # Expense entries & ledger
│   │   ├── offers/              # Promotional flyer uploads
│   │   ├── products/            # Inventory CRUD & stock inward batches
│   │   └── security/            # Lock screen toggle, PIN verification & Telegram fallback
│   ├── login/                   # Flagship login portal with reference mockup layout
│   └── layout.tsx               # Root layout with theme provider
├── components/
│   ├── Icons.tsx                # High-res SVG icon library
│   ├── PinLockModal.tsx         # 4-digit showroom lock screen modal
│   ├── Sidebar.tsx              # Left navigation menu with proprietor profile & Log Out
│   ├── ThemeProvider.tsx        # Multi-color software visual theme switcher
│   └── TopBar.tsx               # Header with live IST clock, theme picker & Log Out
├── lib/
│   ├── auth.ts                  # Edge HMAC-SHA256 JWT token minting & verification
│   ├── otp.ts                   # Fast2SMS cellular OTP dispatch service
│   ├── prisma.ts                # Singleton Prisma Client connected to Supabase
│   └── upiQr.ts                 # Dynamic UPI / Bharat QR code generator
├── prisma/
│   └── schema.prisma            # PostgreSQL relational schema for Supabase
└── public/
    ├── logo.jpg                 # Official Maruthi Furnitures badge
    └── paytm-qr.jpg             # Counter Paytm QR standee
```

---

## ⚡ Quick Start

### 1. Prerequisites
* [Node.js](https://nodejs.org/) v18.17 or higher
* [Git](https://git-scm.com/)
* A [Supabase](https://supabase.com/) PostgreSQL database

### 2. Clone the Repository
```bash
git clone https://github.com/saiarjunkoyalkar756-sudo/maruthi_furnitures.git
cd maruthi_furnitures
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your connection details:
```bash
cp .env.example .env
```

Key environment variables:
```env
# Supabase PostgreSQL Connection Pooler (Transaction Mode)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Supabase PostgreSQL Direct Connection (Session Mode for Migrations)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Edge Auth & JWT Secret
JWT_SECRET="your-256-bit-secret-key"

# Fast2SMS Cellular OTP Service
FAST2SMS_API_KEY="your-fast2sms-api-key"
STORE_OWNER_PHONE="+919908267125"

# Showroom Details
NEXT_PUBLIC_STORE_NAME="Maruthi Furnitures & Mattresses"
NEXT_PUBLIC_STORE_PHONE="+919908267125"
NEXT_PUBLIC_STORE_UPI_ID="paytm.s36d65m@pty"
```

### 5. Push Database Schema to Supabase
```bash
npx prisma db push
```

### 6. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Production Build
```bash
npm run build
npm start
```

---

## 🔒 Security Best Practices

1. Never commit `.env` containing live secrets to public GitHub repositories. Use `.env.example` as a template.
2. The Fast2SMS integration dispatches one-time verification codes strictly to the registered store owner phone (`+919908267125`).
3. POS session cookies are signed with HMAC-SHA256 and configured with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes.
4. An emergency 4-digit PIN lock (`1234` by default) allows immediate counter terminal lockdown.

---

## 📄 License

Proprietary software designed specifically for **Maruthi Furnitures & Mattresses, Siddipet**. All rights reserved.
