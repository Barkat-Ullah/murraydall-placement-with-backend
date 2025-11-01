// services/subcategory.service.ts (new file)
import { PrismaClient, CategoryTypePlace } from '@prisma/client';
import { Request } from 'express';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import { stripe } from '../../utils/stripe';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const prisma = new PrismaClient();

const createSubcategory = async (req: Request) => {
  const { name, description, categoryType, isPremium, premiumPrice } =
    JSON.parse(req.body.data);

  // Validate
  if (!name || !categoryType) {
    throw new Error('Name and categoryType are required');
  }

  const file = req.file as Express.Multer.File | undefined;
  let fileUrl: string | null = null;
  if (file) {
    const location = await uploadToDigitalOceanAWS(file);
    fileUrl = location.Location;
  }

  // Check unique constraint
  const existing = await prisma.subcategory.findUnique({
    where: {
      name_categoryType: {
        name,
        categoryType: categoryType as CategoryTypePlace,
      },
    },
  });
  if (existing) {
    throw new Error('Subcategory name must be unique per categoryType');
  }

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  // If premium, create Stripe product and price
  if (isPremium) {
    const amount = premiumPrice;

    // Create product
    const product = await stripe.products.create({
      name: `Premium Access: ${name} (${categoryType})`,
      description: `One-time unlock for ${name} premium content in ${categoryType}`,
      metadata: {
        subcategoryName: name,
        categoryType: categoryType,
      },
    });

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency: 'usd',
    });

    stripeProductId = product.id;
    stripePriceId = price.id;
  }

  const result = await prisma.subcategory.create({
    data: {
      name,
      description,
      image: fileUrl,
      categoryType: categoryType as CategoryTypePlace,
      isPremium: isPremium || false,
      premiumPrice: isPremium ? premiumPrice : null,
      stripePriceId,
      stripeProductId,
    },
    include: {
      places: true,
    },
  });

  return result;
};

const getAllSubcategories = async (query: Record<string, any>) => {
  const { categoryType, limit = 10, page = 1 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  let where: any = {
    isDeleted: false,
  };

  if (categoryType) {
    where.categoryType = categoryType as CategoryTypePlace;
  }

  const [result, total] = await Promise.all([
    prisma.subcategory.findMany({
      where,
      include: {
        places: true,
      },
      // orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.subcategory.count({ where }),
  ]);

  return {
    result,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getPlacesBySubcategory = async (subcategoryId: string) => {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
    select: {
      name: true,
      image: true,
      isPremium: true,
      places: {
        select: {
          id: true,
          placeTitle: true,
          placeDescription: true,
          imageUrl: true,
          subscriptionType: true,
          price: true,
        },
      },
    },
  });

  if (!subcategory) {
    throw new Error('Subcategory not found');
  }

  return subcategory;
};

const deleteIntoDb = async (id: string) => {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
  });

  if (!subcategory) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
  }

  const result = await prisma.subcategory.delete({
    where: { id },
  });

  return result;
};

const softDeleteIntoDb = async (id: string) => {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
  });

  if (!subcategory) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
  }

  const result = await prisma.subcategory.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });

  return result;
};

const updateSubCategory = async (
  id: string,
  data: Partial<any>,
  file?: Express.Multer.File,
) => {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
  });

  if (!subcategory) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
  }

  let fileUrl: string | null = subcategory.image || null;

  if (file) {
    const uploaded = await uploadToDigitalOceanAWS(file);
    fileUrl = uploaded.Location;
  }

  const updateData: any = {
    name: data.name ?? subcategory.name,
    description: data.description ?? subcategory.description,
    categoryType: data.categoryType ?? subcategory.categoryType,
    isPremium: data.isPremium ?? subcategory.isPremium,
    premiumPrice: data.premiumPrice ?? subcategory.premiumPrice,
    image: fileUrl,
  };

  const updated = await prisma.subcategory.update({
    where: { id },
    data: updateData,
  });

  return {
    message: 'Subcategory updated successfully',
    data: updated,
  };
};

export const SubcategoryServices = {
  createSubcategory,
  getAllSubcategories,
  getPlacesBySubcategory,
  deleteIntoDb,
  softDeleteIntoDb,
  updateSubCategory,
};
