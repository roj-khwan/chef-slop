import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGeminiRecipePrompt, parseGeminiRecipes } from './googleRecipes.js'

test('buildGeminiRecipePrompt includes ingredients and JSON-only instructions', () => {
  const prompt = buildGeminiRecipePrompt(['rice', 'kimchi', 'egg', 'pork'])
  assert.match(prompt, /rice/)
  assert.match(prompt, /JSON/i)
})

test('parseGeminiRecipes extracts a valid recipe array from Gemini output', () => {
  const recipes = parseGeminiRecipes('```json\n[{"name":"Kimchi Pork Fried Rice","ingredients":["rice","kimchi","egg","pork"],"keywords":["quick","savory","one pan"]}]\n```')

  assert.equal(recipes[0].name, 'Kimchi Pork Fried Rice')
  assert.deepEqual(recipes[0].ingredients, ['rice', 'kimchi', 'egg', 'pork'])
  assert.equal(recipes[0].keywords[0], 'quick')
})
