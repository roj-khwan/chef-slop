import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3001
const recipesPath = fileURLToPath(new URL('../src/recipes.json', import.meta.url))
const recipes = JSON.parse(readFileSync(recipesPath, 'utf8'))
app.use(cors())
app.use(express.json())

const aliases = {
  aubergine: 'eggplant',
  coriander: 'cilantro',
  prawns: 'shrimp',
  garbanzo: 'chickpea',
  garbanzos: 'chickpea',
  scallion: 'green onion',
  'spring onion': 'green onion',
  'all purpose flour': 'flour',
}

const compoundAliases = {
  tomato: ['tomato sauce', 'tomato paste', 'peeled tomato', 'san marzano tomato'],
  chicken: ['chicken breast', 'chicken thigh', 'chicken broth', 'chicken stock'],
  beef: ['beef chuck', 'beef broth', 'beef stock', 'beef strip'],
  potato: ['potato gnocchi', 'potato starch'],
}

const singularize = (word) => {
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('oes')) return word.slice(0, -2)
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('ches') || word.endsWith('shes')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

const normalize = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\b(fresh|diced|sliced|chopped|raw|whole|cooked|fried|boiled|grilled|baked|deep fried|pan fried)\b/g, '').replace(/\s+/g, ' ').trim().split(' ').map((word) => singularize(aliases[word] || word)).join(' ')

const distance = (left, right) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0]
    row[0] = leftIndex
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = row[rightIndex]
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal + 1, above + 1, row[rightIndex - 1] + 1)
      diagonal = above
    }
  }
  return row[right.length]
}

const ingredientMatches = (pantryIngredient, recipeIngredient) => {
  const pantry = normalize(pantryIngredient)
  const recipe = normalize(recipeIngredient)
  if (!pantry || !recipe) return false
  const pantryWords = pantry.split(' ')
  const recipeWords = recipe.split(' ')
  if (pantry === recipe) return true
  if (pantryWords.length > 1 && pantryWords.every((word) => recipeWords.includes(word))) return true
  if (pantryWords.length === 1 && compoundAliases[pantry]?.includes(recipe)) return true
  if (pantryWords.length === 1 && recipeWords.length === 1 && pantry.length > 3 && recipe.length > 3) return distance(pantry, recipe) <= 1
  return false
}

const matchRecipes = (pantry) => {
  const ranked = recipes.map((recipe) => {
  const matched = recipe.ingredients.filter((ingredient) => pantry.some((item) => ingredientMatches(item, ingredient)))
  const missing = recipe.ingredients.filter((ingredient) => !matched.includes(ingredient))
  const requiredScore = matched.length / recipe.ingredients.length
  const pantryCoverage = matched.length / pantry.length
  return { ...recipe, matched, missing, matchScore: Math.round((requiredScore * 0.8 + pantryCoverage * 0.2) * 100), requiredScore }
  }).filter((recipe) => recipe.matched.length > 0).sort((left, right) => right.matchScore - left.matchScore || right.matched.length - left.matched.length)

  const covered = ranked.filter((recipe) => recipe.matched.length >= 2 && recipe.requiredScore >= 0.6)
  if (covered.length) return covered.slice(0, 6)

  return ranked.filter((recipe) => recipe.matched.length >= 2).slice(0, 6)
}

app.post('/api/recipes', async (req, res) => {
  const items = Array.isArray(req.body?.ingredients) ? req.body.ingredients.filter((item) => typeof item === 'string').slice(0, 35) : []
  if (!items.length) return res.status(400).json({ error: 'Ingredients are required.' })
  return res.json({ source: 'catalog', recipes: matchRecipes(items) })
})

app.listen(port, () => console.log(`Pantry API listening on http://localhost:${port}`))
