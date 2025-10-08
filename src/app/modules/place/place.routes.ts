import express from 'express';
import { PlaceController } from './place.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { upload } from '../../utils/fileUploader';

const router = express.Router();

router.get('/', PlaceController.getAllPlace);

router.get('/my', PlaceController.getMyPlace);
router.get('/:id', PlaceController.getPlaceById);

router.post(
  '/',
  upload.single('image'),
  auth(UserRoleEnum.ADMIN),
  PlaceController.createIntoDb,
);
router.post(
  '/create-payment',
  auth(UserRoleEnum.USER),
  PlaceController.assignPaymentForPremiumPlace,
);

router.patch(
  '/:id',
  upload.single('file'),
  auth(UserRoleEnum.ADMIN),
  PlaceController.updateIntoDb,
);

router.delete('/:id', auth(UserRoleEnum.ADMIN), PlaceController.deleteIntoDb);

export const PlaceRoutes = router;
