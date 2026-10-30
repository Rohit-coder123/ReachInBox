import { Router } from 'express';
import { searchController } from '../modules/search/search.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { asyncHandler } from '../shared/response';

export const searchRouter = Router();

searchRouter.use(authenticateJwt);

searchRouter.get('/', asyncHandler(searchController.search.bind(searchController)));
searchRouter.get('/autocomplete', asyncHandler(searchController.autocomplete.bind(searchController)));

export default searchRouter;
