import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { GuestServices } from './guest.service';

const createOrGetGuest = catchAsync(async (req: Request, res: Response) => {
  const result = await GuestServices.createOrGetGuest();
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Guest created/found',
    data: result
  });
});

 const getMyGuest= catchAsync(async (req: Request, res: Response) => {
    const { id } = req.query; 
    const guest = await GuestServices.getMyGuest(id as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Guest fetched successfully',
      data: guest,
    });
  })

export const GuestController = {
  createOrGetGuest,getMyGuest
};
