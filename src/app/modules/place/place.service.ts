// services/place.service.ts (completed)
import {
  PrismaClient,
  CategoryTypePlace,
  SubscriptionType,
  PaymentStatus,
} from '@prisma/client';
import { Request } from 'express';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { stripe } from '../../utils/stripe';
import Stripe from 'stripe';

const prisma = new PrismaClient();

const createIntoDb = async (req: Request) => {
  const userId = req.user.id;
  const {
    placeTitle,
    placeDescription,
    placeLocation,
    aboutPlace,
    how_to_go_there,
    suggested_Visit_Time,
    categoryType,
    subcategoryId,
    price,
    stripePriceId,
    stripeProductId,
    subscriptionType,
  } = JSON.parse(req.body.data);

  const file = req.file as Express.Multer.File | undefined;
  let fileUrl: string | null = null;
  if (file) {
    const location = await uploadToDigitalOceanAWS(file);
    fileUrl = location.Location;
  }

  // Validate required fields
  if (
    !placeTitle ||
    !placeDescription ||
    !placeLocation ||
    !categoryType ||
    !userId
  ) {
    throw new Error(
      'Required fields missing: placeTitle, placeDescription, placeLocation, categoryType, userId',
    );
  }

  // Fetch subcategory if provided
  let subcategory = null;
  if (subcategoryId) {
    subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
    });
    if (!subcategory) {
      throw new Error('Invalid subcategory ID');
    }
  }

  // Auto-set price and subscriptionType based on subcategory (override if provided, but logic prefers auto)
  let finalPrice = price || 0;
  let finalSubscriptionType = subscriptionType || SubscriptionType.FREE;
  let finalStripePriceId = stripePriceId || null;
  let finalStripeProductId = stripeProductId || null;

  if (subcategory && subcategory.isPremium) {
    finalPrice = subcategory.premiumPrice || 10.0;
    finalSubscriptionType = SubscriptionType.PREMIUM;
    finalStripePriceId = subcategory.stripePriceId || null;
    finalStripeProductId = subcategory.stripeProductId || null;
  }

  // Create place
  const result = await prisma.place.create({
    data: {
      placeTitle,
      placeDescription,
      placeLocation,
      imageUrl: fileUrl,
      aboutPlace,
      how_to_go_there,
      suggested_Visit_Time,
      categoryType: categoryType as CategoryTypePlace,
      subcategoryId,
      price: finalPrice,
      stripePriceId: finalStripePriceId,
      stripeProductId: finalStripeProductId,
      subscriptionType: finalSubscriptionType,
      userId,
    },
    select: {
      id: true,
      placeTitle: true,
      placeDescription: true,
      placeLocation: true,
      aboutPlace: true,
      how_to_go_there: true,
      suggested_Visit_Time: true,
      imageUrl: true,
      categoryType: true,
      subcategoryId: true,
      price: true,
      stripePriceId: true,
      stripeProductId: true,
      subscriptionType: true,
      subcategory: {
        select: {
          id: true,
          name: true,
          description: true,
          categoryType: true,
          isPremium: true,
          premiumPrice: true,
          stripePriceId: true,
          stripeProductId: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return result;
};

const assignPaymentForPremiumPlace = async (userId: string, payload: any) => {
  console.log(payload);
  const { subcategoryId, methodId } = payload;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  if (!user.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User profile must be complete (email and name) before purchasing a subscription.',
    );
  }

  if (!methodId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment method ID is required for paid subscriptions.',
    );
  }

  const subscription = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
  });

  if (!subscription) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Subscription not found');
  }

  if (!subscription.premiumPrice) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Premium price not found for this subcategory.',
    );
  }

  try {
    // ✅ Step 1: Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName || 'Unknown User',
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // ✅ Step 2: Attach payment method to customer
    await stripe.paymentMethods.attach(methodId, { customer: customerId });

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: methodId },
    });

    // ✅ Step 3: Create one-time PaymentIntent (not subscription)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(subscription.premiumPrice * 100), // cents
      currency: 'usd',
      customer: customerId,
      payment_method: methodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // prevent redirect payment methods
      },
      description: `Payment for premium subcategory: ${subscription.name}`,
      metadata: {
        userId,
        subcategoryId: subscription.id,
      },
    });

    // ✅ Step 4: Save payment in DB as PENDING
    await prisma.payment.create({
      data: {
        userId,
        amount: subscription.premiumPrice,
        currency: 'usd',
        status: PaymentStatus.PENDING,
        stripePaymentId: paymentIntent.id,
        stripeCustomerId: customerId,
      },
    });

    // ✅ Step 5: Return response
    return {
      success: true,
      message: 'Payment initiated successfully.',
      client_secret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error('Stripe PaymentIntent Error:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to initiate payment with Stripe: ${error.message || 'Unknown error'}. Please try again.`,
    );
  }
};


