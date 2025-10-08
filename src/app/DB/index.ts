import { PrismaClient, UserRoleEnum } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import config from '../../config';

const prisma = new PrismaClient();

const adminData = {
  fullName: 'Admin',
  email: config.super_admin_mail!,
  password: config.super_admin_password!,
  phoneNumber: '01821558090',
  role: UserRoleEnum.ADMIN,
  isEmailVerified: false,
};

const seedAdmin = async () => {
  try {
    // Check if a super admin already exists
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        role: UserRoleEnum.ADMIN,
      },
    });

    if (!isSuperAdminExists) {
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(
        config.super_admin_password as string,
        Number(config.bcrypt_salt_rounds) || 12,
      );

      await prisma.user.create({
        data: {
          ...adminData,
          password: hashedPassword,
        },
      });

      console.log('✅ Super Admin created successfully.');
    } else {
      console.log('❌ Super Admin already exists.');
    }
  } catch (error) {
    console.error('Error seeding Super Admin:', error);
  } finally {
    await prisma.$disconnect();
  }
};

export default seedAdmin;
