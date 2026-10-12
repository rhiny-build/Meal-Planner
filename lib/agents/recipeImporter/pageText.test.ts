import { describe, it, expect } from 'vitest'
import { buildPageContent, extractJsonLdRecipe, htmlToText, pageTitle } from './pageText'
import { EXTRACT_HTML_MAX_LENGTH } from '@/lib/ai/config'

const jsonLdPage = (json: unknown) =>
  `<html><head><title>Pancakes &amp; more</title><script type="application/ld+json">${JSON.stringify(json)}</script></head><body>noise</body></html>`

describe('extractJsonLdRecipe', () => {
  const recipe = {
    '@type': 'Recipe',
    name: 'Pancakes',
    image: 'x.jpg',
    author: { name: 'A' },
    recipeIngredient: ['1 cup flour'],
    recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix' }],
  }

  it('finds a top-level Recipe and keeps only the useful fields', () => {
    const found = extractJsonLdRecipe(jsonLdPage(recipe))
    expect(found).toEqual({
      name: 'Pancakes',
      recipeIngredient: ['1 cup flour'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix' }],
    })
  })

  it('finds a Recipe inside @graph and inside an array, and with an array @type', () => {
    expect(extractJsonLdRecipe(jsonLdPage({ '@graph': [{ '@type': 'WebSite' }, recipe] }))?.name).toBe('Pancakes')
    expect(extractJsonLdRecipe(jsonLdPage([{ '@type': 'Person' }, recipe]))?.name).toBe('Pancakes')
    expect(extractJsonLdRecipe(jsonLdPage({ ...recipe, '@type': ['Recipe', 'Thing'] }))?.name).toBe('Pancakes')
  })

  it('skips malformed JSON-LD and non-recipe scripts', () => {
    const html =
      '<script type="application/ld+json">{broken</script>' +
      '<script type="application/ld+json">{"@type":"Organization"}</script>'
    expect(extractJsonLdRecipe(html)).toBeNull()
  })

  it('returns null when there is no JSON-LD', () => {
    expect(extractJsonLdRecipe('<html><body>hi</body></html>')).toBeNull()
  })
})

describe('htmlToText', () => {
  it('drops scripts, styles and nav, keeps block structure, decodes entities', () => {
    const html = `<html><head><style>.a{}</style></head><body>
      <nav>Menu</nav><script>var x=1</script>
      <h1>Schnitzel &amp; chips</h1><ul><li>2   chicken breasts</li><li>1&frac12; cups crumbs</li></ul>
      <p>Fry it.<br>Serve.</p></body></html>`
    expect(htmlToText(html)).toBe('Schnitzel & chips\n2 chicken breasts\n1½ cups crumbs\nFry it.\nServe.')
  })
})

describe('pageTitle', () => {
  it('reads and decodes the title', () => {
    expect(pageTitle(jsonLdPage({}))).toBe('Pancakes & more')
    expect(pageTitle('<p>none</p>')).toBeNull()
  })
})

describe('buildPageContent', () => {
  it('prefers JSON-LD and omits page text', () => {
    const content = buildPageContent('https://x.test/r', jsonLdPage({ '@type': 'Recipe', name: 'P' }))
    expect(content.source).toBe('json-ld')
    expect(content.recipe).toEqual({ name: 'P' })
    expect(content.text).toBeUndefined()
  })

  it('falls back to page text, truncated to the limit', () => {
    const body = '<p>' + 'word '.repeat(EXTRACT_HTML_MAX_LENGTH) + '</p>'
    const content = buildPageContent('https://x.test/r', `<html><body>${body}</body></html>`)
    expect(content.source).toBe('page-text')
    expect(content.text!.length).toBe(EXTRACT_HTML_MAX_LENGTH)
    expect(content.truncated).toBe(true)
  })
})
