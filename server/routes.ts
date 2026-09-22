import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { store, Product } from './data/store';
import { calculateBaseScore, personalizeScore } from './services/scoring';
import { matchIngredientTokens, splitIngredientText } from './services/ocr';

const router = express.Router();
const JWT_SECRET = process.env.SECRET_KEY || 'chemcheck-super-secret-key-2026';

// Helper for standard envelope
function success(data: any, meta?: any) {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

function failure(code: string, message: string, status = 400, details = {}) {
  return { success: false, error: { code, message, details } };
}

// Auth middleware (optional or required)
function getUserFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If client sends x-user-id for easy dev testing, support it as fallback
    const userIdHeader = req.headers['x-user-id'] as string;
    if (userIdHeader && store.users.has(userIdHeader)) {
      return store.users.get(userIdHeader) || null;
    }
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return store.users.get(payload.sub) || null;
  } catch {
    return null;
  }
}

// ── Health ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json(success({ status: 'ok', time: new Date().toISOString() }));
});

// ── Auth ───────────────────────────────────────────────────────────────
router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json(failure('VALIDATION_ERROR', 'Email and password are required.'));
  }
  const existing = Array.from(store.users.values()).find((u) => u.email === email);
  if (existing) {
    return res.status(409).json(failure('EMAIL_ALREADY_EXISTS', 'A user with this email already exists.'));
  }
  const newUser = {
    id: uuidv4(),
    name: name || email.split('@')[0],
    email,
    password_hash: password, // in-memory demo
    created_at: new Date().toISOString(),
    is_admin: false,
  };
  store.users.set(newUser.id, newUser);
  res.status(201).json(success(newUser));
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = Array.from(store.users.values()).find((u) => u.email === email);
  if (!user || user.password_hash !== password) {
    // Allow login for demo user
    if (email === 'demo@chemcheck.io') {
      const demoUser = store.users.get('demo-user-123')!;
      const token = jwt.sign({ sub: demoUser.id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json(success({ access_token: token, token_type: 'bearer' }));
    }
    return res.status(401).json(failure('INVALID_CREDENTIALS', 'Incorrect email or password.'));
  }
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json(success({ access_token: token, token_type: 'bearer' }));
});

router.get('/auth/me', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123');
  if (!user) {
    return res.status(401).json(failure('UNAUTHORIZED', 'Authentication required.'));
  }
  res.json(success(user));
});

router.put('/auth/me', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123');
  if (!user) {
    return res.status(401).json(failure('UNAUTHORIZED', 'Authentication required.'));
  }
  const { name, skin_type, hair_type, diet_preference } = req.body;
  if (name !== undefined) user.name = name;
  if (skin_type !== undefined) user.skin_type = skin_type;
  if (hair_type !== undefined) user.hair_type = hair_type;
  if (diet_preference !== undefined) user.diet_preference = diet_preference;
  res.json(success(user));
});

// ── Products ───────────────────────────────────────────────────────────
router.get('/products', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(100, parseInt(req.query.page_size as string) || 20);
  const category = req.query.category as string | undefined;
  const q = (req.query.q as string | undefined)?.toLowerCase();

  let items = Array.from(store.products.values());
  if (category) {
    items = items.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (q) {
    items = items.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }

  const totalCount = items.length;
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  // Attach quick score preview to each product
  const enriched = pagedItems.map((prod) => {
    const ingredients = store.getIngredientsForProduct(prod.id);
    const scoreRes = calculateBaseScore(ingredients);
    return {
      ...prod,
      score: scoreRes.score,
      category_rating: scoreRes.category,
      ingredient_count: ingredients.length,
      allergen_count: scoreRes.allergen_count,
      concern_count: scoreRes.concern_count,
    };
  });

  res.json(
    success(enriched, {
      page,
      page_size: pageSize,
      total_count: totalCount,
      total_pages: Math.ceil(totalCount / pageSize),
    })
  );
});

router.get('/products/:product_id', (req, res) => {
  const product = store.products.get(req.params.product_id);
  if (!product) {
    return res.status(404).json(failure('NOT_FOUND', 'Product not found.', 404));
  }
  const ingredients = store.getIngredientsForProduct(product.id);
  const scoreRes = calculateBaseScore(ingredients);
  res.json(
    success({
      ...product,
      score: scoreRes.score,
      category_rating: scoreRes.category,
      ingredients,
    })
  );
});

