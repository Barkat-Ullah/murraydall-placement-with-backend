import * as bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret, SignOptions } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { User, UserRoleEnum, UserStatus } from '@prisma/client';
import { sendOtpViaMail } from '../../utils/sendMail';
import { Response } from 'express';
import {
  generateOTP,
  getOtpStatusMessage,
  otpExpiryTime,
} from '../../utils/otp';

import { verifyOtp } from '../../utils/verifyOtp';
import sendResponse from '../../utils/sendResponse';
import { generateToken } from '../../utils/generateToken';
import { insecurePrisma, prisma } from '../../utils/prisma';
import emailSender, { generateOtpEmail } from '../../utils/spainXotp';


const loginWithOtpFromDB = async (
  res: Response,
  payload: {
    email: string;
    password: string;
  },
) => {
  const userData = await insecurePrisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });
  const isCorrectPassword: Boolean = await bcrypt.compare(
    payload.password,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  if (userData.role !== UserRoleEnum.ADMIN && !userData.isEmailVerified) {
    const otp = generateOTP();

    await prisma.user.update({
      where: { email: userData.email },
      data: {
        otp,
        otpExpiry: otpExpiryTime(),
      },
    });
    sendOtpViaMail(payload.email, otp);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: ' Please check your email for the verification OTP.',
      data: '',
    });
  } else {
    const accessToken = await generateToken(
      {
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );
    return {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
      accessToken: accessToken,
    };
  }
};

const registerWithOtpIntoDB = async (payload: User) => {
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  // Email check
  const isUserExistWithTheGmail = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, email: true },
  });

  if (isUserExistWithTheGmail?.id) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists');
  }

  // OTP generate (number)
  const otp: number = Math.floor(100000 + Math.random() * 900000);
  const userData: User = {
    ...payload,
    password: hashedPassword,
    otp: otp.toString(),
    otpExpiry: otpExpiryTime(),
  };

  const newUser = await prisma.user.create({
    data: userData,
   
  });

  try {
    const html = generateOtpEmail(otp);
    await emailSender(newUser.email, html, 'OTP Verification');
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send OTP email',
    );
  }

  return 'Please check mail to verify your email';
};

// const registerWithOtpIntoDB = async (
//   payload: User & { subscriptionType: SubscriptionType },
// ) => {
//   const hashedPassword: string = await bcrypt.hash(payload.password, 12);

//   // Email check
//   const isUserExistWithTheGmail = await prisma.user.findUnique({
//     where: { email: payload.email },
//     select: { id: true, email: true },
//   });

//   if (isUserExistWithTheGmail?.id) {
//     throw new AppError(httpStatus.CONFLICT, 'User already exists');
//   }

//   // OTP generate (number)
//   const otp: number = Math.floor(100000 + Math.random() * 900000);
//   const userData: User = {
//     ...payload,
//     password: hashedPassword,
//     otp: otp.toString(),
//     otpExpiry: otpExpiryTime(),
//   };

//   // TODO: Check subscription type
//   if (payload.subscriptionType === SubscriptionType.FREE) {
//     // Free subscription - direct create user with subscription
//     const freeSubscription = await prisma.subscription.findFirst({
//       where: { subscriptionType: SubscriptionType.FREE },
//     });

//     const newUser = await prisma.user.create({
//       data: {
//         ...userData,
//         subscriptionId: freeSubscription?.id,
//       },
//       include: { subscription: true },
//     });

//     try {
//       const html = generateOtpEmail(otp);
//       await emailSender(newUser.email, html, 'OTP Verification');
//     } catch {
//       throw new AppError(
//         httpStatus.INTERNAL_SERVER_ERROR,
//         'Failed to send OTP email',
//       );
//     }

//     return 'Please check mail to verify your email';
//   } else {
//     // Monthly or Yearly subscription
//     // TODO: Create user first
//     const newUser = await prisma.user.create({
//       data: userData,
//     });

//     // TODO: Create payment record for the subscription
//     const subscription = await prisma.subscription.findFirst({
//       where: { subscriptionType: payload.subscriptionType },
//     });

