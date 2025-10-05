import express from 'express';
import { GuestController } from './guest.controller';

const router = express.Router();

router.get('/my', GuestController.getMyGuest);
router.post('/', GuestController.createOrGetGuest);

export const GuestRoutes = router;
