import { Router } from 'express';
import { settingsController } from '../modules/settings/settings.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { asyncHandler } from '../shared/response';

export const settingsRouter = Router();

settingsRouter.use(authenticateJwt);

settingsRouter.get('/', asyncHandler(settingsController.getSettings.bind(settingsController)));
settingsRouter.post('/', asyncHandler(settingsController.updateSettings.bind(settingsController)));

export default settingsRouter;