router.get('/products/:product_id/analyze', (req, res) => {
  const product = store.products.get(req.params.product_id);
  if (!product) {
    return res.status(404).json(failure('NOT_FOUND', 'Product not found.', 404));
  }

  const ingredients = store.getIngredientsForProduct(product.id);
  const baseScore = calculateBaseScore(ingredients);

  // Check optional user for personalization
  const currentUser = getUserFromRequest(req);
  if (!currentUser) {
    return res.json(success(baseScore));
  }

  // Get user sensitivities
  const userSens = store.sensitivities.filter((s) => s.user_id === currentUser.id);
  const sensIds = new Set(userSens.map((s) => s.ingredient_id));

  // Get user reactions
  const userReacts = store.reactions.filter((r) => r.user_id === currentUser.id);
  const reactionIngIds = new Set<string>();
  for (const r of userReacts) {
    const reactedProductIngs = store.getIngredientsForProduct(r.product_id);
    for (const ing of reactedProductIngs) {
      if (!sensIds.has(ing.id)) {
        reactionIngIds.add(ing.id);
      }
    }
  }

  const personalized = personalizeScore(baseScore, ingredients, sensIds, reactionIngIds);
  res.json(success(personalized));
});

router.get('/products/:product_id/alternatives', (req, res) => {
  const product = store.products.get(req.params.product_id);
  if (!product) {
    return res.status(404).json(failure('NOT_FOUND', 'Product not found.', 404));
  }

  const currentIngs = store.getIngredientsForProduct(product.id);
  const currentBase = calculateBaseScore(currentIngs);

  const currentUser = getUserFromRequest(req);
  const userSensIds = currentUser
    ? new Set(
        store.sensitivities
          .filter((s) => s.user_id === currentUser.id)
          .map((s) => s.ingredient_id)
      )
    : new Set<string>();

  const sameCategory = Array.from(store.products.values()).filter(
    (p) => p.category === product.category && p.id !== product.id
  );

  const scoredAlternatives = sameCategory
    .map((p) => {
      const ings = store.getIngredientsForProduct(p.id);
      let scoreRes = calculateBaseScore(ings);
      if (currentUser) {
        scoreRes = personalizeScore(scoreRes, ings, userSensIds);
      }
      return {
        product: p,
        score: scoreRes.score,
        category: scoreRes.category,
        concern_count: scoreRes.concern_count,
        allergen_count: scoreRes.allergen_count,
        has_user_sensitivity: ings.some((i) => userSensIds.has(i.id)),
      };
    })
    // Exclude alternatives that trigger user sensitivities
    .filter((a) => !a.has_user_sensitivity)
    .sort((a, b) => b.score - a.score);

  res.json(success(scoredAlternatives));
});

router.get('/products/:product_id/alerts', (req, res) => {
  const alerts = store.alerts.filter((a) => a.product_id === req.params.product_id);
  res.json(success(alerts));
});

router.get('/products/:product_id/explain', (req, res) => {
  const product = store.products.get(req.params.product_id);
  if (!product) {
    return res.status(404).json(failure('NOT_FOUND', 'Product not found.', 404));
  }

  const ingredients = store.getIngredientsForProduct(product.id);
  const baseScore = calculateBaseScore(ingredients);

  let explanation = '';
  if (baseScore.category === 'Best') {
    explanation = `${product.name} achieves a high ChemCheck safety score of ${baseScore.score}/100 ('Best'). Its formulation relies predominantly on low-risk hydrating, soothing, or barrier-support ingredients with minimal concern profiles.`;
  } else if (baseScore.category === 'Better') {
    explanation = `${product.name} scored ${baseScore.score}/100 ('Better'). While functional and safe for most users, it contains ${baseScore.concern_count} moderate-risk ingredient(s)${baseScore.allergen_count > 0 ? ` and ${baseScore.allergen_count} recognized allergen(s)` : ''} that sensitive individuals may want to monitor.`;
  } else {
    explanation = `${product.name} received a score of ${baseScore.score}/100 ('Worst'). It contains notable risk or sensitizing agents that result in substantial deductions under our deterministic safety scoring methodology.`;
  }

  res.json(
    success({
      explanation,
      score: baseScore.score,
      category: baseScore.category,
      product_name: product.name,
    })
  );
});

router.post('/products', (req, res) => {
  const { name, brand, category, barcode, description, image_url, ingredient_ids } = req.body;
  if (!name || !brand || !category) {
    return res.status(422).json(failure('VALIDATION_ERROR', 'Name, brand, and category are required.'));
  }
  const newProduct: Product = {
    id: uuidv4(),
    name,
    brand,
    category,
    barcode: barcode || null,
    description: description || null,
    image_url: image_url || null,
    created_at: new Date().toISOString(),
  };
  store.products.set(newProduct.id, newProduct);

  if (Array.isArray(ingredient_ids)) {
    for (const ingId of ingredient_ids) {
      if (store.ingredients.has(ingId)) {
        store.productIngredients.push({
          id: uuidv4(),
          product_id: newProduct.id,
          ingredient_id: ingId,
        });
      }
    }
  }

  res.status(201).json(success(newProduct));
});

