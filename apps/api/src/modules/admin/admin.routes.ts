import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();
const controller = new AdminController();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/dashboard', controller.getDashboard);

// Product management
router.get('/products', controller.getProducts);
router.post('/products', controller.createProduct);
router.patch('/products/:id', controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

// User management
router.get('/users', controller.getUsers);
router.patch('/users/:id', controller.updateUser);

// Chemical database
router.get('/ingredients', controller.getIngredients);

// Audit logs
router.get('/logs', controller.getLogs);

export default router;
