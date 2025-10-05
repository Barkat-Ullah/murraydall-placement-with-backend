import express from 'express';
import { CategoryController } from './category.controller';

const router = express.Router();

// Get all category types (Beach_Life, City_Life, etc.)
router.get('/', CategoryController.getAllCategories);

// Get subcategories by categoryType
router.get(
  '/:categoryType/subcategories',
  CategoryController.getSubcategoriesByCategory,
);

export const CategoryRoutes = router;
