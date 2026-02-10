# PDF Export with Half-Day Type

## Overview
Added PDF export functionality to the Leave Management page that includes half-day type information for official leaves, along with all leave details in a comprehensive report format.

## Changes Made

### 1. Leave Management Component (`src/components/admin/LeaveManagement.tsx`)

#### Added Dependencies
```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}
```

#### New Function: `exportToPDF()`
Created a comprehensive PDF export function that includes:

**Report Header:**
- Company logo (centered)
- Report title: "Leave Requests Report"
- Date range filter information
- Generation date
- Total number of requests

**Table Columns:**
1. EMP ID
2. Name
3. Type (Leave Type)
4. Start Date
5. End Date
6. Days
7. **Half Day** (NEW - Shows First Half/Second Half/-)
8. Status
9. Cover Employee

**Half-Day Type Formatting:**
```typescript
let halfDayDisplay = '-';
if (leave.halfDayType === 'FIRST_HALF') {
  halfDayDisplay = 'First Half';
} else if (leave.halfDayType === 'SECOND_HALF') {
  halfDayDisplay = 'Second Half';
}
```

**Features:**
- Multi-page support with automatic pagination
- Page numbers on every page
- Responsive column widths optimized for readability
- Explanatory notes at the bottom
- Company logo and branding

#### UI Update
Added new "Export PDF" button alongside existing CSV export buttons:

**Button Location:** `/admin/leaves` → Filter section → Results summary area

**Button Layout:**
```
[Export CSV] [Official CSV] [Export PDF]
```

**Visual Design:**
- Teal-colored background (`bg-teal-50 hover:bg-teal-100`)
- FileText icon
- Same size and style as CSV buttons

## Report Features

### PDF Report Layout

```
┌─────────────────────────────────────────────────┐
│              [COMPANY LOGO]                      │
│                                                  │
│         Leave Requests Report                    │
│    Period: 2026-02-01 to 2026-02-28             │
│    Generated: 2/10/2026                          │
│    Total Requests: 15                            │
├─────────────────────────────────────────────────┤
│                                                  │
│  [TABLE WITH 9 COLUMNS]                         │
│  EMP ID | Name | Type | Start | End | Days |    │
│  Half Day | Status | Cover                      │
│                                                  │
│  EMP001 | John Doe | OFFICIAL | 2/10/26 |       │
│  2/10/26 | 0.5 | First Half | APPROVED | N/A    │
│                                                  │
│  EMP002 | Jane Smith | OFFICIAL | 2/11/26 |     │
│  2/11/26 | 0.5 | Second Half | PENDING | N/A    │
│                                                  │
│  EMP003 | Bob Wilson | ANNUAL | 2/15/26 |       │
│  2/20/26 | 5 | - | APPROVED | Mike Lee          │
│                                                  │
├─────────────────────────────────────────────────┤
│  Notes:                                          │
│  • Half Day Type shows "First Half" or          │
│    "Second Half" for 0.5 day official leaves    │
│  • Status: PENDING_ADMIN (awaiting approval),   │
│    APPROVED, DECLINED, PENDING_COVER            │
│                                                  │
│              Page 1 of 2                         │
└─────────────────────────────────────────────────┘
```

### Column Widths (Optimized for A4)
```typescript
columnStyles: {
  0: { cellWidth: 18 },  // EMP ID
  1: { cellWidth: 30 },  // Name
  2: { cellWidth: 20 },  // Type
  3: { cellWidth: 22 },  // Start Date
  4: { cellWidth: 22 },  // End Date
  5: { cellWidth: 12 },  // Days
  6: { cellWidth: 20 },  // Half Day Type
  7: { cellWidth: 24 },  // Status
  8: { cellWidth: 25 },  // Cover Employee
}
```

### Half-Day Type Display

| Leave Scenario | Days | Half Day Column |
|---------------|------|-----------------|
| Official - First Half | 0.5 | First Half |
| Official - Second Half | 0.5 | Second Half |
| Official - Full Day | 1, 2, or 3 | - |
| Annual/Casual/Medical | Any | - |

## User Experience

### For Admins

**Exporting PDF Reports:**

1. Navigate to `/admin/leaves`
2. Apply filters (date range, employee, status)
3. Click **"Export PDF"** button
4. PDF file downloads automatically with filename:
   - Format: `leave_requests_{Employee}_{StartDate}_to_{EndDate}.pdf`
   - Example: `leave_requests_All_2026-02-01_to_2026-02-28.pdf`

5. Open PDF to view:
   - Professional report with company logo
   - All leave requests with full details
   - Half-day type information for official leaves
   - Multi-page layout with page numbers
   - Explanatory notes

**Export Options Comparison:**

| Button | Format | Content | Half-Day Info | Best For |
|--------|--------|---------|---------------|----------|
| Export CSV | CSV | All filtered leaves | ✅ Yes | Data analysis, Excel |
| Official CSV | CSV | Only official leaves | ✅ Yes | Official leave reports |
| **Export PDF** | **PDF** | **All filtered leaves** | **✅ Yes** | **Printing, presentations** |

