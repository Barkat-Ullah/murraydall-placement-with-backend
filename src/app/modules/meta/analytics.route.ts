

// routes/metaRoutes.js (updated)
import express from 'express';
import { UserRoleEnum } from '@prisma/client';
import auth from '../../middlewares/auth';
import { getDashboard } from './analytics.controller';


const router = express.Router();

router.get('/admin', auth(UserRoleEnum.ADMIN), getDashboard);

export const MetaRoutes = router;
