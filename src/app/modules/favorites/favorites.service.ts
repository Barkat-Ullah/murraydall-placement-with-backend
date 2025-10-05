// ... existing imports + PrismaClient

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const toggleFavorite = async (
  ownerId: string,
  ownerType: 'USER' | 'GUEST',
  placeId: string,
) => {
  let existing;
  if (ownerType === 'USER') {
    existing = await prisma.favorite.findUnique({
      where: { userId_placeId: { userId: ownerId, placeId } },
    });
  } else {
    existing = await prisma.favorite.findUnique({
      where: { guestId_placeId: { guestId: ownerId, placeId } },
    });
  }

  let isFavorite: boolean;
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    isFavorite = false;
  } else {
    const data =
      ownerType === 'USER'
        ? { userId: ownerId, placeId }
        : { guestId: ownerId, placeId };

    await prisma.favorite.create({ data });
    isFavorite = true;
  }

  return { isFavorite };
};

// New: Get favorites (with Place details)
const getFavorites = async (ownerId: string, ownerType: 'USER' | 'GUEST') => {
  let where;
  if (ownerType === 'USER') {
    where = { userId: ownerId };
  } else {
    where = { guestId: ownerId };
  }

  const favorites = await prisma.favorite.findMany({
    where,
    include: {
      place: {
        include: {
          subcategory: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return favorites.map(fav => ({
    ...fav.place, // Place details
    isFavorite: true, // Always true for this list
  }));
};

export const FavoriteServices = {
  toggleFavorite,
  getFavorites,
};
