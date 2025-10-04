import express from 'express';
import auth from '../../middlewares/auth';
import { UserControllers } from './user.controller';
import { parseBody } from '../../middlewares/parseBody';
import validateRequest from '../../middlewares/validateRequest';
import { userValidation } from './user.validation';
import { upload } from '../../utils/fileUploader';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.get(
  '/',
  auth((UserRoleEnum.ADMIN, UserRoleEnum.USER)),
  UserControllers.getAllUsers,
);
router.get(
  '/me',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  UserControllers.getMyProfile,
);
router.get('/:id', auth('ANY'), UserControllers.getUserDetails);

router.delete('/soft-delete', auth('ANY'), UserControllers.softDeleteUser);
router.delete(
  '/hard-delete/:id',
  auth(UserRoleEnum.ADMIN),
  UserControllers.hardDeleteUser,
);

router.put(
  '/update-profile',
  auth('ANY'),
  parseBody,
  UserControllers.updateMyProfile,
);

router.put(
  '/update-profile-image',
  auth('ANY'),
  upload.single('file'),
  UserControllers.updateProfileImage,
);

router.put(
  '/user-role/:id',
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(userValidation.updateUserRoleSchema),
  UserControllers.updateUserRoleStatus,
);

router.put(
  '/user-status/:id',
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(userValidation.updateUserStatus),
  UserControllers.updateUserStatus,
);
router.put(
  '/approve-user',
  auth(UserRoleEnum.ADMIN),
  UserControllers.updateUserApproval,
);

export const UserRouters = router;
