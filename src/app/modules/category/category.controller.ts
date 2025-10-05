import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { CategoryServices } from './category.service';

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = CategoryServices.getAllCategories();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All categories retrieved successfully',
    data: result,
  });
});

const getSubcategoriesByCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { categoryType } = req.params;
    const result =
      await CategoryServices.getSubcategoriesByCategory(categoryType);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Subcategories for ${categoryType} retrieved successfully`,
      data: result,
    });
  },
);

export const CategoryController = {
  getAllCategories,
  getSubcategoriesByCategory,
};
