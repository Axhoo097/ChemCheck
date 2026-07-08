import Tesseract from 'tesseract.js';
import { logger } from '../config/logger';

export class OcrService {
  async extractText(imagePath: string): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => {
            if (m.status === 'recognizing text' && m.progress % 0.1 < 0.01) {
                logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
        }
      });
      return text;
    } catch (error) {
      logger.error('OCR error:', error);
      throw new Error('Failed to extract text from image');
    }
  }
}
