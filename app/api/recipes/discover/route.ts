/**
 * Recipe Discovery API Route
 *
 * POST: Uses Claude with the web search server tool to find recipes
 * based on the user's natural language prompt.
 */

import { NextRequest, NextResponse } from 'next/server'
import { discoverRecipes } from '@/lib/ai/discoverRecipes'

/**
 * POST /api/recipes/discover
 * Discovers recipes using Claude web search
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
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

    const recipes = await discoverRecipes(prompt)
    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('Error in recipe discovery:', error)
    return NextResponse.json(
      { error: 'Failed to discover recipes' },
      { status: 500 }
    )
  }
}
