import { Router } from 'express';
import { CommunityController } from './community.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';

const router = Router();
const controller = new CommunityController();

router.get('/feed', optionalAuth, controller.getFeed);
router.get('/reviews', optionalAuth, controller.getReviews);
router.post('/reviews', authenticate, controller.createReview);
router.put('/reviews/:id', authenticate, controller.updateReview);
router.delete('/reviews/:id', authenticate, controller.deleteReview);
router.post('/reviews/:id/helpful', optionalAuth, controller.markHelpful);

export default router;
