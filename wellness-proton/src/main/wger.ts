const BASE = 'https://wger.de/api/v2'
const LANGUAGE_EN = 2

export interface WgerExercise {
  id: number
  name: string
  description: string
  category: string
  categoryId: number
  muscles: string[]
  equipment: string[]
}

export interface WgerCategory {
  id: number
  name: string
}

interface RawTranslation {
  language: number
  name: string
  description: string
}

interface RawExerciseInfo {
  id: number
  category: { id: number; name: string }
  muscles: { name_en: string }[]
  equipment: { name: string }[]
  translations: RawTranslation[]
}

interface PagedResponse<T> {
  count: number
  next: string | null
  results: T[]
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`WGER ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

function pickTranslation(translations: RawTranslation[]): RawTranslation | undefined {
  return translations.find((t) => t.language === LANGUAGE_EN) ?? translations[0]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

function toWgerExercise(ex: RawExerciseInfo): WgerExercise | null {
  const t = pickTranslation(ex.translations)
  if (!t?.name?.trim()) return null
  return {
    id: ex.id,
    name: t.name.trim(),
    description: stripHtml(t.description || ''),
    category: ex.category?.name ?? '',
    categoryId: ex.category?.id ?? 0,
    muscles: ex.muscles?.map((m) => m.name_en).filter(Boolean) ?? [],
    equipment: ex.equipment?.map((e) => e.name).filter(Boolean) ?? []
  }
}

// ── In-memory cache ────────────────────────────────────────────────
let _exercises: WgerExercise[] | null = null
let _categories: WgerCategory[] | null = null
let _loadingPromise: Promise<WgerExercise[]> | null = null

async function fetchAllExercises(): Promise<WgerExercise[]> {
  if (_exercises) return _exercises
  if (_loadingPromise) return _loadingPromise

  _loadingPromise = (async () => {
    const LIMIT = 100
    // Fetch first page to get total count
    const first = await get<PagedResponse<RawExerciseInfo>>(
      `${BASE}/exerciseinfo/?format=json&language=${LANGUAGE_EN}&limit=${LIMIT}&offset=0`
    )
    const total = first.count
    const pages = Math.ceil(total / LIMIT)

    // Fetch remaining pages in parallel
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        get<PagedResponse<RawExerciseInfo>>(
          `${BASE}/exerciseinfo/?format=json&language=${LANGUAGE_EN}&limit=${LIMIT}&offset=${(i + 1) * LIMIT}`
        )
      )
    )

    const all = [first, ...rest].flatMap((p) => p.results)
    _exercises = all.map(toWgerExercise).filter((e): e is WgerExercise => e !== null)
    _loadingPromise = null
    return _exercises
  })()

  return _loadingPromise
}

export async function searchExercises(
  query: string,
  categoryId?: number
): Promise<WgerExercise[]> {
  const all = await fetchAllExercises()
  const q = query.trim().toLowerCase()
  return all
    .filter((ex) => {
      const matchCat = categoryId === undefined || ex.categoryId === categoryId
      const matchQ = q === '' || ex.name.toLowerCase().includes(q)
      return matchCat && matchQ
    })
    .slice(0, 50)
}

export async function getCategories(): Promise<WgerCategory[]> {
  if (_categories) return _categories
  const data = await get<PagedResponse<WgerCategory>>(`${BASE}/exercisecategory/?format=json`)
  _categories = data.results
  return _categories
}

// Kick off background prefetch so first search is instant
export function prefetchExercises(): void {
  fetchAllExercises().catch(() => {})
}
