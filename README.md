# Pantry

Pantry is an ingredient-based recipe finder with a 90s bread and bakery theme. Add what you have in the kitchen, find close matches from the local recipe catalog, and open any result as a Google search.

## How It Is Bound Together

The app has three layers:

```text
React browser
    POST /api/recipes
        Vite proxy: localhost:5173/api -> localhost:3001/api
            Express server
                Local recipe catalog, using src/recipes.json
```

The recipe catalog is loaded by `server/index.js`, so searching is instant and does not require an API key.

## Requirements

- Node.js 18 or newer
- npm
- No API key is required for catalog matching

## Build It From a Fresh Clone

### 1. Install dependencies

From the project directory:

```bash
npm install
```

### 2. Create the environment file

Create a file named `.env` in this exact location:

```text
chef slop/.env
```

It should sit beside `package.json`, `vite.config.js`, and the `server` folder. Copy the example file:

```bash
cp .env.example .env
```

Then open `.env`. The local matcher only needs the server port:

```env
PORT=3001
```

No AI credential is needed. The `.env` file only configures the Express port.

### 3. Start the app

Run both the React development server and the API server:

```bash
npm start
```

Open the URL Vite prints, usually `http://localhost:5173`.

`npm start` runs these two processes together:

- `npm run dev` starts Vite
- `npm run server` starts Express on `PORT` from `.env`, or `3001` by default

Restart `npm start` after changing `.env`; environment variables are read when the Node process starts.

## Using Pantry

1. Type an ingredient into the bottom input.
2. Press Enter to add it as a chip. Enter only adds ingredients; it does not search.
3. Remove a chip with its `x` button.
4. Select **Find Recipes** to call the backend.
5. Select a recipe card to open a Google search built from the recipe name and catalog keywords.

Ingredients are stored as a flat JSON array in the `pantry-ingredients` cookie, so they survive a refresh. The browser keeps the newest 35 ingredients and drops the oldest when the list gets too large.

## API Contract

The React app sends:

```http
POST /api/recipes
Content-Type: application/json
```

```json
{
  "ingredients": ["flour", "apples", "butter"]
}
```

The Express server returns:

```json
{
  "source": "catalog",
  "recipes": [
    {
      "name": "Apple Butter Galette",
      "ingredients": ["apples", "flour", "butter"],
      "keywords": ["rustic pastry", "free-form", "dessert"],
      "matched": ["apples", "flour"],
      "missing": ["butter"],
      "matchScore": 67
    }
  ]
}
```

The server returns up to six catalog recipes ranked by similarity. Each result includes `matched`, `missing`, and `matchScore` fields. Matching handles common plurals, aliases, descriptive words, partial phrases, and small spelling mistakes.

## Useful Commands

```bash
npm run dev       # React/Vite only
npm run server    # Express API only
npm start         # React and Express together
npm run build     # Production build
npm run preview   # Preview the production build
npm run lint      # Run Oxlint
```

## Project Map

```text
src/App.jsx       React state, ingredient chips, cookie persistence, recipe cards
src/App.css       Pantry visual theme and responsive layout
server/index.js   Express API and fuzzy catalog matching
vite.config.js    /api proxy from Vite to Express
.env.example      Safe environment-variable template
```

## Security Notes

- Keep the real `.env` file private.
- Keep recipe data in `src/recipes.json`; the server reads it locally.
- `.env` is ignored by git; commit `.env.example`, not `.env`.