### Benefits

1. **Professional Presentation**: PDF format suitable for formal reports and presentations
2. **Complete Information**: Includes half-day designation for better tracking
3. **Print-Ready**: Optimized layout for A4 printing
4. **Multi-Page Support**: Handles large datasets with automatic pagination
5. **Visual Clarity**: Table format with clear headers and consistent styling
6. **Self-Documenting**: Includes explanatory notes about half-day types and statuses

## Technical Details

### PDF Generation Specifications

- **Library**: jsPDF + jspdf-autotable
- **Page Size**: A4 (210mm x 297mm)
- **Orientation**: Portrait
- **Font Sizes**: 
  - Title: 18pt
  - Headers: 8pt
  - Body: 7pt
  - Notes: 8-9pt
- **Theme**: Grid with blue header (`#3B82F6`)
- **Cell Padding**: 1.5mm
- **Logo**: 50x20mm, centered at top

### Pagination Logic

```typescript
didDrawPage: () => {
  const pageCount = doc.getNumberOfPages();
  const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Page ${currentPage} of ${pageCount}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}
```

### Notes Section Logic

- Automatically adds new page if insufficient space (< 40mm from bottom)
- Positioned 10mm below the table
- Two explanatory bullet points:
  1. Half-day type explanation
  2. Status code meanings

## Testing Checklist

- [x] PDF export button appears in UI
- [x] Button styling matches design system
- [x] PDF generates with company logo
- [x] Table includes all 9 columns
- [x] Half-day type displays correctly:
  - [x] "First Half" for FIRST_HALF
  - [x] "Second Half" for SECOND_HALF
  - [x] "-" for null/empty
- [x] Multi-page documents work correctly
- [x] Page numbers appear on all pages
- [x] Notes section appears at bottom
- [x] File naming follows pattern
- [x] No TypeScript errors
- [x] Build successful
- [ ] Test with large datasets (>50 leaves)
- [ ] Verify PDF opens in various PDF readers
- [ ] Check print output quality
- [ ] Test with different date ranges
- [ ] Test with employee filtering

## Related Features

### Complete Export Options in `/admin/leaves`

1. **Export CSV** (`exportToCSV()`)
   - All filtered leaves
   - Includes: Employee, ID, Type, Dates, Days, Half Day Type, Status, Cover, Reason
   - CSV format for Excel

2. **Official CSV** (`exportOfficialLeavesCSV()`)
   - Only OFFICIAL leave type
   - Includes: Employee, ID, Type, Dates, Days, Half Day Type, Status, Reason
   - CSV format for Excel

3. **Export PDF** (`exportToPDF()`) - **NEW**
   - All filtered leaves
   - Includes: EMP ID, Name, Type, Dates, Days, Half Day Type, Status, Cover
   - Professional PDF format for printing

## Usage Examples

### Example 1: Monthly Official Leave Report
```
Filter:
- Start Date: 2026-02-01
- End Date: 2026-02-28
- Employee: All
- Status: All

Click: "Export PDF"
Result: leave_requests_All_2026-02-01_to_2026-02-28.pdf
Contains: All leaves with half-day designations clearly marked
```

### Example 2: Single Employee Report
```
Filter:
- Start Date: 2026-01-01
- End Date: 2026-12-31
- Employee: John Doe (EMP001)
- Status: Approved

Click: "Export PDF"
Result: leave_requests_John_Doe_2026-01-01_to_2026-12-31.pdf
Contains: All approved leaves for John Doe in 2026
```

### Example 3: Pending Approvals Report
```
Filter:
- Start Date: 2026-02-01
- End Date: 2026-02-28
- Employee: All
- Status: Pending Approval

Click: "Export PDF"
Result: leave_requests_All_2026-02-01_to_2026-02-28.pdf
Contains: All pending leaves requiring admin action
```

## Future Enhancements

1. **Custom Date Formatting**: Allow admins to choose date format (MM/DD/YYYY vs DD/MM/YYYY)
2. **Filtering in PDF**: Option to show/hide specific columns
3. **Summary Statistics**: Add leave type breakdown in PDF header
4. **Color Coding**: Different colors for different leave statuses
5. **Landscape Option**: For reports with many columns
6. **Chart Integration**: Add leave distribution pie charts
7. **Email Integration**: Send PDF reports via email
8. **Scheduled Reports**: Automatically generate and send monthly reports

## Related Documentation

- [Half-Day Leave Implementation](./HALF-DAY-LEAVE-IMPLEMENTATION.md) - Employee side
- [Admin Half-Day Display](./ADMIN-HALF-DAY-DISPLAY.md) - Admin UI and CSV exports
- Component: `src/components/admin/LeaveManagement.tsx`
- Libraries: jsPDF, jspdf-autotable
