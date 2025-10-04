// controllers/dashboardController.js

import catchAsync from "../../utils/catchAsync";
import { dashboardService } from "./analytics.service";


export const getDashboard = catchAsync(async (req, res) => {
  try {
    const dashboardData = await dashboardService.getDashboardData();
    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
)