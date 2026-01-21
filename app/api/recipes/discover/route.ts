/**
 * Recipe Discovery API Route
 *
 * POST: Uses Perplexity AI to search the web and find recipes
 * based on user's natural language prompt
 */

import { NextRequest, NextResponse } from 'next/server'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

/**
 * POST /api/recipes/discover
 * Discovers recipes using Perplexity AI web search
 */
export async function POST(request: NextRequest) {
  try {
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      )
    }

    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Call Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a recipe discovery assistant. When asked for recipes, search the web and return exactly 3 recipes in JSON format.

For each recipe, provide:
- name: Recipe name
- recipeUrl: Direct URL to the recipe page (must be a real, working URL)
- ingredients: List of ingredients, one per line
- proteinType: One of: chicken, fish, red-meat, vegetarian (or null if not applicable)
- carbType: One of: rice, pasta, couscous, fries, other (or null if not applicable)
- prepTime: One of: quick, medium, long (quick = <30min, medium = 30-60min, long = >60min)
- tier: Always set to "new"

Return ONLY valid JSON in this format:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "recipeUrl": "https://...",
      "ingredients": "ingredient 1\\ningredient 2\\ningredient 3",
      "proteinType": "chicken",
      "carbType": "rice",
      "prepTime": "quick",
      "tier": "new"
    }
  ]
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Perplexity API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to get recipes from Perplexity' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No response from Perplexity' },
        { status: 500 }
      )
    }

    // Parse the JSON response from Perplexity
    // The response might have markdown code blocks, so we need to extract the JSON
    let jsonContent = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1]
    }

    try {
      const parsed = JSON.parse(jsonContent)
      return NextResponse.json({ recipes: parsed.recipes || [] })
    } catch {
      // Return the AI's response as the error message so user can see what went wrong
      return NextResponse.json(
        { error: content },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in recipe discovery:', error)
    return NextResponse.json(
      { error: 'Failed to discover recipes' },
      { status: 500 }
    )
  }
}
