import { CategoryTypePlace, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Return enum as category list
const getAllCategories = () => {
  return Object.values(CategoryTypePlace);
};

// Get all subcategories under a categoryType
const getSubcategoriesByCategory = async (categoryType: string) => {
  const validCategory = Object.values(CategoryTypePlace).includes(
    categoryType as CategoryTypePlace,
  );
  if (!validCategory) {
    throw new Error(`Invalid category type: ${categoryType}`);
  }

  const subcategories = await prisma.subcategory.findMany({
    where: { categoryType: categoryType as CategoryTypePlace },
    select: {
      id: true,
      name: true,
      image: true,
      description: true,
      isPremium: true,
      premiumPrice: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return subcategories;
};

export const CategoryServices = {
  getAllCategories,
  getSubcategoriesByCategory,
};
