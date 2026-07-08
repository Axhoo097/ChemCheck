import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new UserController();

// All user routes require authentication
router.use(authenticate);

router.get('/profile', controller.getProfile);
router.put('/profile', controller.updateProfile);
router.get('/stats', controller.getStats);

router.get('/reactions', controller.getReactions);
router.post('/reactions', controller.logReaction);
router.delete('/reactions/:id', controller.deleteReaction);

router.get('/favorites', controller.getFavorites);
router.post('/favorites/:productId', controller.addFavorite);
router.delete('/favorites/:productId', controller.removeFavorite);

export default router;
