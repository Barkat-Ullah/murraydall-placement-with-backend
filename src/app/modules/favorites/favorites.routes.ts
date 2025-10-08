import express from 'express';
import { FavoriteController } from './favorites.controller';
import auth from '../../middlewares/auth'; 

const router = express.Router();

router.get('/guest', FavoriteController.getGuestFavorites);
router.get('/user', auth('USER'), FavoriteController.getUserFavorites);
router.post('/user', auth('USER'), FavoriteController.toggleUserFavorite);
router.post('/guest', FavoriteController.toggleGuestFavorite);

export const FavoriteRoutes = router;
