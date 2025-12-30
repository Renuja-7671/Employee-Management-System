# Name Fields Update Summary

## Overview
Updated the database schema and application to use three name fields instead of firstName/lastName:
- **Calling Name**: The name used in daily communication (e.g., "Malinda")
- **Full Name**: Complete legal name (e.g., "Don Malinda Perera")
- **Name with Initials**: Official name with initials (e.g., "D.M. Perera")

## Completed Changes

### 1. Database Schema ✅
- Added `callingName`, `fullName`, `nameWithInitials` as nullable fields
- Made `firstName` and `lastName` optional (deprecated but kept for backward compatibility)
- Migration successfully applied: `20251230130136_add_name_fields_nullable`
- File: `prisma/schema.prisma`

### 2. API Endpoints ✅
#### Employee Creation API (`src/app/api/employees/route.ts`)
- Updated validation to require new name fields
- Updated POST to save callingName, fullName, nameWithInitials
- Updated GET to return new name fields

#### Employee Update API (`src/app/api/employees/[id]/route.ts`)
- Added handling for callingName, fullName, nameWithInitials in PUT endpoint
- Added new fields to select statement

#### Leave Summary API (`src/app/api/leaves/summary/route.ts`)
- Updated select to include new name fields
- Updated response to use fullName with fallback to firstName/lastName
- Changed orderBy from firstName to fullName

### 3. TypeScript Interfaces ✅
- Updated `Employee` and `CreateEmployeeData` interfaces
- File: `src/lib/api/employees.ts`

### 4. Add Employee Modal ✅
- Updated form state to use new name fields
- Updated UI to show three separate name fields with helpful placeholders
- File: `src/components/admin/EmployeeManagement.tsx`

### 5. Edit Employee Details Modal ✅
**File**: `src/components/admin/EmployeeProfiles.tsx`

Updated:
- `editFormData` state to include callingName, fullName instead of firstName, lastName
- `handleEditClick` to populate new name fields from employee data
- `handleCancelEdit` to reset new name fields
- `handleSaveEdit` to send new name fields to API
- UI form fields to show two inputs (Calling Name, Full Name) plus Name with Initials
- `fetchEmployees` function to use fullName with fallback for backward compatibility
- **Fixed department field**: Changed from Input to Select dropdown with all department options

### 6. Employee Profile Display ✅
**Files updated**:
- `src/components/employee/MyProfile.tsx` - Updated to use fullName/callingName with fallback
  - Updated getInitials function to work with full name
  - Updated all display areas to use new name fields

## Remaining Changes Needed

### 7. Other API Routes and Components (IN PROGRESS)
Files that still reference firstName/lastName (42 files total):
- Leave management components and APIs
- Attendance management
- Admin management
- Email templates (birthday wishes, notifications)
- Biometric mappings
- Cover request handling
- Auth routes

Strategy: All these will work with backward compatibility since:
1. firstName/lastName still exist in database (nullable)
2. New code uses `fullName || callingName || ${firstName} ${lastName}` pattern
3. Existing employees will need to update their names via edit modal

## Migration Steps

### Local Development ✅
1. Migration completed:
   ```bash
   npx prisma generate  # ✅ Done
   npx prisma migrate dev --name add_name_fields_nullable  # ✅ Done
   ```

2. Development server running at http://localhost:3000 ✅

3. Update existing employee data:
   - Option 1: Via Admin UI - Edit each employee profile to add new name fields
   - Option 2: SQL script (run in Supabase SQL Editor):
   ```sql
   UPDATE "User"
   SET
     "callingName" = "firstName",
     "fullName" = CONCAT("firstName", ' ', "lastName"),
     "nameWithInitials" = COALESCE("nameWithInitials", CONCAT(SUBSTRING("firstName", 1, 1), '. ', "lastName"))
   WHERE "callingName" IS NULL AND "firstName" IS NOT NULL;
   ```

### Production Deployment
1. Push code changes to GitHub
2. SSH to VPS and run update script: `/root/update-ems.sh`
3. Run migration on production database
4. Update employee data via admin portal or SQL script

## Testing Checklist
- [ ] Create new employee with all three name fields
- [ ] Edit existing employee and update name fields
- [ ] View employee profile displays correctly
- [ ] Leave requests show correct names
- [ ] Attendance records show correct names
- [ ] Email notifications use correct names
- [ ] Reports/exports show correct names

## Notes
- Old `firstName` and `lastName` fields kept for backward compatibility
- Default value "Update Required" allows migration without breaking existing data
- UI provides helpful placeholders showing expected format for each name field
