// Updated webhook handler in your payment controller or utils (integrate into existing StripeWebHook)
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import catchAsync from './catchAsync';
import sendResponse from './sendResponse';
import Stripe from 'stripe';
import config from '../../config';
import { prisma } from './prisma';
import { stripe } from './stripe';
import { PaymentStatus } from '@prisma/client';

export const StripeWebHook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    throw new AppError(httpStatus.NOT_FOUND, 'Missing Stripe signature');
  }

  const result = await StripeHook(req.body, sig);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Webhook processed successfully',
    data: result,
  });
});

const StripeHook = async (
  rawBody: Buffer,
  signature: string | string[] | undefined,
) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature as string,
      config.stripe.stripe_webhook as string,
    );
  } catch (err) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${(err as Error).message}`,
    );
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Find and update payment
      const existingPayment = await prisma.payment.findUnique({
        where: { stripePaymentId: paymentIntent.id },
        include: { user: true },
      });

      if (existingPayment) {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            amount: paymentIntent.amount / 100, 
            stripeCustomerId: paymentIntent.customer as string,
          },
        });

        // Unlock premium if not already (one-time)
        const user = existingPayment.user;
        if (user && !user.hasPremiumAccess) {
          await prisma.user.update({
            where: { id: user.id },
            data: { hasPremiumAccess: true },
          });
          console.log(`Premium access unlocked for user ${user.id}`);
        }
      } else {
        console.log(
          `No payment record found for PaymentIntent ${paymentIntent.id}`,
        );
      }
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCanceled(session);
      break;
    }

    // Other cases (invoice, failed) as in your existing code
    default:
      console.log('Unhandled Stripe event type:', event.type);
      return { status: 'unhandled_event', type: event.type };
  }
};

// Updated handleCheckoutSessionCompleted (for one-time checkout)
const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session,
) => {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.log('No userId in session metadata, skipping unlock');
    return;
  }

  // Find payment record by session ID
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: session.id },
    include: { user: true },
  });

  if (!payment) {
    console.log(`No payment record for session ${session.id}`);
    return;
  }

  // Update payment to success
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.SUCCESS,
      amount: (session.amount_total || 0) / 100, 
      stripePaymentId: session.payment_intent as string,
      stripeCustomerId: session.customer as string,
    },
  });

  // Unlock premium (one-time check)
  const user = payment.user;
  if (user && !user.hasPremiumAccess) {
    await prisma.user.update({
      where: { id: user.id },
      data: { hasPremiumAccess: true },
    });
    console.log(
      `Premium access unlocked for user ${user.id} via session ${session.id}`,
    );
  }

  return payment;
};

// handleCheckoutSessionCanceled remains the same (update to CANCELED)
const handleCheckoutSessionCanceled = async (
  session: Stripe.Checkout.Session,
) => {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.CANCELED,
      stripeSessionId: session.id,
    },
  });

  return await prisma.payment.findUnique({ where: { id: paymentId } });
};
