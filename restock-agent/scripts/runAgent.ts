import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { classifyAllItems } from '../lib/agent/classifyItems'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function generateRunId(): string {
  return `run_${new Date().toISOString().replace(/[:.]/g, '-')}`
}

async function main() {
  const runId = generateRunId()
  console.log(`\nRestock Agent — run ${runId}`)
  console.log('─'.repeat(50))

  const { processed, logged, skipped } = await classifyAllItems(
    prisma,
    openai,
    runId
  )

  console.log('─'.repeat(50))
  console.log(`Done. Processed: ${processed} | Logged: ${logged} | Skipped: ${skipped}`)
  console.log(`Run ID: ${runId}`)
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
