// routes/subcategory.routes.ts (new file for Subcategory routes)
import express from 'express';

import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { SubcategoryController } from './subCategory.controller';
import { upload } from '../../utils/fileUploader';

const router = express.Router();

router.get('/', SubcategoryController.getAllSubcategories);
router.get(
  '/:subcategoryId/places',
  SubcategoryController.getPlacesBySubcategory,
);
router.post(
  '/',
  upload.single('image'),
  auth(UserRoleEnum.ADMIN),
  SubcategoryController.createSubcategory,
);

export const SubcategoryRoutes = router;
