import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type CachedCategory = {
  id: string
  userId: string
  name: string
  createdAt: number
}

export type CachedRecipe = {
  id: string
  userId: string
  title: string
  description: string | null
  difficulty: string
  preparation_time: number
  cooking_time: number
  servings: number
  ingredients: Array<{ id?: string; name: string; quantity: string; unit: string; notes?: string }>
  instructions: Array<{ id?: string; instruction: string; position: number }>
  imageUrl?: string | null
  categoryId?: string | null
  cachedAt: number
}

interface CrumbDB extends DBSchema {
  recipes: { key: string; value: CachedRecipe; indexes: { byUser: string } }
  favorites: { key: string; value: { userId: string; recipeId: string; updatedAt: number }; indexes: { byUser: string } }
  categories: { key: string; value: CachedCategory; indexes: { byUser: string } }
  meta: { key: string; value: { userId: string; syncedAt: number } }
}

let dbPromise: Promise<IDBPDatabase<CrumbDB>> | null = null
function db() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null
  dbPromise ??= openDB<CrumbDB>('crumb-offline', 2, { upgrade(database, oldVersion) {
    if (oldVersion < 1) {
      const recipes = database.createObjectStore('recipes', { keyPath: 'id' })
      recipes.createIndex('byUser', 'userId')
      const favorites = database.createObjectStore('favorites', { keyPath: 'recipeId' })
      favorites.createIndex('byUser', 'userId')
      database.createObjectStore('meta')
    }
    if (oldVersion < 2) {
      const categories = database.createObjectStore('categories', { keyPath: 'id' })
      categories.createIndex('byUser', 'userId')
    }
  } })
  return dbPromise
}

export async function cacheFavoriteRecipes(userId: string, recipes: CachedRecipe[]) {
  const database = db(); if (!database) return
  const tx = (await database).transaction(['recipes', 'favorites'], 'readwrite')
  for (const recipe of recipes) { await tx.objectStore('recipes').put({ ...recipe, userId, cachedAt: Date.now() }); await tx.objectStore('favorites').put({ userId, recipeId: recipe.id, updatedAt: Date.now() }) }
  await tx.done
  await (await database).put('meta', { userId, syncedAt: Date.now() }, userId)
}

export async function listCachedFavorites(userId: string) {
  const database = db(); if (!database) return []
  const ids = await (await database).getAllFromIndex('favorites', 'byUser', userId)
  const recipes = await Promise.all(ids.map((item) => (database as Promise<IDBPDatabase<CrumbDB>>).then((d) => d.get('recipes', item.recipeId))))
  return recipes.filter((recipe): recipe is CachedRecipe => Boolean(recipe && recipe.userId === userId))
}

export async function setCachedFavorite(userId: string, recipeId: string, saved: boolean) {
  const database = db(); if (!database) return
  const d = await database
  if (saved) await d.put('favorites', { userId, recipeId, updatedAt: Date.now() })
  else await d.delete('favorites', recipeId)
}

export async function cacheCategories(userId: string, categories: CachedCategory[]) {
  const database = db(); if (!database) return
  const tx = (await database).transaction('categories', 'readwrite')
  for (const category of categories) {
    await tx.objectStore('categories').put({ ...category, userId })
  }
  await tx.done
}

export async function listCachedCategories(userId: string) {
  const database = db(); if (!database) return []
  const items = await (await database).getAllFromIndex('categories', 'byUser', userId)
  return items.filter((item): item is CachedCategory => Boolean(item && item.userId === userId))
}

export async function setCachedCategory(userId: string, category: CachedCategory) {
  const database = db(); if (!database) return
  await (await database).put('categories', { ...category, userId })
}

export async function deleteCachedCategory(userId: string, categoryId: string) {
  const database = db(); if (!database) return
  await (await database).delete('categories', categoryId)
}

export async function clearOfflineData(userId?: string) {
  const database = db(); if (!database) return
  const d = await database
  if (!userId) { await d.clear('recipes'); await d.clear('favorites'); await d.clear('categories'); await d.clear('meta'); return }
  const recipes = await d.getAllFromIndex('recipes', 'byUser', userId)
  const favorites = await d.getAllFromIndex('favorites', 'byUser', userId)
  const categories = await d.getAllFromIndex('categories', 'byUser', userId)
  const tx = d.transaction(['recipes', 'favorites', 'categories', 'meta'], 'readwrite')
  for (const recipe of recipes) await tx.objectStore('recipes').delete(recipe.id)
  for (const favorite of favorites) await tx.objectStore('favorites').delete(favorite.recipeId)
  for (const category of categories) await tx.objectStore('categories').delete(category.id)
  await tx.objectStore('meta').delete(userId); await tx.done
}

export async function getLastSync(userId: string) { const database = db(); if (!database) return null; return (await database).get('meta', userId) }
export function isOfflineStorageAvailable() { return typeof window !== 'undefined' && 'indexedDB' in window }
export type { IDBPDatabase }

export async function getCachedRecipe(userId: string, recipeId: string) { const database = db(); if (!database) return null; const recipe = await (await database).get('recipes', recipeId); return recipe?.userId === userId ? recipe : null }

export async function cacheRecipe(userId: string, recipe: CachedRecipe) { const database = db(); if (!database) return; await (await database).put('recipes', { ...recipe, userId, cachedAt: Date.now() }) }

export function toCachedRecipe(userId: string, recipe: any): CachedRecipe { 
  return { 
    id: recipe.id, 
    userId, 
    title: recipe.title, 
    description: recipe.description ?? null, 
    difficulty: recipe.difficulty, 
    preparation_time: recipe.preparation_time, 
    cooking_time: recipe.cooking_time, 
    servings: recipe.servings, 
    ingredients: recipe.ingredients ?? [], 
    instructions: recipe.instructions ?? [], 
    imageUrl: recipe.image_url ?? recipe.imageUrl ?? null, 
    categoryId: recipe.category_id ?? recipe.categoryId ?? null,
    cachedAt: Date.now() 
  } 
}