router.put('/products/:product_id', (req, res) => {
  const product = store.products.get(req.params.product_id);
  if (!product) {
    return res.status(404).json(failure('NOT_FOUND', 'Product not found.', 404));
  }
  const { name, brand, category, barcode, description, image_url } = req.body;
  if (name !== undefined) product.name = name;
  if (brand !== undefined) product.brand = brand;
  if (category !== undefined) product.category = category;
  if (barcode !== undefined) product.barcode = barcode;
  if (description !== undefined) product.description = description;
  if (image_url !== undefined) product.image_url = image_url;
  res.json(success(product));
});

router.delete('/products/:product_id', (req, res) => {
  const id = req.params.product_id;
  if (!store.products.has(id)) {
    return res.status(404).json(failure('NOT_FOUND', 'Product not found.', 404));
  }
  store.products.delete(id);
  store.productIngredients = store.productIngredients.filter((pi) => pi.product_id !== id);
  store.alerts = store.alerts.filter((a) => a.product_id !== id);
  res.status(204).send();
});

// ── Product Ingredients ────────────────────────────────────────────────
router.get('/products/:product_id/ingredients', (req, res) => {
  const ingredients = store.getIngredientsForProduct(req.params.product_id);
  res.json(success(ingredients));
});

router.post('/products/:product_id/ingredients', (req, res) => {
  const { ingredient_ids } = req.body;
  const productId = req.params.product_id;
  if (!store.products.has(productId)) {
    return res.status(404).json(failure('NOT_FOUND', 'Product not found.', 404));
  }
  if (!Array.isArray(ingredient_ids)) {
    return res.status(422).json(failure('VALIDATION_ERROR', 'ingredient_ids array required.'));
  }
  for (const ingId of ingredient_ids) {
    if (
      store.ingredients.has(ingId) &&
      !store.productIngredients.some(
        (pi) => pi.product_id === productId && pi.ingredient_id === ingId
      )
    ) {
      store.productIngredients.push({
        id: uuidv4(),
        product_id: productId,
        ingredient_id: ingId,
      });
    }
  }
  res.status(201).json(success(store.getIngredientsForProduct(productId)));
});

router.delete('/products/:product_id/ingredients/:ingredient_id', (req, res) => {
  const { product_id, ingredient_id } = req.params;
  store.productIngredients = store.productIngredients.filter(
    (pi) => !(pi.product_id === product_id && pi.ingredient_id === ingredient_id)
  );
  res.status(204).send();
});

// ── Ingredients ────────────────────────────────────────────────────────
router.get('/ingredients', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(100, parseInt(req.query.page_size as string) || 20);
  const q = (req.query.q as string | undefined)?.toLowerCase();
  const risk = req.query.risk_level as string | undefined;

  let items = Array.from(store.ingredients.values());
  if (q) {
    items = items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.function.toLowerCase().includes(q)
    );
  }
  if (risk) {
    items = items.filter((i) => i.risk_level === risk);
  }

  const totalCount = items.length;
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  res.json(
    success(pagedItems, {
      page,
      page_size: pageSize,
      total_count: totalCount,
      total_pages: Math.ceil(totalCount / pageSize),
    })
  );
});

router.get('/ingredients/search', (req, res) => {
  const q = (req.query.q as string | undefined)?.toLowerCase();
  if (!q) {
    return res.json(success([]));
  }
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const matches = Array.from(store.ingredients.values())
    .filter((i) => i.name.toLowerCase().includes(q) || i.function.toLowerCase().includes(q))
    .slice(0, limit);
  res.json(success(matches));
});

router.get('/ingredients/:ingredient_id', (req, res) => {
  const ing = store.ingredients.get(req.params.ingredient_id);
  if (!ing) {
    return res.status(404).json(failure('NOT_FOUND', 'Ingredient not found.', 404));
  }
  res.json(success(ing));
});

// ── Sensitivities ──────────────────────────────────────────────────────
router.get('/me/sensitivities', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123')!;
  const userSens = store.sensitivities.filter((s) => s.user_id === user.id);
  const enriched = userSens.map((s) => ({
    ...s,
    ingredient: store.ingredients.get(s.ingredient_id),
  }));
  res.json(success(enriched));
});

router.post('/me/sensitivities', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123')!;
  const { ingredient_id, severity_note } = req.body;
  if (!ingredient_id || !store.ingredients.has(ingredient_id)) {
    return res.status(422).json(failure('VALIDATION_ERROR', 'Valid ingredient_id required.'));
  }

  const existing = store.sensitivities.find(
    (s) => s.user_id === user.id && s.ingredient_id === ingredient_id
  );
  if (existing) {
    existing.severity_note = severity_note;
    return res.json(success({ ...existing, ingredient: store.ingredients.get(ingredient_id) }));
  }

  const newSens = {
    id: uuidv4(),
    user_id: user.id,
    ingredient_id,
    severity_note: severity_note || null,
    created_at: new Date().toISOString(),
  };
  store.sensitivities.push(newSens);
  res.status(201).json(success({ ...newSens, ingredient: store.ingredients.get(ingredient_id) }));
});

