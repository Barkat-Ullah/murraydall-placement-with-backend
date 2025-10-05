// controllers/subcategory.controller.ts (new file)
import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { SubcategoryServices } from './subCategory.service';


const createSubcategory = catchAsync(async (req: Request, res: Response) => {
  const result = await SubcategoryServices.createSubcategory(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created subcategory',
    data: result,
  });
});

const getAllSubcategories = catchAsync(async (req: Request, res: Response) => {
  const result = await SubcategoryServices.getAllSubcategories(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all subcategories',
    data: result.result,
    meta: result.meta,
  });
});
const getPlacesBySubcategory = catchAsync(
  async (req: Request, res: Response) => {
    const { subcategoryId } = req.params;
    const result =
      await SubcategoryServices.getPlacesBySubcategory(subcategoryId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Places under subcategory retrieved successfully',
      data: result,
    });
  },
);

export const SubcategoryController = {
  createSubcategory,
  getAllSubcategories,
  getPlacesBySubcategory,
};
