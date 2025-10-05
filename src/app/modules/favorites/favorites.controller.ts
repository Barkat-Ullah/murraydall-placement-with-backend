// controllers/favorite.controller.ts (fixed: use let for ownerType to allow reassignment)
import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { FavoriteServices } from './favorites.service';

const toggleFavorite = catchAsync(async (req: Request, res: Response) => {
  const { placeId, ownerType } = req.body;
  let ownerId = req.user?.id;

  // For guests (no auth), require ownerId + ownerType from body
  if (!ownerId) {
    ownerId = req.body.ownerId;
    if (!ownerId || !ownerType || !['USER', 'GUEST'].includes(ownerType)) {
      throw new Error(
        'ownerId and valid ownerType (USER or GUEST) required for guests',
      );
    }
  }

  if (!placeId) {
    throw new Error('placeId required');
  }

  const result = await FavoriteServices.toggleFavorite(
    ownerId,
    ownerType as 'USER' | 'GUEST',
    placeId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isFavorite
      ? 'Added to favorites'
      : 'Removed from favorites',
    data: { isFavorite: result.isFavorite },
  });
});

const getFavorites = catchAsync(async (req: Request, res: Response) => {
  let { ownerType } = req.query;
  let ownerId = req.user?.id;
  // For guests
  if (!ownerId) {
    ownerId = req.query.ownerId as string;
    if (
      !ownerId ||
      !ownerType ||
      !['USER', 'GUEST'].includes(ownerType as string)
    ) {
      throw new Error('ownerId and valid ownerType required for guests');
    }
  } else if (!ownerType) {
    ownerType = 'USER';
  }

  const result = await FavoriteServices.getFavorites(
    ownerId,
    ownerType as 'USER' | 'GUEST',
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Retrieved favorites',
    data: result,
  });
});

export const FavoriteController = {
  toggleFavorite,
  getFavorites,
};
