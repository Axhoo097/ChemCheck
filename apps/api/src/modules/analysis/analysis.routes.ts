import { Router } from 'express';
import { AnalysisController } from './analysis.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';

const router = Router();
const controller = new AnalysisController();

router.get('/history', optionalAuth, controller.getHistory);
router.get('/report/:productId', optionalAuth, controller.getReport);
router.post('/analyze-text', optionalAuth, controller.analyzeText);
router.get('/ingredient/:name', optionalAuth, controller.getIngredientInfo);

export default router;
