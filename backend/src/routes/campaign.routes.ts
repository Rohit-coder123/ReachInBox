import { Router } from 'express';
import multer from 'multer';
import { campaignController } from '../modules/campaign/campaign.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { asyncHandler } from '../shared/response';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

export const campaignRouter = Router();

campaignRouter.use(authenticateJwt);

// Recipient file parsing endpoint (CSV / TXT upload or raw text)
campaignRouter.post(
  '/parse',
  upload.single('file'),
  asyncHandler(campaignController.parseRecipients.bind(campaignController))
);

// Create and schedule campaign
campaignRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(campaignController.createCampaign.bind(campaignController))
);

// List campaigns
campaignRouter.get('/', asyncHandler(campaignController.getCampaigns.bind(campaignController)));

// Campaign detail
campaignRouter.get('/:id', asyncHandler(campaignController.getCampaignById.bind(campaignController)));

// Cancel campaign
campaignRouter.post('/:id/cancel', asyncHandler(campaignController.cancelCampaign.bind(campaignController)));

export default campaignRouter;
