import express from 'express';
import { FavoriteController } from './favorites.controller';


const router = express.Router();

// Toggle favorite (POST - for simplicity; can be PUT if preferred)
router.post('/', FavoriteController.toggleFavorite);

// Optional: Get user's/guest's favorites (for UI load)
router.get('/', FavoriteController.getFavorites);

export const FavoriteRoutes = router;