const getAllPlace = async (query: Record<string, any>, userId?: string) => {
  const {
    categoryType,
    subcategoryName,
    limit = 10,
    page = 1,
    premiumOnly = false,
  } = query;
  const skip = (Number(page) - 1) * Number(limit);

  let where: any = {};

  if (categoryType) {
    where.categoryType = categoryType as CategoryTypePlace;
  }

  if (subcategoryName) {
    where.subcategory = { name: subcategoryName };
  }

  if (premiumOnly === 'true') {
    where.subscriptionType = SubscriptionType.PREMIUM;
  }

  const [result, total] = await Promise.all([
    prisma.place.findMany({
      where,
      select: {
        id: true,
        placeTitle: true,
        placeDescription: true,
        placeLocation: true,
        aboutPlace: true,
        how_to_go_there: true,
        suggested_Visit_Time: true,
        imageUrl: true,
        categoryType: true,
        subcategoryId: true,
        price: true,
        stripePriceId: true,
        stripeProductId: true,
        subscriptionType: true,
        subcategory: {
          select: {
            id: true,
            name: true,
            description: true,
            categoryType: true,
            isPremium: true,
            premiumPrice: true,
            stripePriceId: true,
            stripeProductId: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.place.count({ where }),
  ]);

  return {
    data: result,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getMyPlace = async (userId: string) => {
  console.log('Fetching my place for user:', userId);

  // For user's own places, show all (including premium they created)
  const result = await prisma.place.findMany({
    where: { userId },
    include: {
      subcategory: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return result;
};

const getPlaceByIdFromDB = async (id: string) => {
  console.log('Fetching place by ID:', id);

  const result = await prisma.place.findUnique({
    where: { id },
    select: {
      id: true,
      placeTitle: true,
      placeDescription: true,
      placeLocation: true,
      aboutPlace: true,
      how_to_go_there: true,
      suggested_Visit_Time: true,
      imageUrl: true,
      categoryType: true,
      subcategoryId: true,
      price: true,
      stripePriceId: true,
      stripeProductId: true,
      subscriptionType: true,
      subcategory: {
        select: {
          id: true,
          name: true,
          description: true,
          categoryType: true,
          isPremium: true,
          premiumPrice: true,
          stripePriceId: true,
          stripeProductId: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!result) {
    throw new Error('Place not found');
  }

  // If premium, in full app, check user.hasPremiumAccess here if userId provided, but since public, assume show if free
  if (result.subscriptionType === SubscriptionType.PREMIUM) {
    // For now, return but in real, filter or throw if not accessible
  }

  return result;
};

const updateIntoDb = async (id: string, data: Partial<any>) => {
  console.dir({ id, data });

  // Fetch existing to check subcategory changes
  const existing = await prisma.place.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Place not found');
  }

  let updateData: any = { ...data };

  // Handle subcategory change
  if (data.subcategoryId && data.subcategoryId !== existing.subcategoryId) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: data.subcategoryId },
    });
    if (subcategory) {
      updateData.price = subcategory.isPremium
        ? subcategory.premiumPrice || 10.0
        : 0;
      updateData.subscriptionType = subcategory.isPremium
        ? SubscriptionType.PREMIUM
        : SubscriptionType.FREE;
      updateData.stripePriceId = subcategory.stripePriceId || null;
      updateData.stripeProductId = subcategory.stripeProductId || null;
    }
  }

  const result = await prisma.place.update({
    where: { id },
    data: updateData,
    include: {
      subcategory: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return result;
};

const deleteIntoDb = async (id: string) => {
  console.log('Deleting place:', id);

  const result = await prisma.place.delete({
    where: { id },
  });

  return result;
};

const softDeleteIntoDb = async (id: string) => {
  console.log('Soft deleting place:', id);
};

export const PlaceServices = {
  createIntoDb,
  getAllPlace,
  getMyPlace,
  getPlaceByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
  assignPaymentForPremiumPlace,
};
