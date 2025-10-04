// services/dashboardService.js
import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const dashboardService = {
  async getDashboardData() {
    // Total places
    const totalPlaces = await prisma.place.count();

    // Total users
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
      },
    });

    // Monthly new users for the current year (Jan to Dec)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const usersThisYear = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by month (YYYY-MM)
    const monthlyCounts: Record<string, number> = {};
    usersThisYear.forEach(user => {
      const monthKey = user.createdAt.toISOString().slice(0, 7); // e.g., '2025-01'
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    // Map to array for Jan to Dec, with month abbreviations
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthlyNewUsers = monthNames.map((monthName, index) => {
      const monthIndex = index + 1;
      const monthKey = `${currentYear}-${monthIndex.toString().padStart(2, '0')}`;
      return monthlyCounts[monthKey] || 0;
    });

    return {
      totalPlaces,
      totalUsers,
      activeUsers,
      monthlyNewUsers, 
    };
  },
};
