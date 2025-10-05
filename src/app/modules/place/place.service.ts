// services/place.service.ts (completed)
import {
  PrismaClient,
  CategoryTypePlace,
  SubscriptionType,
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
  // Check required user fields for Stripe
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
  if (!subscription.stripePriceId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Subscription plan is missing Stripe Price ID. Contact support.',
    );
  }

  try {
    // B. Get or Create Stripe Customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user.id },
      });
      console.log('Created Stripe customer:', customer.id);
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const retrievedMethod = await stripe.paymentMethods.retrieve(methodId);
    console.log('Retrieved PaymentMethod:', retrievedMethod.id); // If this fails, error is here

    // If using Stripe Connect, add stripeAccount header if needed: { stripeAccount: 'acct_xxx' }
    await stripe.paymentMethods.attach(methodId, { customer: customerId });

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: methodId },
    });

    // D. Create Stripe Subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: subscription.stripePriceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    // E. Extract PaymentIntent (uncomment clientSecret if needed for 3D Secure)
    const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Payment initiation failed. Could not retrieve payment intent.',
      );
    }

    return {
      message: 'Payment initiation successful.',
    };
  } catch (error: any) {
    console.error('Stripe Subscription Creation Error:', error);
    if (
      error.type === 'StripeInvalidRequestError' &&
      error.code === 'resource_missing'
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Invalid PaymentMethod ID: ${methodId}. Ensure it's created with the correct API keys and try again.`,
      );
    }
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
