import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const CLIENT_VIEW = new URL('../app/my-aqslim/plan/guided-plan-view.tsx', import.meta.url)
const PORTAL_STYLES = new URL('../app/my-aqslim/portal.module.css', import.meta.url)
const CLIENT_DEMO = new URL('../app/my-aqslim/demo/plan/page.tsx', import.meta.url)
const REAL_PLAN = new URL('../app/my-aqslim/plan/page.tsx', import.meta.url)
const DASHBOARD_PAGE = new URL('../app/dashboard/plan-preview/page.tsx', import.meta.url)
const DASHBOARD_CLIENT = new URL('../app/dashboard/plan-preview/plan-preview-client.tsx', import.meta.url)
const DASHBOARD_SHELL = new URL('../app/dashboard/dashboard-shell.tsx', import.meta.url)
const RECIPE_DIALOG = new URL('../app/my-aqslim/plan/recipe-detail-dialog.tsx', import.meta.url)
const RECIPE_DATA = new URL('../app/my-aqslim/plan/recipe-detail-data.ts', import.meta.url)
const RECIPE_DIALOG_STYLES = new URL('../app/my-aqslim/plan/recipe-detail-dialog.module.css', import.meta.url)
const WEEKLY_CAPSULE = new URL('../lib/nutrition/weekly-capsule.ts', import.meta.url)
const MIDDLEWARE = new URL('../middleware.ts', import.meta.url)

