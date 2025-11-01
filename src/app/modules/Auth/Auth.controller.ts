import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './Auth.service';
import { FavoriteServices } from '../favorites/favorites.service';

const loginWithOtp = catchAsync(async (req, res) => {
  const guestId = req.body?.guestId;
  const result = await AuthServices.loginWithOtpFromDB(res, req.body);

  if (guestId) {
    await FavoriteServices.migrateGuestFavoritesToUser(
      guestId,
      result?.id as string,
    );
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const registerWithOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.registerWithOtpIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User Created Successfully',
    data: result,
  });
});

const logoutUser = catchAsync(async (req, res) => {
  // Clear the token cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User Successfully logged out',
    data: null,
  });
});

const verifyEmailWithOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyEmailWithOtp(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Email Verified Successfully',
    data: result,
  });
});

const resendVerificationWithOtp = catchAsync(async (req, res) => {
  const email = req.body.email;
  const result = await AuthServices.resendVerificationWithOtp(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification OTP sent successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await AuthServices.changePassword(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.forgetPassword(req.body.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification OTP has sent to email',
    data: result,
  });
});

const verifyForgotPassOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyForgotPassOtp(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'OTP has been verified',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  await AuthServices.resetPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password Reset!',
    data: null,
  });
});

export const AuthControllers = {
  loginWithOtp,
  registerWithOtp,
  logoutUser,
  verifyEmailWithOtp,
  resendVerificationWithOtp,
  changePassword,
  forgetPassword,
  verifyForgotPassOtp,
  resetPassword,
};
