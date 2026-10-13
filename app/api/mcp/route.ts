import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp'
import { createMcpServer } from '@/lib/mcp/server'
import { isMcpRequestAuthorized } from '@/lib/mcp/auth'

async function handle(req: Request) {
  if (!isMcpRequestAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
    })
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true })
  const server = createMcpServer()
  await server.connect(transport)
  return transport.handleRequest(req)
}

export const GET = handle
export const POST = handle
export const DELETE = handle
