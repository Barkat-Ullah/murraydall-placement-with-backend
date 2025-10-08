import express from 'express';
import { CategoryController } from './category.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

// Get all category types (Beach_Life, City_Life, etc.)
router.get('/', CategoryController.getAllCategories);

// Get subcategories by categoryType
router.get(
  '/:categoryType/subcategories',
  CategoryController.getSubcategoriesByCategory,
);
router.delete(
  '/subcategories/:subcategoryId',
  auth(UserRoleEnum.ADMIN),
  CategoryController.deleteSubcategoryHard,
);

export const CategoryRoutes = router;
