# Employee Management System (EMS)

A modern, full-stack Employee Management System built with Next.js 16, Prisma, PostgreSQL, and TypeScript. This system provides comprehensive tools for managing employees, leave requests, attendance tracking, and more.

![Next.js](https://img.shields.io/badge/Next.js-16.0.0-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.18.0-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql)

## 🌟 Features

### For Employees
- 📊 **Personal Dashboard** - View leave balance, attendance, and upcoming events
- 🏖️ **Leave Management** - Apply for annual, casual, medical, and business leave
- ✅ **Cover Requests** - Request colleagues to cover during leave
- 📅 **Attendance Tracking** - Clock in/out and view attendance history
- 🔔 **Real-time Notifications** - Get notified about leave approvals, cover requests, and birthday wishes
- 👤 **Profile Management** - Update personal information and upload profile pictures
- 📈 **Reports** - Download attendance and leave reports in CSV format

### For Administrators
- 👥 **Employee Management** - Add, edit, deactivate, and manage employee records
- 📋 **Leave Approval System** - Review and approve/decline leave requests
- 📊 **Analytics Dashboard** - View workforce statistics and trends
- 📅 **Attendance Management** - Track and manage employee attendance
- 🎂 **Birthday Notifications** - Automatic birthday wishes to employees
- 🏢 **Department Management** - Organize employees by departments
- 📄 **Bulk Operations** - Export data and generate reports
- ⚙️ **System Configuration** - Manage public holidays and system settings

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router and Turbopack
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI Library**: [React 19.2](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Component Library**: [Radix UI](https://www.radix-ui.com/)
- **ORM**: [Prisma 6.18](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Supabase)
- **Authentication**: Custom JWT-based auth with bcryptjs
- **File Storage**: Supabase Storage
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Toast Notifications**: Sonner
- **Charts**: Recharts

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) database (or Supabase account)
- [Git](https://git-scm.com/)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Renuja-7671/Employee-Management-System.git
cd employee-management-system
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ems_db"
DIRECT_URL="postgresql://user:password@localhost:5432/ems_db"

# Supabase (for file storage)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Setup Password (for initial admin setup)
NEXT_PUBLIC_SETUP_PASSWORD="UIS_ADMIN_2025"
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed database with sample data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

The system uses the following main models:

- **User** - Employee information and credentials
- **Leave** - Leave requests and approvals
- **LeaveBalance** - Employee leave balances by year
- **CoverRequest** - Cover employee requests for leaves
- **Attendance** - Daily attendance records
- **Notification** - System notifications
- **PublicHoliday** - Company holidays

See `prisma/schema.prisma` for the complete schema.

## 📱 Application Structure

```
ems/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── admin/         # Admin portal
│   │   │   └── employee/      # Employee portal
│   │   ├── api/               # API routes
│   │   ├── login/             # Login page
│   │   ├── setup/             # Initial setup page
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── admin/            # Admin-specific components
│   │   ├── employee/         # Employee-specific components
│   │   ├── auth/             # Authentication components
│   │   ├── landing/          # Landing page components
│   │   └── ui/               # Reusable UI components
│   ├── lib/                  # Utility functions
│   │   ├── api/              # API client functions
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils.ts          # Helper functions
│   └── config/               # Configuration files
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seeding script
└── public/                   # Static assets
    └── images/               # Images and logos
```

## 🔐 Authentication & Authorization

The system uses a custom JWT-based authentication system with role-based access control (RBAC):

### Roles
- **ADMIN** - Full system access
- **EMPLOYEE** - Limited to employee portal features
- **HR_MANAGER** - Extended HR capabilities (future)

### Protected Routes
- `/admin/*` - Admin only
- `/employee/*` - Authenticated employees only
- `/api/*` - API routes with role-based middleware

## 🎨 Key Features Breakdown

### Leave Management System
- **Multi-step Approval Process**
  1. Employee applies for leave
  2. Cover employee accepts/declines
  3. Admin reviews and approves/declines
- **Leave Types**: Annual (14 days), Casual (7 days), Medical (unlimited with certificate), Business
- **Automatic Balance Deduction** on approval
- **Leave Cancellation** with notifications

### Attendance System
- **Manual Clock In/Out** or Admin entry
- **Automatic Status Calculation** (Present, Absent, Late, Half Day)
- **Weekend & Holiday Handling**
- **Monthly/Yearly Reports**

### Notification System
- **Real-time Updates** for:
  - Leave requests and approvals
  - Cover requests
  - Birthday wishes
  - System alerts
- **Mark as Read** functionality
- **Notification History**

### Employee Portal
- Modern, responsive UI with glassmorphism effects
- Personal dashboard with key metrics
- Self-service leave and attendance management
- Profile picture upload
- CSV export for personal records

### Admin Portal
- Comprehensive employee management
- Leave approval workflow
- Attendance oversight
- Analytics and reporting
- Employee deactivation (soft delete)
- Bulk operations

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm run start
```

### Environment Variables for Production

Ensure all environment variables are properly set in your production environment:
- Database connection strings
- Supabase credentials
- Any API keys

## 📚 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio
```

## 🔧 Configuration

### Departments
Configure available departments in `prisma/schema.prisma`:
```prisma
enum Department {
  ENGINEERING
  OPERATIONS
  QUALITY_CONTROL
  MAINTENANCE
  ADMINISTRATION
  HR
  FINANCE
  LOGISTICS
}
```

### Leave Balances
Default leave balances are set in:
- `src/app/api/leaves/balance/route.ts`
- Annual: 14 days
- Casual: 7 days
- Medical: Unlimited (with certificate)

### Public Holidays
Manage public holidays through the admin portal or database seeding.

## 🐛 Known Issues & Limitations

- File upload size limited to 5MB
- Medical certificates required for medical leave
- Leave requests must be submitted at least 1 day in advance
- Maximum 7 continuous days for annual leave (configurable)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️**

