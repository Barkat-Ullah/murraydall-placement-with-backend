// import { UserRoleEnum } from '@prisma/client';
// import * as bcrypt from 'bcrypt';
// import config from '../../config';
// import { prisma } from '../utils/prisma';

// const adminData = {
//   fullName: 'Admin',
//   email: config.super_admin_mail!,
//   password: config.super_admin_password!,
//   phoneNumber: '01821558090',
//   role: UserRoleEnum.ADMIN,
//   isEmailVerified: false,
// };

// const seedSuperAdmin = async () => {
//   try {
//     // Check if a super admin already exists
//     const isSuperAdminExists = await prisma.user.findFirst({
//       where: {
//         role: UserRoleEnum.ADMIN,
//       },
//     });

//     // If not, create one
//     if (!isSuperAdminExists) {
//       adminData.password = await bcrypt.hash(
//         config.super_admin_password as string,
//         Number(config.bcrypt_salt_rounds) || 12,
//       );
//       await prisma.user.create({
//         data: adminData,
//       });
//       console.log('✅ Super Admin created successfully.');
//     } else {
//       console.log('❌ Super Admin already exists.');
//     }
//   } catch (error) {
//     console.error('Error seeding Super Admin:', error);
//   }
// };

// export default seedSuperAdmin;
