import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import './App.css'
import pantryMark from './assets/pantry-mark.svg'

const COOKIE_KEY = 'pantry-ingredients'
const COOKIE_LIMIT = 35
const starterIdeas = [
  { name: 'Skillet Herb Flatbread', ingredients: ['flour', 'olive oil', 'yogurt', 'herbs'], keywords: ['no oven', 'quick bread', 'savory'] },
  { name: 'Brown Butter Apple Crumble', ingredients: ['apples', 'flour', 'butter', 'brown sugar'], keywords: ['one pan', 'crisp topping', 'fall dessert'] },
  { name: 'Cheddar Scallion Scones', ingredients: ['flour', 'cheddar', 'scallions', 'butter'], keywords: ['quick bread', 'savory', 'no yeast'] },
]

function App() {
  const [ingredients, setIngredients] = useState(() => {
    try {
      const saved = JSON.parse(Cookies.get(COOKIE_KEY) || '[]')
      return Array.isArray(saved) ? saved.filter((item) => typeof item === 'string') : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [recipes, setRecipes] = useState(starterIdeas)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { Cookies.set(COOKIE_KEY, JSON.stringify(ingredients.slice(-COOKIE_LIMIT)), { expires: 365 }) }, [ingredients])

  const addIngredient = () => {
    const clean = input.trim()
    if (!clean || ingredients.some((item) => item.toLowerCase() === clean.toLowerCase())) { setInput(''); return }
    setIngredients((current) => [...current, clean].slice(-COOKIE_LIMIT))
    setInput('')
  }

  const findRecipes = async () => {
    if (!ingredients.length) { setError('Add at least one ingredient first.'); return }
    setLoading(true); setError('')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, mode: 'gemini' }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('The pantry signal got scrambled.')
      const data = await response.json()
      setRecipes(data.recipes)
      setError(data.recipes.length ? '' : 'Nothing is covered enough yet. Add two or three more ingredients to widen the match.')
    } catch (requestError) {
      setError(requestError.name === 'AbortError' ? 'The recipe signal timed out. Try again in a moment.' : requestError.message)
    } finally { clearTimeout(timeout); setLoading(false) }
  }

  const openSearch = (recipe) => {
    const query = [recipe.name, ...recipe.keywords.map((keyword) => `"${keyword}"`)].join(' ')
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="app-shell">
      <header className="masthead"><div className="brand-lockup"><img className="pantry-logo" src={pantryMark} alt="" /><span>PANTRY</span></div><div className="issue">VOL. 01 / KITCHEN EDITION</div></header>
      <section className="intro"><p className="eyebrow">THE EVERYDAY BREADBOARD</p><h1>Make something<br /><em>worth sharing.</em></h1><p className="lede">Tell us what is in your kitchen. We will find the good stuff hiding between the flour and the crumbs.</p></section>
      <section className="pantry-stage" aria-label="Recipe ideas"><div className="stage-label"><span>YOUR SHORTLIST</span><span>{recipes.length.toString().padStart(2, '0')} IDEAS</span></div>{loading ? <div className="loading">Matching the pantry<span>...</span></div> : <div className="recipe-grid">{recipes.map((recipe, index) => <article className="recipe-card" key={`${recipe.name}-${index}`} onClick={() => openSearch(recipe)} tabIndex="0" role="button" onKeyDown={(event) => event.key === 'Enter' && openSearch(recipe)}><div className="card-top"><span className="recipe-number">0{index + 1}</span><span className="match-score">{recipe.matchScore}% MATCH</span><span className="search-arrow" aria-hidden="true">↗</span></div><h2>{recipe.name}</h2><div className="card-rule" /><p className="needed-label">YOU HAVE</p><ul className="ingredient-list">{recipe.matched?.map((item) => <li className="have" key={`have-${item}`}><span>✓</span>{item}</li>)}</ul>{recipe.missing?.length > 0 && <><p className="needed-label missing-label">STILL NEEDED</p><ul className="ingredient-list missing-list">{recipe.missing.map((item) => <li key={`missing-${item}`}><span>·</span>{item}</li>)}</ul></>}<div className="keyword-row">{recipe.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></article>)}</div>}</section>
      <div className="input-dock"><div className="chip-tray">{ingredients.map((ingredient) => <span className="chip" key={ingredient}>{ingredient}<button type="button" aria-label={`Remove ${ingredient}`} onClick={() => setIngredients((current) => current.filter((item) => item !== ingredient))}>×</button></span>)}</div><div className="input-row"><span className="input-icon">+</span><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addIngredient()} placeholder="Add an ingredient..." aria-label="Add an ingredient" /><button className="find-button" type="button" onClick={findRecipes} disabled={loading}><span>{loading ? 'BAKING' : 'FIND RECIPES'}</span><b>↗</b></button></div><p className="dock-note">PRESS ENTER TO ADD · {ingredients.length} IN THE PANTRY</p>{error && <p className="error-message">{error}</p>}</div>
    </main>
  )
}

export default App
