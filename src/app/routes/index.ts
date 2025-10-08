import express from 'express';
import { AssetRouters } from '../modules/Asset/asset.route';
import { AuthRouters } from '../modules/Auth/Auth.routes';
import { UserRouters } from '../modules/User/user.routes';
import { PaymentRoutes } from '../modules/Payment/payment.route';
import { MetaRoutes } from '../modules/meta/analytics.route';
import { SubcategoryRoutes } from '../modules/subCategory/subCategory.routes';
import { PlaceRoutes } from '../modules/place/place.routes';
import { CategoryRoutes } from '../modules/category/category.routes';
import { GuestRoutes } from '../modules/guest/guest.routes';
import { FavoriteRoutes } from '../modules/favorites/favorites.routes';


const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRouters,
  },
  {
    path: '/user',
    route: UserRouters,
  },
  {
    path: '/guest',
    route: GuestRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/meta',
    route: MetaRoutes,
  },
  {
    path: '/categories',
    route: CategoryRoutes,
  },
  {
    path: '/sub-category',
    route: SubcategoryRoutes,
  },
  {
    path: '/places',
    route: PlaceRoutes,
  },
  {
    path: '/my-favorite',
    route: FavoriteRoutes,
  },
  {
    path: '/assets',
    route: AssetRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
