/** The structured recipe the importer hands back for review. Nothing here is saved yet. */

export interface DraftIngredient {
  /**
   * Temporary id, unique within the draft. Step text refers to it as {ing:<key>}.
   * When the draft is saved, each key is swapped for the real ingredient id.
   */
  key: string
  name: string
  /** Quantity text exactly as the source gives it ("1 1/2", "2-3", "a pinch") */
  quantity: string | null
  unit: string | null
  /** Numeric amount for scaling; computed by us from quantity/unit, null when unsure */
  amount: number | null
  notes: string | null
}

export interface DraftStep {
  /** Instruction text; may contain {ing:<key>} tokens */
  text: string
  timerSeconds: number | null
}

export interface RecipeDraft {
  name: string
  kind: 'full' | 'quick'
  description: string | null
  servings: number | null
  totalTimeMinutes: number | null
  prepTime: 'quick' | 'medium' | 'long' | null
  /** Set by us from the URL the user gave, not by the model. Null for free-text imports. */
  sourceUrl: string | null
  notes: string | null
  ingredients: DraftIngredient[]
  /** Empty when the source has no clear method (never invented) */
  steps: DraftStep[]
  proteinType: string | null
  carbType: string | null
  includesVegetables: boolean
}

/** What a run returns: the draft plus existing recipes that look like duplicates. */
export interface ImportResult {
  draft: RecipeDraft
  /** Recipes already in the book with similar names (found by find_similar_recipes) */
  similarRecipes: SimilarRecipe[]
}

export interface SimilarRecipe {
  id: string
  name: string
  kind: string
  recipeUrl: string | null
}
