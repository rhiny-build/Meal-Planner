/**
 * Recipe Extraction API Route
 *
 * Uses AI to extract ingredients from recipe URLs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractIngredientsFromURL } from '@/lib/ai'

/**
 * POST /api/recipes/extract
 * Extract ingredients from a URL using AI
 *
 * Request body: { url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    const result = await extractIngredientsFromURL(body.url)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error extracting recipe:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to extract recipe',
      },
      { status: 500 }
    )
  }
}
