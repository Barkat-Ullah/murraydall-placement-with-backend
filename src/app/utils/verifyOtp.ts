import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { prisma } from "./prisma";

export const verifyOtp = async (payload: { email: string; otp: string }) => {
    const userData = await prisma.user.findFirstOrThrow({
        where: {
            email: payload.email,
        },
        select: {
            otp: true,
            otpExpiry: true,
            id: true,
          fullName:true,
            email: true,
            role: true
        }
    });

    if (!userData.otp || !userData.otpExpiry) {
        throw new AppError(httpStatus.BAD_REQUEST, 'No OTP request found for this email.');
    }

    if (new Date(userData.otpExpiry).getTime() < Date.now()) {
        throw new AppError(httpStatus.BAD_REQUEST, 'OTP has expired. Please request a new one.');
    }

    if (userData.otp !== payload.otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP. Please try again.');
    }
    return {
        verified: true,
        userData
    }
};