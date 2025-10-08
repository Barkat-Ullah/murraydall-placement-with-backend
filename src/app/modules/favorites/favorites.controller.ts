import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { FavoriteServices } from './favorites.service';

// 🧍 USER FAVORITE CONTROLLERS
const toggleUserFavorite = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { placeId } = req.body;

  const result = await FavoriteServices.toggleFavorite(
    userId!,
    'USER',
    placeId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isFavorite
      ? 'Added to favorites'
      : 'Removed from favorites',
    data: result,
  });
});

const getUserFavorites = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const favorites = await FavoriteServices.getFavorites(userId!, 'USER');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User favorites retrieved',
    data: favorites,
  });
});

// 👤 GUEST FAVORITE CONTROLLERS
const toggleGuestFavorite = catchAsync(async (req: Request, res: Response) => {
  const { guestId, placeId } = req.body;

  if (!guestId || !placeId) {
    throw new Error('guestId and placeId are required');
  }

  const result = await FavoriteServices.toggleFavorite(
    guestId,
    'GUEST',
    placeId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isFavorite
      ? 'Added to favorites'
      : 'Removed from favorites',
    data: result,
  });
});

const getGuestFavorites = catchAsync(async (req: Request, res: Response) => {
  const guestId = req.query.guestId as string;

  if (!guestId) {
    throw new Error('guestId is required');
  }

  const favorites = await FavoriteServices.getFavorites(guestId, 'GUEST');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Guest favorites retrieved',
    data: favorites,
  });
});

export const FavoriteController = {
  toggleUserFavorite,
  getUserFavorites,
  toggleGuestFavorite,
  getGuestFavorites,
};
