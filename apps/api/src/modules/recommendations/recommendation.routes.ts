import { Router } from 'express';
import { RecommendationController } from './recommendation.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new RecommendationController();

router.use(authenticate);
router.get('/', controller.getRecommendations);
router.post('/generate', controller.generateRecommendations);

export default router;
