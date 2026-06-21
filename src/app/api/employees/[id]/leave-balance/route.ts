// src/app/api/employees/[id]/leave-balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLeaveBalanceForEmployee } from '@/lib/leave-probation-utils';

async function verifyAdmin(adminId: string | undefined) {
  if (!adminId) return null;
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true },
  });
  if (!admin || admin.role !== 'ADMIN') return null;
  return admin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminId = request.nextUrl.searchParams.get('adminId');
    if (!(await verifyAdmin(adminId ?? undefined))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isProbation: true, confirmedAt: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId: id },
      select: { annual: true, casual: true, medical: true, year: true },
    });

    return NextResponse.json({
      balance: balance ?? {
        annual: 0,
        casual: 0,
        medical: 0,
        year: new Date().getFullYear(),
      },
    });
  } catch (error) {
    console.error('[EMPLOYEE LEAVE BALANCE GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave balance' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const adminId = body.adminId as string | undefined;

    const admin = await verifyAdmin(adminId);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        callingName: true,
        firstName: true,
        lastName: true,
        isProbation: true,
        confirmedAt: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const year = new Date().getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: { employeeId: id },
    });

    if (!balance) {
      const calculated = getLeaveBalanceForEmployee(
        employee.isProbation,
        year,
        employee.confirmedAt
      );
      balance = await prisma.leaveBalance.create({
        data: {
          employeeId: id,
          year,
          annual: calculated.annual,
          casual: calculated.casual,
          medical: calculated.medical,
          official: calculated.official,
        },
      });
    }

    const action = body.action === 'decrement' ? 'decrement' : 'increment';

    if (action === 'decrement' && balance.annual <= 0) {
      return NextResponse.json(
        { error: 'Annual leave balance is already 0' },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveBalance.update({
      where: { employeeId: id },
      data: {
        annual: { increment: action === 'increment' ? 1 : -1 },
      },
      select: { annual: true, casual: true, medical: true, year: true },
    });

    return NextResponse.json({
      success: true,
      message:
        action === 'increment'
          ? 'Annual leave increased by 1 day'
          : 'Annual leave decreased by 1 day',
      balance: updated,
      previousAnnual: Number(balance.annual),
      newAnnual: updated.annual,
    });
  } catch (error) {
    console.error('[EMPLOYEE LEAVE BALANCE ADJUST]', error);
    return NextResponse.json(
      { error: 'Failed to adjust annual leave' },
      { status: 500 }
    );
  }
}