router.delete('/me/sensitivities/:ingredient_id', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123')!;
  store.sensitivities = store.sensitivities.filter(
    (s) => !(s.user_id === user.id && s.ingredient_id === req.params.ingredient_id)
  );
  res.status(204).send();
});

// ── Reactions ──────────────────────────────────────────────────────────
router.get('/me/reactions', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123')!;
  const userReacts = store.reactions.filter((r) => r.user_id === user.id);
  const enriched = userReacts.map((r) => ({
    ...r,
    product: store.products.get(r.product_id),
  }));
  res.json(success(enriched));
});

router.post('/me/reactions', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123')!;
  const { product_id, symptoms, severity, date_occurred, notes } = req.body;
  if (!product_id || !store.products.has(product_id)) {
    return res.status(422).json(failure('VALIDATION_ERROR', 'Valid product_id required.'));
  }

  const newReaction = {
    id: uuidv4(),
    user_id: user.id,
    product_id,
    symptoms: symptoms || 'Mild redness or irritation',
    severity: severity || 'mild',
    date_occurred: date_occurred || new Date().toISOString().split('T')[0],
    notes: notes || null,
    created_at: new Date().toISOString(),
  };
  store.reactions.push(newReaction);

  // Suggested sensitivities based on ingredients in that product with allergen or medium/high risk
  const ings = store.getIngredientsForProduct(product_id);
  const existingSensIds = new Set(
    store.sensitivities.filter((s) => s.user_id === user.id).map((s) => s.ingredient_id)
  );
  const suggestions = ings
    .filter((i) => !existingSensIds.has(i.id) && (i.is_allergen || i.risk_level !== 'low'))
    .map((i) => ({
      ingredient_id: i.id,
      name: i.name,
      reason: i.is_allergen
        ? 'Common allergen present in the reacted product'
        : `${i.risk_level}-risk chemical agent in the reacted product`,
    }));

  res.status(201).json(
    success({
      reaction: {
        ...newReaction,
        product: store.products.get(product_id),
      },
      suggested_sensitivities: suggestions,
    })
  );
});

// ── Scan ───────────────────────────────────────────────────────────────
router.post('/scan/label', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json(failure('NO_TEXT_PROVIDED', 'Ingredient text is required.'));
  }

  const tokens = splitIngredientText(text);
  const { matched, unmatched } = matchIngredientTokens(tokens);

  // Compute immediate score of the matched formula!
  const matchedIngredients = matched.map((m) => m.ingredient);
  const scoreResult = calculateBaseScore(matchedIngredients);

  res.json(
    success({
      raw_text: text,
      matched,
      unmatched,
      score: scoreResult,
    })
  );
});

router.post('/scan/barcode', (req, res) => {
  const { barcode } = req.body;
  if (!barcode) {
    return res.status(400).json(failure('BARCODE_NOT_DETECTED', 'Barcode is required.'));
  }

  const localProduct = Array.from(store.products.values()).find((p) => p.barcode === barcode);
  if (localProduct) {
    const ings = store.getIngredientsForProduct(localProduct.id);
    const score = calculateBaseScore(ings);
    return res.json(
      success({
        barcode,
        source: 'local',
        product: { ...localProduct, score: score.score, category_rating: score.category },
      })
    );
  }

  // Fallback demo product for unknown barcodes
  res.status(404).json(failure('PRODUCT_NOT_FOUND', `No product found for barcode ${barcode}.`, 404));
});

// ── Reviews & Admin Alerts ─────────────────────────────────────────────
router.get('/products/:product_id/reviews', (req, res) => {
  const reviews = store.reviews.filter((r) => r.product_id === req.params.product_id);
  res.json(success(reviews));
});

router.post('/reviews', (req, res) => {
  const user = getUserFromRequest(req) || store.users.get('demo-user-123')!;
  const { product_id, rating, comment } = req.body;
  if (!product_id || !rating) {
    return res.status(422).json(failure('VALIDATION_ERROR', 'product_id and rating required.'));
  }
  const newRev = {
    id: uuidv4(),
    user_id: user.id,
    product_id,
    rating: Number(rating),
    comment: comment || null,
    created_at: new Date().toISOString(),
  };
  store.reviews.push(newRev);
  res.status(201).json(success(newRev));
});

router.get('/admin/alerts', (req, res) => {
  res.json(success(store.alerts));
});

export default router;
