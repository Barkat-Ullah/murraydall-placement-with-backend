import httpStatus from 'http-status';
import { User, UserRoleEnum, UserStatus } from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';
import { deleteFile, uploadSingleFile } from '../../utils/uploadFiles';
import { Request } from 'express';
import AppError from '../../errors/AppError';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';

interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}
const getAllUsersFromDB = async (query: any) => {
  const usersQuery = new QueryBuilder<typeof prisma.user>(prisma.user, query);

  const result = await usersQuery
    .search(['fullName', 'email', 'address', 'city'])
    .filter()
    .sort()
    .fields()
    .exclude()
    .paginate()
    .execute();
  return result;
};

const getMyProfileFromDB = async (id: string) => {
  const Profile = await prisma.user.findUniqueOrThrow({
    where: {
      id: id,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      describe: true,
      city: true,
      address: true,
      profile: true,
    },
  });

  return Profile;
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
  });
  return user;
};

const updateProfileImg = async (
  id: string,
  previousImg: string,
  req: Request,
  file: Express.Multer.File | undefined,
) => {
  if (file) {
    const location = uploadToDigitalOceanAWS(file);

    const result = await prisma.user.update({
      where: {
        id,
      },
      data: {
        profile: (await location).Location,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        profile: true,
      },
    });
    if (previousImg) {
      deleteFile(previousImg);
    }
    req.user.profile = location;
    return result;
  }
  throw new AppError(httpStatus.NOT_FOUND, 'Please provide image');
};

const updateMyProfileIntoDB = async (
  id: string,

  payload: Partial<User>,
) => {
  delete payload.email;
  delete payload.role;

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: payload,
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      describe: true,
      city: true,
      address: true,
      profile: true,
    },
  });
  return result;
};

const updateUserRoleStatusIntoDB = async (id: string, role: UserRoleEnum) => {
  const result = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      role: role,
    },
  });
  return result;
};
const updateUserStatus = async (id: string, status: UserStatus) => {
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status,
    },
    select: {
      id: true,
      status: true,
      role: true,
    },
  });
  return result;
};
const updateUserApproval = async (userId: string) => {
  console.log(userId);
  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  //   select: {
  //     id: true,
  //     fullName: true,
  //     email: true,
  //     isApproved: true,
  //   },
  // });

  // if (!user) {
  //   throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  // }
  // const result = await prisma.user.update({
  //   where: { id: userId },
  //   data: {
  //     isApproved: true,
  //   },
  // });
  // return result;
};

const softDeleteUserIntoDB = async (id: string) => {
  const result = await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
    select: {
      id: true,
      isDeleted: true,
    },
  });
  return result;
};
const hardDeleteUserIntoDB = async (id: string, adminId: string) => {
  const adminUser = await prisma.user.findUnique({
    where: {
      id: adminId,
      role: UserRoleEnum.ADMIN,
    },
  });
  if (!adminUser) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not a admin');
  }

  return await prisma.$transaction(
    async tx => {
      await tx.payment.deleteMany({ where: { userId: id } });

      const deletedUser = await tx.user.delete({
        where: { id },
        select: { id: true, email: true },
      });

      return deletedUser;
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );
};

export const UserServices = {
  getAllUsersFromDB,
  getMyProfileFromDB,
  getUserDetailsFromDB,
  updateMyProfileIntoDB,
  updateUserRoleStatusIntoDB,
  updateUserStatus,
  updateProfileImg,
  updateUserApproval,
  softDeleteUserIntoDB,
  hardDeleteUserIntoDB,
};
