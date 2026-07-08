import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data (in order of relations)
  await prisma.adminLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.userReaction.deleteMany({});
  await prisma.userFavorite.deleteMany({});
  await prisma.productComparison.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.toxicityReport.deleteMany({});
  await prisma.productIngredient.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.ingredient.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // 2. Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('user123', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@chemcheck.com',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@chemcheck.com',
      name: 'Jane Doe',
      passwordHash: userPasswordHash,
      role: 'USER',
      profile: {
        create: {
          skinType: 'DRY',
          hairType: 'NORMAL',
          allergies: JSON.stringify(['parabens', 'fragrance', 'sulfates']),
          dietaryPrefs: JSON.stringify(['vegan']),
          goals: JSON.stringify(['hydration', 'anti-aging']),
          age: 28,
          gender: 'Female',
        },
      },
    },
  });

  console.log('👤 Created Admin & User accounts.');

  // 4. Create Ingredients
  const ingredientsData = [
    // Safe / Clean ingredients
    {
      name: 'Aqua',
      inciName: 'Water',
      casNumber: '7732-18-5',
      riskScore: 0,
      category: 'Solvent',
      description: 'Primary liquid solvent used to dissolve other ingredients.',
      healthEffects: [],
      alternatives: [],
      sources: ['Natural'],
      aliases: ['water', 'purified water'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Glycerin',
      inciName: 'Glycerol',
      casNumber: '56-81-5',
      riskScore: 5,
      category: 'Humectant',
      description: 'A natural humectant that draws moisture into the skin, keeping it hydrated.',
      healthEffects: [],
      alternatives: [],
      sources: ['Plant-derived'],
      aliases: ['glycerol'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Aloe Barbadensis Leaf Juice',
      inciName: 'Aloe Vera Juice',
      casNumber: '85507-69-3',
      riskScore: 10,
      category: 'Botanical Extract',
      description: 'Soothes, cools, and hydrates skin. Anti-inflammatory properties.',
      healthEffects: [],
      alternatives: [],
      sources: ['Aloe Vera plant'],
      aliases: ['aloe vera extract', 'aloe juice'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Sodium Hyaluronate',
      inciName: 'Hyaluronic Acid Sodium Salt',
      casNumber: '9067-32-7',
      riskScore: 10,
      category: 'Humectant',
      description: 'Salt form of Hyaluronic Acid. Penetrates deep to hydrate skin layers.',
      healthEffects: [],
      alternatives: [],
      sources: ['Biotech fermentation'],
      aliases: ['hyaluronic acid'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Green Tea Extract',
      inciName: 'Camellia Sinensis Leaf Extract',
      casNumber: '84650-60-2',
      riskScore: 10,
      category: 'Antioxidant',
      description: 'Rich in polyphenols. Fights aging, reduces redness, regulates sebum.',
      healthEffects: [],
      alternatives: [],
      sources: ['Green tea leaves'],
      aliases: ['camellia sinensis extract'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Cocos Nucifera Oil',
      inciName: 'Coconut Oil',
      casNumber: '8001-31-8',
      riskScore: 15,
      category: 'Emollient',
      description: 'Nourishing oil, rich in fatty acids. Can be highly comedogenic (clog pores) on face.',
      healthEffects: [],
      alternatives: [],
      sources: ['Coconut fruit'],
      aliases: ['coconut oil'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Butyrospermum Parkii Butter',
      inciName: 'Shea Butter',
      casNumber: '194043-92-0',
      riskScore: 10,
      category: 'Emollient',
      description: 'Thick, nourishing butter that restores skin barrier and moisture.',
      healthEffects: [],
      alternatives: [],
      sources: ['Shea tree nuts'],
      aliases: ['shea butter'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Panthenol',
      inciName: 'Pro-Vitamin B5',
      casNumber: '81-13-0',
      riskScore: 15,
      category: 'Humectant / Soothing',
      description: 'Deeply hydrating, skin-healing agent. Promotes skin barrier recovery.',
      healthEffects: [],
      alternatives: [],
      sources: ['Synthetic'],
      aliases: ['vitamin b5', 'd-panthenol'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Tocopherol',
      inciName: 'Vitamin E',
      casNumber: '10191-41-0',
      riskScore: 15,
      category: 'Antioxidant / Preservative helper',
      description: 'Protects skin from free radicals and keeps skincare oils from going rancid.',
      healthEffects: [],
      alternatives: [],
      sources: ['Vegetable oils'],
      aliases: ['vitamin e'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 1,
    },
    {
      name: 'Citric Acid',
      inciName: 'Citric Acid',
      casNumber: '77-92-9',
      riskScore: 20,
      category: 'pH Adjuster',
      description: 'Used to adjust product pH to be skin-compatible. Gentle exfoliant in larger doses.',
      healthEffects: [],
      alternatives: [],
      sources: ['Citrus fruits'],
      aliases: ['citrate'],
      isNatural: true,
      isBanned: false,
      bannedIn: [],
      ewgScore: 2,
    },

    // Moderate Risk ingredients
    {
      name: 'Salicylic Acid',
      inciName: 'Salicylic Acid',
      casNumber: '69-72-7',
      riskScore: 35,
      category: 'Exfoliant',
      description: 'Beta hydroxy acid (BHA) that penetrates deep into pores to dissolve sebum.',
      healthEffects: ['Skin dryness', 'Mild irritation', 'Sun sensitivity'],
      alternatives: ['Tea Tree Oil', 'Willow Bark Extract'],
      sources: ['Willow bark', 'Synthetic'],
      aliases: ['bha'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 3,
    },
    {
      name: 'Phenoxyethanol',
      inciName: 'Phenoxyethanol',
      casNumber: '122-99-6',
      riskScore: 40,
      category: 'Preservative',
      description: 'Common preservative used to prevent microbial growth. Safe up to 1% concentration.',
      healthEffects: ['Contact dermatitis', 'Eye irritation'],
      alternatives: ['Sodium Benzoate', 'Potassium Sorbate'],
      sources: ['Synthetic'],
      aliases: ['phenoxyethanol preservative'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 4,
    },
    {
      name: 'Sodium Benzoate',
      inciName: 'Sodium Benzoate',
      casNumber: '532-32-1',
      riskScore: 25,
      category: 'Preservative',
      description: 'Safe food and cosmetic preservative. Can react with Vitamin C under heat/light to form benzene.',
      healthEffects: ['Skin irritation in sensitive individuals'],
      alternatives: [],
      sources: ['Synthetic'],
      aliases: ['benzoate'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 2,
    },
    {
      name: 'Retinol',
      inciName: 'Retinol',
      casNumber: '68-26-8',
      riskScore: 45,
      category: 'Anti-aging',
      description: 'Vitamin A derivative. Highly effective for wrinkles and acne, but causes peeling and sun sensitivity.',
      healthEffects: ['Redness', 'Peeling', 'Extreme sun sensitivity', 'Teratogenic risk during pregnancy'],
      alternatives: ['Bakuchiol'],
      sources: ['Synthetic'],
      aliases: ['vitamin a'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 9,
    },

    // High Risk / Harmful ingredients
    {
      name: 'Methylparaben',
      inciName: 'Methylparaben',
      casNumber: '99-76-3',
      riskScore: 75,
      category: 'Preservative',
      description: 'Paraben preservative. Mimics estrogen, acts as an endocrine disruptor, and accumulates in body tissues.',
      healthEffects: ['Endocrine disruption', 'Allergic reactions', 'Ecotoxicity'],
      alternatives: ['Phenoxyethanol', 'Sodium Benzoate', 'Ethylhexylglycerin'],
      sources: ['Synthetic'],
      aliases: ['methyl paraben'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 4,
    },
    {
      name: 'Propylparaben',
      inciName: 'Propylparaben',
      casNumber: '94-13-3',
      riskScore: 80,
      category: 'Preservative',
      description: 'Longer chain paraben preservative. Stronger endocrine disruption potential than methylparaben.',
      healthEffects: ['Endocrine disruption', 'Reproductive toxicity', 'Skin allergies'],
      alternatives: ['Phenoxyethanol', 'Sodium Benzoate'],
      sources: ['Synthetic'],
      aliases: ['propyl paraben'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 7,
    },
    {
      name: 'Sodium Laureth Sulfate',
      inciName: 'Sodium Lauryl Ether Sulfate',
      casNumber: '9004-82-4',
      riskScore: 70,
      category: 'Surfactant / Cleansing Agent',
      description: 'Foaming agent. Can cause severe skin irritation. Frequently contaminated with 1,4-dioxane (carcinogen) during manufacturing.',
      healthEffects: ['Severe skin irritation', 'Eye irritation', 'Organ system toxicity'],
      alternatives: ['Coco Glucoside', 'Decyl Glucoside', 'Sodium Cocoyl Isethionate'],
      sources: ['Coconut or Petroleum-derived'],
      aliases: ['sles'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 3,
    },
    {
      name: 'Triclosan',
      inciName: 'Triclosan',
      casNumber: '3380-34-5',
      riskScore: 85,
      category: 'Antimicrobial',
      description: 'Antibacterial chemical. Linked to thyroid hormone disruption and environmental bioaccumulation.',
      healthEffects: ['Thyroid disruption', 'Antibiotic resistance', 'Bioaccumulation'],
      alternatives: ['Tea Tree Oil', 'Alcohol'],
      sources: ['Synthetic'],
      aliases: ['triclosan antibacterial'],
      isNatural: false,
      isBanned: true,
      bannedIn: ['EU', 'USA (in consumer soaps)'],
      ewgScore: 7,
    },
    {
      name: 'Formaldehyde',
      inciName: 'Formaldehyde',
      casNumber: '50-00-0',
      riskScore: 95,
      category: 'Preservative',
      description: 'A gas released by certain preservatives or used directly. Known human carcinogen.',
      healthEffects: ['Cancer risk (nasal/leukemia)', 'Severe contact dermatitis', 'Respiratory issues'],
      alternatives: ['Phenoxyethanol', 'Sodium Benzoate'],
      sources: ['Synthetic'],
      aliases: ['formalin'],
      isNatural: false,
      isBanned: true,
      bannedIn: ['EU'],
      ewgScore: 10,
    },
    {
      name: 'Fragrance (Parfum)',
      inciName: 'Parfum',
      casNumber: 'N/A',
      riskScore: 80,
      category: 'Fragrance',
      description: 'Synthetic fragrance mixture. A loophole allowing companies to hide hundreds of proprietary chemical ingredients, many toxic.',
      healthEffects: ['Allergic reactions', 'Asthma triggers', 'Contact dermatitis', 'Hormone disruption'],
      alternatives: ['Essential Oils', 'Fragrance-Free formulations'],
      sources: ['Synthetic'],
      aliases: ['fragrance', 'perfume', 'parfum'],
      isNatural: false,
      isBanned: false,
      bannedIn: [],
      ewgScore: 8,
    },
  ];

  const dbIngredients: any = {};

  for (const ing of ingredientsData) {
    const created = await prisma.ingredient.create({
      data: {
        name: ing.name,
        inciName: ing.inciName,
        casNumber: ing.casNumber !== 'N/A' ? ing.casNumber : null,
        riskScore: ing.riskScore,
        category: ing.category,
        description: ing.description,
        healthEffects: JSON.stringify(ing.healthEffects),
        alternatives: JSON.stringify(ing.alternatives),
        sources: JSON.stringify(ing.sources),
        aliases: JSON.stringify(ing.aliases),
        isNatural: ing.isNatural,
        isBanned: ing.isBanned,
        bannedIn: JSON.stringify(ing.bannedIn),
        ewgScore: ing.ewgScore,
      },
    });
    dbIngredients[ing.name] = created;
  }

  console.log(`🧪 Seeded ${Object.keys(dbIngredients).length} chemical ingredients.`);

  // 5. Create Products with Ingredients & Toxicity Reports
  const productsData = [
    {
      name: 'Himalaya Purifying Neem Face Wash',
      brand: 'Himalaya',
      barcode: '8901138510870',
      category: 'SKINCARE',
      description: 'A soap-free, herbal formulation that clears impurities and helps clear pimples.',
      imageUrl: 'https://images.unsplash.com/photo-1608248597481-496100c80836?w=400',
      country: 'India',
      source: 'BARCODE_SCAN',
      status: 'APPROVED',
      ingredients: ['Aqua', 'Glycerin', 'Sodium Laureth Sulfate', 'Phenoxyethanol', 'Sodium Benzoate'],
      report: {
        overallScore: 48,
        riskLevel: 'BETTER',
        aiSummary: 'This face wash contains Sodium Laureth Sulfate (SLES), a foaming agent that can dry out the skin and cause mild irritation. It also contains Phenoxyethanol as a preservative, which is safe up to 1% but can sensitize reactive skin. It is otherwise formulated with safe solvents and humectants.',
        harmfulIngredients: ['Sodium Laureth Sulfate', 'Phenoxyethanol'],
        warnings: ['Contains SLES, which can strip sensitive skin of natural oils.'],
      },
    },
    {
      name: 'Nivea Soft Moisturizing Cream',
      brand: 'Nivea',
      barcode: '4005900002440',
      category: 'SKINCARE',
      description: 'An ultra-light, fast-absorbing moisturizing cream for soft, supple skin.',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
      country: 'India',
      source: 'BARCODE_SCAN',
      status: 'APPROVED',
      ingredients: ['Aqua', 'Glycerin', 'Fragrance (Parfum)', 'Methylparaben'],
      report: {
        overallScore: 78,
        riskLevel: 'WORST',
        aiSummary: 'This product contains Methylparaben, an endocrine disruptor linked to hormone mimicry and long-term toxicity. It also contains synthetic Fragrance (Parfum), which represents an undisclosed mixture of chemicals carrying high allergy and contact dermatitis risks.',
        harmfulIngredients: ['Methylparaben', 'Fragrance (Parfum)'],
        warnings: ['Contains Parabens (endocrine disruptor) and Fragrance (irritant).'],
      },
    },
    {
      name: 'CeraVe Moisturizing Cream',
      brand: 'CeraVe',
      barcode: '3337875597199',
      category: 'SKINCARE',
      description: 'Restores and protects the skin barrier with 3 essential ceramides and hyaluronic acid.',
      imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
      country: 'USA',
      source: 'MANUAL',
      status: 'APPROVED',
      ingredients: ['Aqua', 'Glycerin', 'Sodium Hyaluronate', 'Phenoxyethanol'],
      report: {
        overallScore: 22,
        riskLevel: 'BEST',
        aiSummary: 'An exceptionally clean moisturizing formulation. Uses safe humectants like Glycerin and Sodium Hyaluronate. Phenoxyethanol is used at a safe level for preservation. Highly recommended for dry and sensitive skin.',
        harmfulIngredients: [],
        warnings: [],
      },
    },
    {
      name: 'L\'Oreal Paris Extraordinary Oil Shampoo',
      brand: 'L\'Oreal',
      barcode: '3600523419999',
      category: 'HAIRCARE',
      description: 'Nourishing shampoo for dry and lifeless hair.',
      imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400',
      country: 'India',
      source: 'BARCODE_SCAN',
      status: 'APPROVED',
      ingredients: ['Aqua', 'Sodium Laureth Sulfate', 'Glycerin', 'Fragrance (Parfum)', 'Salicylic Acid'],
      report: {
        overallScore: 58,
        riskLevel: 'BETTER',
        aiSummary: 'This shampoo contains Sodium Laureth Sulfate (SLES) as a primary surfactant. While effective at cleaning, SLES can strip the scalp and cause irritation. Synthetic Fragrance is also present, increasing allergen risk. Salicylic Acid acts as a mild scalp exfoliant.',
        harmfulIngredients: ['Sodium Laureth Sulfate', 'Fragrance (Parfum)'],
        warnings: ['SLES can be irritating to sensitive scalps. Synthetic fragrance may cause contact allergies.'],
      },
    },
    {
      name: 'Indulekha Bringha Hair Oil',
      brand: 'Indulekha',
      barcode: '8901030753009',
      category: 'HAIRCARE',
      description: 'An Ayurvedic proprietary medicine for hair fall control and hair growth.',
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400',
      country: 'India',
      source: 'BARCODE_SCAN',
      status: 'APPROVED',
      ingredients: ['Cocos Nucifera Oil', 'Aloe Barbadensis Leaf Juice'],
      report: {
        overallScore: 8,
        riskLevel: 'BEST',
        aiSummary: 'A 100% natural, clean hair oil formulation. Formulated solely with nourishing Coconut Oil and soothing Aloe Vera leaf juice. Completely free of synthetic preservatives, sulfates, silicones, and artificial fragrances.',
        harmfulIngredients: [],
        warnings: [],
      },
    },
    {
      name: 'Maggi 2-Minute Masala Noodles',
      brand: 'Nestle',
      barcode: '8901058002479',
      category: 'FOOD',
      description: 'A popular Indian instant noodle pack with spice mix.',
      imageUrl: 'https://images.unsplash.com/photo-1612966608997-30024d690371?w=400',
      country: 'India',
      source: 'BARCODE_SCAN',
      status: 'APPROVED',
      ingredients: ['Aqua', 'Citric Acid'],
      report: {
        overallScore: 12,
        riskLevel: 'BEST',
        aiSummary: 'Basic base ingredients are safe. Keep in mind instant noodles contain high sodium and preservatives in the seasoning, but the core chemical additives tested are minimal risk.',
        harmfulIngredients: [],
        warnings: [],
      },
    },
  ];

  for (const prod of productsData) {
    const createdProduct = await prisma.product.create({
      data: {
        name: prod.name,
        brand: prod.brand,
        barcode: prod.barcode,
        category: prod.category,
        description: prod.description,
        imageUrl: prod.imageUrl,
        country: prod.country,
        source: prod.source,
        status: prod.status,
      },
    });

    // Link ingredients
    for (let i = 0; i < prod.ingredients.length; i++) {
      const ingName = prod.ingredients[i];
      const dbIng = dbIngredients[ingName];
      if (dbIng) {
        await prisma.productIngredient.create({
          data: {
            productId: createdProduct.id,
            ingredientId: dbIng.id,
            position: i,
          },
        });
      }
    }

    // Create toxicity report
    await prisma.toxicityReport.create({
      data: {
        productId: createdProduct.id,
        overallScore: prod.report.overallScore,
        riskLevel: prod.report.riskLevel,
        aiSummary: prod.report.aiSummary,
        harmfulIngredients: JSON.stringify(prod.report.harmfulIngredients),
        safeIngredients: JSON.stringify(prod.ingredients.filter(n => !prod.report.harmfulIngredients.includes(n))),
        warnings: JSON.stringify(prod.report.warnings),
      },
    });
  }

  console.log(`📦 Seeded ${productsData.length} products with complete toxicity reports.`);

  // 6. Create some sample community reviews
  const allProducts = await prisma.product.findMany();
  if (allProducts.length >= 2) {
    await prisma.review.create({
      data: {
        userId: user.id,
        productId: allProducts[0].id, // Himalaya Neem Face Wash
        rating: 4,
        title: 'Really helps with pimples',
        comment: 'Great face wash, does dry my skin a bit due to the sulfates, but clears my skin very well.',
        helpfulCount: 5,
        isVerified: true,
      },
    });

    await prisma.review.create({
      data: {
        userId: user.id,
        productId: allProducts[1].id, // Nivea Soft
        rating: 2,
        title: 'Contains parabens, beware!',
        comment: 'Loved the texture, but after checking ChemCheck I realized it contains Methylparaben and synthetic fragrances. Switched to CeraVe instead!',
        helpfulCount: 12,
        isVerified: true,
      },
    });
    console.log('💬 Created community reviews.');
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
