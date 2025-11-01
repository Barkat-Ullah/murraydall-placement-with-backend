import { prisma } from '../../utils/prisma';

const toggleFavorite = async (
  ownerId: string,
  ownerType: 'USER' | 'GUEST',
  placeId: string,
) => {
  const where =
    ownerType === 'USER'
      ? { userId: ownerId, placeId }
      : { guestId: ownerId, placeId };

  const existing = await prisma.favorite.findFirst({ where });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { isFavorite: false };
  }

  await prisma.favorite.create({
    data:
      ownerType === 'USER'
        ? { userId: ownerId, placeId }
        : { guestId: ownerId, placeId },
  });

  return { isFavorite: true };
};

const getFavorites = async (ownerId: string, ownerType: 'USER' | 'GUEST') => {
  const where =
    ownerType === 'USER' ? { userId: ownerId } : { guestId: ownerId };

  const favorites = await prisma.favorite.findMany({
    where,
    select: {
      id: true,
      userId: true,
      guestId: true,
      place: {
        select: {
          id: true,
          placeTitle: true,
          price: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return favorites;
};

const migrateGuestFavoritesToUser = async (guestId: string, userId: string) => {
  // Step 1: Find all guest favorites
  const guestFavorites = await prisma.favorite.findMany({
    where: { guestId },
  });

  if (!guestFavorites.length) return { migrated: 0 };

  // Step 2: Insert into user favorites (skip duplicates)
  let migratedCount = 0;

  for (const fav of guestFavorites) {
    const existing = await prisma.favorite.findFirst({
      where: {
        userId,
        placeId: fav.placeId,
      },
    });

    if (!existing) {
      await prisma.favorite.create({
        data: {
          userId,
          placeId: fav.placeId,
        },
      });
      migratedCount++;
    }
  }

  // Step 3: Delete guest favorites (optional)
  await prisma.favorite.deleteMany({
    where: { guestId },
  });

  return { migrated: migratedCount };
};

export const FavoriteServices = {
  toggleFavorite,
  getFavorites,
  migrateGuestFavoritesToUser,
};
