const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent'

export const buildGeminiRecipePrompt = (pantry = []) => {
  const uniqueIngredients = Array.from(new Set(pantry.map((item) => item.trim()).filter(Boolean)))
  const ingredientText = uniqueIngredients.length ? uniqueIngredients.join(', ') : 'no ingredients provided'

  return `You are a recipe recommendation engine. Based only on these pantry ingredients: ${ingredientText}. Recommend 3 practical recipe ideas that use the ingredients. Return strict JSON only, no markdown fences, no commentary. The JSON must be an array of objects with exactly these keys in each object: name, ingredients, keywords. Each object must include recipe name, the list of ingredients used for that recipe, and 2-3 short search keywords. Keep the ingredient names simple and realistic. Do not invent ingredients beyond what the user has unless they are common pantry basics like salt, oil, pepper, rice, flour, butter, or water. Keep the output valid JSON. no string format like escape new line. just a string of JSON`
}

export const parseGeminiRecipes = (rawText = '') => {
  const cleaned = String(rawText || '').trim()
  const candidate = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(candidate)

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response was not a JSON array.')
  }

  return parsed.map((recipe) => ({
    name: String(recipe.name || 'Untitled recipe').trim(),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((item) => String(item)) : [],
    keywords: Array.isArray(recipe.keywords) ? recipe.keywords.slice(0, 3).map((item) => String(item)) : [],
    matched: Array.isArray(recipe.ingredients) ? recipe.ingredients.filter((ingredient) => ingredient) : [],
    missing: [],
    matchScore: 95,
    source: 'gemini',
  }))
}

export async function searchGeminiRecipes(pantry = []) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key is missing.')
  }

  const prompt = buildGeminiRecipePrompt(pantry)
  const body = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }],
    }],
  })

  console.log('--- Gemini request prompt ---')
  console.log(prompt)
  console.log('--- Gemini request body ---')
  console.log(body)

  const response = await fetch(`${GEMINI_API}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(20000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Gemini request failed: ${response.status} ${text}`)
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || ''

  if (!text) {
    throw new Error('Gemini returned no recipe content.')
  }

  return parseGeminiRecipes(text)
}