test('the client demo uses only the deterministic synthetic plan', async () => {
  const [view, demo, recipeDialog, recipeData, recipeStyles, weeklyCapsule] = await Promise.all([
    readFile(CLIENT_VIEW, 'utf8'),
    readFile(CLIENT_DEMO, 'utf8'),
    readFile(RECIPE_DIALOG, 'utf8'),
    readFile(RECIPE_DATA, 'utf8'),
    readFile(RECIPE_DIALOG_STYLES, 'utf8'),
    readFile(WEEKLY_CAPSULE, 'utf8'),
  ])
  assert.match(demo, /buildSyntheticPersonalizationPlan/)
  assert.match(demo, /searchParams/)
  assert.match(demo, /plan\.status !== 'ready_for_review'/)
  assert.match(demo, /firstName: plan\.profile\.firstName/)
  assert.match(demo, /process\.env\.VERCEL_ENV === 'preview'/)
  assert.match(demo, /!isVercelPreview && await getRole\(\) !== 'admin'/)
  assert.doesNotMatch(demo, /airtable/i)
  assert.match(view, /plan\.groups\.map/)
  assert.match(view, /¿Qué se te antoja\?/)
  assert.match(view, /Quiero decidir con mi lista/)
  assert.match(view, /<details/)
  assert.match(view, /aqslim_buddy_open_arms\.png/)
  assert.doesNotMatch(view, /Snack/)
  assert.match(view, /Vista de ejemplo/)
  assert.match(view, /Preview sintético · \$\{plan\.profile\.firstName\}/)
  assert.match(view, /Ver receta con foto/)
  assert.match(view, /<RecipeDetailDialog option=\{openRecipe\}/)
  assert.match(view, /Tus opciones de esta semana/)
  assert.match(view, /Favorita/)
  assert.match(view, /Me gusta/)
  assert.match(view, /No repetir/)
  assert.match(view, /Cápsula semanal/)
  assert.match(view, /Calendario de siete días/)
  assert.match(view, /Compra protegida/)
  assert.match(view, /swapWeeklyRotationEntry\(weeklyRotation, dayIndex, slot\)/)
  assert.match(view, /aria-live="polite"/)
  assert.match(view, /Confirmar rotación y preparar lista/)
  assert.match(view, /Lista de supermercado/)
  assert.match(view, /preferencias guardadas en este navegador sólo para/)
  assert.match(view, /formatShoppingQuantity\(item, language\)/)
  assert.match(view, /1 palma se estima como 4 oz/)
  assert.match(view, /loadRecipePreferences\(window\.localStorage/)
  assert.match(view, /saveRecipePreferences\(window\.localStorage/)
  assert.doesNotMatch(view, /sessionStorage|fetch\(|airtable/i)
  assert.match(weeklyCapsule, /WEEK_LENGTH_DAYS = 7/)
  assert.match(weeklyCapsule, /mealUses >= 2/)
  assert.match(weeklyCapsule, /APPROXIMATE_PALM_OUNCES = 4/)
  assert.match(weeklyCapsule, /ShoppingUnit/)
  assert.match(weeklyCapsule, /export function swapWeeklyRotationEntry/)
  assert.match(weeklyCapsule, /rounded\(item\.quantity, 6\)/)
  assert.match(weeklyCapsule, /paquete de \$\{eggs\}/)
  assert.match(weeklyCapsule, /preferences\[option\.familyId\] !== 'avoid'/)
  for (const image of [
    'omelette-mexicana-v1.webp',
    'atun-pepino-v1.webp',
    'fajitas-pollo-v1.webp',
    'bistec-mexicana-v1.webp',
    'tilapia-con-espinaca-v1.webp',
    'cerdo-nopales-v1.webp',
    'pollo-coliflor-v1.webp',
    'hamburguesa-plato-v1.webp',
  ]) assert.match(recipeData, new RegExp(image.replace('.', '\\.')))
  for (let family = 1; family <= 8; family += 1) {
    assert.match(recipeData, new RegExp(`PIL-J0${family}`))
  }
  assert.match(recipeDialog, /RECIPE_DETAILS\[option\.familyId\]/)
  assert.match(recipeDialog, /optionAllergens/)
  assert.match(recipeDialog, /Tu porción calculada/)
  assert.match(recipeDialog, /Ingredientes/)
  assert.match(recipeDialog, /Preparación/)
  assert.match(recipeDialog, /Sustituciones compatibles/)
  assert.match(recipeDialog, /role="dialog"/)
  assert.match(recipeDialog, /event\.key === 'Escape'/)
  assert.match(recipeStyles, /@media \(max-width: 760px\)/)
  assert.doesNotMatch(view, /disponible al conectar Preview|available after Preview connection/)
})

test('the real client plan route remains connected to its existing portal data', async () => {
  const route = await readFile(REAL_PLAN, 'utf8')
  assert.doesNotMatch(route, /nutrition\/preview|buildSyntheticGuidedPlan/)
})

test('the Dashboard Preview is admin-only, review-first, and has no persistence path', async () => {
  const [page, client, shell, middleware] = await Promise.all([
    readFile(DASHBOARD_PAGE, 'utf8'),
    readFile(DASHBOARD_CLIENT, 'utf8'),
    readFile(DASHBOARD_SHELL, 'utf8'),
    readFile(MIDDLEWARE, 'utf8'),
  ])
  assert.match(page, /actor\.role !== 'admin'/)
  assert.match(page, /buildSyntheticPersonalizationPlans/)
  assert.doesNotMatch(page, /airtable/i)
  assert.match(client, /disabled>.*Guardar borrador/)
  assert.match(client, /disabled>.*Aprobar y publicar/)
  assert.doesNotMatch(client, /fetch\(|createRecord|updateRecord|from ['\"]@\/lib\/airtable/)
  assert.match(client, /Revisión de planes personalizados/)
  assert.match(client, /AQ Buddy genera las opciones automáticamente/)
  assert.match(client, /Biblioteca piloto/)
  assert.match(client, /Validación automática/)
  assert.match(client, /Pendiente de revisión humana/)
  assert.match(client, /combinaciones compatibles/)
  assert.match(client, /Prueba de personalización automática v0\.3/)
  assert.match(client, /Cálculo energético sintético/)
  assert.match(client, /Mantenimiento estimado/)
  assert.match(client, /Déficit aplicado/)
  assert.match(client, /Sin techo artificial de 2,000 kcal/)
  assert.match(client, /de 3 opciones disponibles/)
  assert.match(client, /Cápsula semanal/)
  assert.match(client, /Sólo usos repetidos/)
  assert.match(client, /No repetir” no equivale a alergia/)
  assert.match(client, /Cambia el perfil; AQ Buddy recalcula/)
  assert.match(client, /setSelectedProfileId/)
  assert.match(client, /Exclusión estricta/)
  assert.match(client, /AQ Buddy no improvisó un plan/)
  assert.match(client, /generación detenida/)
  assert.match(client, /window\.history\.scrollRestoration = 'manual'/)
  assert.match(client, /function resetPreviewScroll\(\)/)
  assert.match(client, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/)
  assert.match(client, /window\.setTimeout\(resetPreviewScroll, 120\)/)
  assert.match(client, /function selectProfile\(profileId: string\)/)
  assert.match(client, /onClick=\{\(\) => selectProfile\(item\.profile\.id\)\}/)
  assert.match(client, /query: \{ profile: plan\.profile\.id \}/)
  assert.match(client, /target="_blank"/)
  assert.match(client, /Vista de \$\{plan\.profile\.firstName\} no disponible/)
  assert.match(client, /<DashboardShell[^>]*isolatedPreview>/)
  assert.match(client, /Ver receta con foto ↗/)
  assert.match(client, /context="review"/)
  assert.match(shell, /const PREVIEW_NAV = \[/)
  assert.match(shell, /const visibleNav = isolatedPreview \? PREVIEW_NAV : NAV/)
  assert.match(shell, /Preview aislado/)
  assert.match(middleware, /process\.env\.VERCEL_ENV === 'preview'/)
  assert.match(middleware, /process\.env\.VERCEL_GIT_COMMIT_REF === 'myaq-rec-001-preview-010'/)
  assert.match(middleware, /isOperationalRoute\(req\.nextUrl\.pathname\)/)
  assert.match(middleware, /NextResponse\.redirect\(new URL\('\/dashboard\/plan-preview', req\.url\)\)/)
  assert.match(middleware, /pathname\.startsWith\('\/dashboard\/'\)/)
  assert.match(middleware, /pathname\.startsWith\('\/food-scanner\/'\)/)
  assert.match(shell, /es: 'Clientes', en: 'Clients'/)
  assert.doesNotMatch(client, /Constructor de planes/)
})

test('the guided plan keeps headings clear and cards readable on narrow screens', async () => {
  const styles = await readFile(PORTAL_STYLES, 'utf8')
  assert.match(styles, /\.choiceSection \{[^}]*padding-top: 6px;[^}]*scroll-margin-top: 170px;/)
  assert.match(styles, /@media \(max-width: 760px\) \{[\s\S]*?\.choiceList \{ grid-template-columns: 1fr; \}/)
  assert.match(styles, /\.choiceCard \{[^}]*grid-template-columns: 45px 1fr;/)
  assert.match(styles, /\.mealTabs \{[^}]*position: static;[^}]*height: auto;[^}]*padding: 0;[^}]*background: transparent;/)
  assert.match(styles, /\.preferenceActions \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(styles, /\.shoppingGroups \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(styles, /@media \(max-width: 600px\) \{[\s\S]*?\.weeklyCapsule > header, \.shoppingGroups \{ grid-template-columns: 1fr; \}/)
  assert.match(styles, /\.calendarGrid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(styles, /@media \(max-width: 600px\) \{[\s\S]*?\.calendarGrid \{ grid-template-columns: 1fr; \}/)
  assert.match(styles, /@media \(min-width: 980px\) \{[\s\S]*?\.portal \{ padding-bottom: 148px; \}/)
})
