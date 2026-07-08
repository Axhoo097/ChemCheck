export function parseIngredient(ingredient: any) {
  if (!ingredient) return ingredient;
  
  const parsed = { ...ingredient };
  const arrayFields = ['healthEffects', 'alternatives', 'sources', 'aliases', 'bannedIn'];
  
  for (const field of arrayFields) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        parsed[field] = [];
      }
    }
  }
  return parsed;
}

export function parseToxicityReport(report: any) {
  if (!report) return report;
  
  const parsed = { ...report };
  const arrayFields = ['harmfulIngredients', 'safeIngredients', 'warnings'];
  
  for (const field of arrayFields) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        parsed[field] = [];
      }
    }
  }
  
  if (typeof parsed.detailedScores === 'string') {
    try {
      parsed.detailedScores = JSON.parse(parsed.detailedScores);
    } catch {
      parsed.detailedScores = null;
    }
  }
  
  return parsed;
}

export function parseUserProfile(profile: any) {
  if (!profile) return profile;
  
  const parsed = { ...profile };
  const arrayFields = ['allergies', 'dietaryPrefs', 'goals'];
  
  for (const field of arrayFields) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        parsed[field] = [];
      }
    }
  }
  return parsed;
}

export function parseProduct(product: any) {
  if (!product) return product;
  
  const parsed = { ...product };
  
  if (parsed.toxicityReport) {
    parsed.toxicityReport = parseToxicityReport(parsed.toxicityReport);
  }
  
  if (typeof parsed.metadata === 'string') {
    try {
      parsed.metadata = JSON.parse(parsed.metadata);
    } catch {
      parsed.metadata = null;
    }
  }
  
  if (parsed.ingredients) {
    parsed.ingredients = parsed.ingredients.map((pi: any) => {
      if (pi.ingredient) {
        return {
          ...pi,
          ingredient: parseIngredient(pi.ingredient),
        };
      }
      return pi;
    });
  }
  
  return parsed;
}
