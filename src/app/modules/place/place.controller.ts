import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { PlaceServices } from './place.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceServices.createIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created place',
    data: result,
  });
});


const assignPaymentForPremiumPlace = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const result = await PlaceServices.assignPaymentForPremiumPlace(
      userId,
      req.body,
    );

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      data: result,
    });
  },
);


const getAllPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceServices.getAllPlace(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all place',
    data: result.data,
    meta: result.meta,
  });
});

const getMyPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceServices.getMyPlace(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved my place',
    data: result,
  });
});
const getPremiumPlace = catchAsync(async (req: Request, res: Response) => {
  const result = await PlaceServices.getOnlyPremiumPlace();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved al premium place',
    data: result,
  });
});

const getPlaceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PlaceServices.getPlaceByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved place by id',
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const file = req.file
  const data = JSON.parse(req.body.data)
  const result = await PlaceServices.updateIntoDb(id, data,file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated place',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id
  const result = await PlaceServices.deleteIntoDb(id,userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted place',
    data: result,
  });
});

export const PlaceController = {
  createIntoDb,
  getAllPlace,
  getMyPlace,
  getPlaceById,
  updateIntoDb,
  deleteIntoDb,
  assignPaymentForPremiumPlace,
  getPremiumPlace,
};