//     if (!subscription) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Subscription not found');
//     }

//     await prisma.payment.create({
//       data: {
//         userId: newUser.id,
//         subscriptionId: subscription.id,
//         amount: subscription.price,
//         currency: 'usd', // TODO: could be dynamic if needed
//         status: PaymentStatus.PENDING, // payment pending initially
//       },
//     });

//     try {
//       const html = generateOtpEmail(otp);
//       await emailSender(newUser.email, html, 'OTP Verification');
//     } catch {
//       throw new AppError(
//         httpStatus.INTERNAL_SERVER_ERROR,
//         'Failed to send OTP email',
//       );
//     }

//     return 'User registered. Please check mail to verify your email and complete payment';
//   }
// };

const verifyEmailWithOtp = async (payload: { email: string; otp: string }) => {
  const { userData } = await verifyOtp(payload);
  await prisma.user.update({
    where: {
      email: userData.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
      isEmailVerified: true,
    },
    select: {
      id: true,
    },
  });

  const accessToken = await generateToken(
    {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );
  return {
    id: userData.id,
    name: userData.fullName,
    email: userData.email,
    role: userData.role,
    accessToken: accessToken,
  };
};

const resendVerificationWithOtp = async (email: string) => {
  const user = await insecurePrisma.user.findFirstOrThrow({
    where: {
      email,
    },
  });

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is Suspended');
  }

  if (user.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  const otp = generateOTP();
  const expiry = otpExpiryTime();

  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpiry: expiry,
    },
  });

  try {
    await sendOtpViaMail(email, otp);
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send OTP email',
    );
  }

  return {
    message: 'Verification OTP sent successfully. Please check your inbox.',
  };
};

const changePassword = async (user: any, payload: any) => {
  const userData = await insecurePrisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: 'ACTIVE',
    },
  });

  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.oldPassword,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new Error('Password incorrect!');
  }

  const hashedPassword: string = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: 'Password changed successfully!',
  };
};

const forgetPassword = async (email: string) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email,
    },
    select: {
      email: true,
      status: true,
      id: true,
      otpExpiry: true,
      otp: true,
    },
  });

  if (userData.status === UserStatus.SUSPENDED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User has suspended');
  }
  if (
    userData.otp &&
    userData.otpExpiry &&
    new Date(userData.otpExpiry).getTime() > Date.now()
  ) {
    const message = getOtpStatusMessage(userData.otpExpiry);
    throw new AppError(httpStatus.CONFLICT, message);
  }
  const otp: number = Math.floor(100000 + Math.random() * 900000);
  const expireTime = otpExpiryTime();
  try {
    await prisma.$transaction(async tx => {
      await tx.user.update({
        where: { email },
        data: {
          otp: otp.toString(),
          otpExpiry: expireTime,
        },
      });
      try {
        const html = generateOtpEmail(otp);
        await emailSender(userData.email, html, 'OTP Verification');
      } catch (emailErr) {
        await tx.user.update({
          where: { email },
          data: {
            otp: null,
            otpExpiry: null,
          },
        });
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to send OTP email',
        );
      }
    });
  } catch (error) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP');
  }
};

const verifyForgotPassOtp = async (payload: { email: string; otp: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      otp: true,
      otpExpiry: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (
    user.otp !== payload.otp ||
    !user.otpExpiry ||
    user.otpExpiry < new Date()
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  await prisma.user.update({
    where: {
      email: payload.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
    },
  });

  return { message: 'OTP verification successful' };
};

const resetPassword = async (payload: { password: string; email: string }) => {
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  // Update the user's password in the database
  await prisma.user.update({
    where: { email: payload.email },
    data: {
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
    },
  });

  return { message: 'Password reset successfully' };
};

export const AuthServices = {
  loginWithOtpFromDB,
  registerWithOtpIntoDB,
  verifyEmailWithOtp,
  resendVerificationWithOtp,
  changePassword,
  forgetPassword,
  verifyForgotPassOtp,
  resetPassword,
};
