/**
 * A tiny stand-in for the Anthropic API, for trying the Week page end to end without spending real tokens:
 *   node scripts/meal-plan/mock-anthropic.cjs            (listens on :4010)
 *   ANTHROPIC_BASE_URL=http://localhost:4010 ANTHROPIC_API_KEY=mock npm start
 * It plays a fixed, sensible agent: a draft reads and searches, then sets every slot; "swap Wednesday for fish" searches
 * for fish and sets Wednesday's main. It is a script, not a model: it only proves the app's plumbing.
 */
const http = require('http')

const addDays = (key, n) => {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const reply = (res, model, content) => {
  const usedTool = content.some(b => b.type === 'tool_use')
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({
    id: 'msg_mock', type: 'message', role: 'assistant', model, content,
    stop_reason: usedTool ? 'tool_use' : 'end_turn', stop_sequence: null,
    usage: { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  }))
}
const toolResults = body => {
  const last = body.messages[body.messages.length - 1]
  return Array.isArray(last.content)
    ? last.content.filter(b => b.type === 'tool_result').map(b => { try { return JSON.parse(typeof b.content === 'string' ? b.content : b.content[0].text) } catch { return null } })
    : []
}
let n = 0
const id = () => `toolu_mock_${++n}`

http.createServer((req, res) => {
  let raw = ''
  req.on('data', c => (raw += c))
  req.on('end', () => {
    const body = JSON.parse(raw || '{}')
    const first = body.messages[0].content
    const text = typeof first === 'string' ? first : first[0].text
    const turn = body.messages.filter(m => m.role === 'assistant').length
    const isDraft = /Draft the week/.test(text)
    const weekStart = (text.match(/(\d{4}-\d{2}-\d{2})/g) || [])[isDraft ? 1 : 1]
    const start = isDraft ? (text.match(/Draft the week (\d{4}-\d{2}-\d{2})/) || [])[1] : (text.match(/runs (\d{4}-\d{2}-\d{2})/) || [])[1]
    void weekStart

    if (isDraft) {
      if (turn === 0) {
        return reply(res, body.model, [
          { type: 'tool_use', id: id(), name: 'read_plan', input: { from: addDays(start, -14), to: addDays(start, 6) } },
          { type: 'tool_use', id: id(), name: 'read_day_notes', input: { from: start, to: addDays(start, 6) } },
          { type: 'tool_use', id: id(), name: 'search_recipes', input: { slot: 'protein', notOnPlanInLastDays: 14 } },
          { type: 'tool_use', id: id(), name: 'search_recipes', input: { slot: 'carb' } },
          { type: 'tool_use', id: id(), name: 'search_recipes', input: { slot: 'vegetable' } },
        ])
      }
      if (turn === 1) {
        const results = toolResults(body)
        const searches = results.filter(r => r && r.recipes).map(r => r.recipes.map(x => x.id))
        const [proteins, carbs, vegs] = searches
        const calls = []
        for (let i = 0; i < 7; i++) {
          if (i === 3) continue // the note says "out"
          const date = addDays(start, i)
          const reason = i === 1 ? 'Football till 7: done by 7:30' : `Not had it for ${i + 2} weeks`
          calls.push({ type: 'tool_use', id: id(), name: 'set_meal_slot', input: { date, slot: 'protein', recipe_id: proteins[i % proteins.length], reason } })
          calls.push({ type: 'tool_use', id: id(), name: 'set_meal_slot', input: { date, slot: 'carb', recipe_id: carbs[i % carbs.length] } })
          calls.push({ type: 'tool_use', id: id(), name: 'set_meal_slot', input: { date, slot: 'vegetable', recipe_id: vegs[i % vegs.length] } })
        }
        return reply(res, body.model, calls)
      }
      return reply(res, body.model, [{ type: 'text', text: 'Quick meals on football night. Thursday left free.' }])
    }

    // Ask: "swap Wednesday for fish"
    if (turn === 0) return reply(res, body.model, [{ type: 'tool_use', id: id(), name: 'search_recipes', input: { slot: 'protein', query: 'sea bass' } }])
    if (turn === 1) {
      const hit = (toolResults(body)[0] || {}).recipes
      return reply(res, body.model, [{ type: 'tool_use', id: id(), name: 'set_meal_slot', input: { date: addDays(start, 2), slot: 'protein', recipe_id: hit[0].id } }])
    }
    return reply(res, body.model, [{ type: 'text', text: 'Swapped Wednesday for Pan Fried Sea Bass: fish, and quick.' }])
  })
}).listen(4010, () => console.log('mock anthropic on :4010'))
