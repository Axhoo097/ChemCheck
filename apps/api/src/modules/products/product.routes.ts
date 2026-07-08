import { Router } from 'express';
import { ProductController } from './product.controller';
import { validate } from '../../middleware/validate';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { scanLimiter } from '../../middleware/rateLimiter';
import { upload } from '../../middleware/upload';
import { scanBarcodeSchema, searchProductSchema, compareProductsSchema } from './product.schemas';

const router = Router();
const controller = new ProductController();

router.get('/search', optionalAuth, validate(searchProductSchema, 'query'), controller.searchProducts);
router.get('/:id', optionalAuth, controller.getProduct);
router.post('/scan/barcode', authenticate, scanLimiter, validate(scanBarcodeSchema), controller.scanBarcode);
router.post('/scan/ocr', authenticate, scanLimiter, upload.single('image'), controller.scanOCR);
router.get('/:id/analysis', optionalAuth, controller.getAnalysis);
router.post('/compare', optionalAuth, validate(compareProductsSchema), controller.compareProducts);

export default router;
