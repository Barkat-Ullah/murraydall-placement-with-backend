import { prisma } from '../../utils/prisma';
import { v4 as uuidv4 } from 'uuid';

export const GuestServices = {
  async createOrGetGuest() {
    const deviceId = uuidv4();
    console.log(deviceId);

    let guest = await prisma.guest.findUnique({
      where: { deviceId },
      select: {
        id: true,
        deviceId: true,
        role: true,
        hasPremiumAccess: true,
      },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          deviceId,
          role: 'GUEST',
          fullName: 'Guest',
          hasPremiumAccess: false,
        },
        select: {
          id: true,
          deviceId: true,
          role: true,
          hasPremiumAccess: true,
        },
      });
    }

    return guest;
  },

  async getMyGuest(deviceId: string) {
    const result = await prisma.guest.findUnique({
      where: { deviceId },
      select: {
        id: true,
        deviceId: true,
        role: true,
        hasPremiumAccess: true,
      },
    });
    return result;
  },
};
