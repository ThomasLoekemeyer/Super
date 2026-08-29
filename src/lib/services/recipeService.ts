// RecipeService: comidas y recetas reutilizables.
// "Hice milanesas con puré" -> si existe una receta con ese nombre, se usa
// como base de la preview; si no, el usuario arma los ingredientes una vez
// y puede guardarla para la próxima. Los descuentos SIEMPRE pasan por
// preview + confirmación (nada se descuenta a ciegas).

import { getSupabase } from "../supabase";
import { normalize } from "../nlp/parser";
import * as inventory from "./inventoryService";
import type { Recipe, RecipeIngredient } from "../types";

export async function listRecipes(): Promise<Recipe[]> {
  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .order("times_cooked", { ascending: false });
  if (error) throw error;
  return data as Recipe[];
}

export async function getIngredients(recipeId: string): Promise<RecipeIngredient[]> {
  const { data, error } = await getSupabase()
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", recipeId);
  if (error) throw error;
  return data as RecipeIngredient[];
}

export async function findRecipeByDescription(
  description: string,
): Promise<Recipe | null> {
  const recipes = await listRecipes();
  const d = normalize(description);
  return (
    recipes.find((r) => {
      const n = normalize(r.name);
      return n === d || d.includes(n) || n.includes(d);
    }) ?? null
  );
}

export interface MealIngredientInput {
  product_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
}

export async function saveRecipe(
  name: string,
  servings: number,
  ingredients: MealIngredientInput[],
): Promise<Recipe> {
  const supabase = getSupabase();
  const { data: recipe, error } = await supabase
    .from("recipes")
    .upsert({ name, servings }, { onConflict: "name" })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);
  if (ingredients.length > 0) {
    const { error: ingError } = await supabase.from("recipe_ingredients").insert(
      ingredients.map((i) => ({ recipe_id: recipe.id, ...i })),
    );
    if (ingError) throw ingError;
  }
  return recipe as Recipe;
}

/** Descuenta los ingredientes confirmados de una comida (post-preview). */
export async function cookMeal(
  mealName: string,
  ingredients: MealIngredientInput[],
  recipeId?: string,
): Promise<void> {
  for (const ing of ingredients) {
    if (ing.product_id && ing.quantity && ing.quantity > 0) {
      await inventory.consume(ing.product_id, ing.quantity, `Comida: ${mealName}`);
    }
  }
  if (recipeId) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("recipes")
      .select("times_cooked")
      .eq("id", recipeId)
      .single();
    if (data) {
      await supabase
        .from("recipes")
        .update({ times_cooked: (data.times_cooked ?? 0) + 1 })
        .eq("id", recipeId);
    }
  }
}
