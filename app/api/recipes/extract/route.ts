/**
 * Recipe Extraction API Route
 *
 * Uses AI to extract ingredients from recipe text or URLs.
 * This demonstrates how the AI abstraction layer is used in the app.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  extractIngredientsFromURL,
  extractIngredientsFromText,
} from '@/lib/ai'

/**
 * POST /api/recipes/extract
 * Extract ingredients from a URL or text using AI
 *
 * Request body should include either:
 * - { url: string } - for URL extraction
 * - { text: string } - for text extraction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if we have a URL or text to extract from
    if (body.url) {
      // Extract from URL
      const result = await extractIngredientsFromURL(body.url)
      return NextResponse.json(result)
    } else if (body.text) {
      // Extract from pasted text
      const result = await extractIngredientsFromText(body.text)
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: 'Must provide either url or text' },
        { status: 400 }
      )
    }
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
