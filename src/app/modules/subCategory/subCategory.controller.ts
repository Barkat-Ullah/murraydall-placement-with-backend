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

const deleteSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubcategoryServices.deleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted Sub category',
    data: result,
  });
});

const softDeleteSubCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await SubcategoryServices.softDeleteIntoDb(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully soft deleted Sub category',
      data: result,
    });
  },
);
const updateSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body.data ? JSON.parse(req.body.data) : {};
  const file = req.file;
  const result = await SubcategoryServices.updateSubCategory(id, data, file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated Sub category',
    data: result,
  });
});

export const SubcategoryController = {
  createSubcategory,
  getAllSubcategories,
  getPlacesBySubcategory,
  deleteSubCategory,
  softDeleteSubCategory,
  updateSubCategory,
};
