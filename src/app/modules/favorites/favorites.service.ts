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

export const FavoriteServices = {
  toggleFavorite,
  getFavorites,
};
