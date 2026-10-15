import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import TimingReporter from './TimingReporter'
import { PAGE_PENDING_EVENT, PAGE_READY_EVENT } from '@/lib/timing/usePageReady'

let pathname = '/'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

const sent: Record<string, unknown>[] = []
const sendBeacon = vi.fn((_url: string, body: string) => {
  sent.push(JSON.parse(body))
  return true
})

describe('TimingReporter', () => {
  beforeEach(() => {
    sent.length = 0
    pathname = '/'
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    sendBeacon.mockClear()
  })

  const flush = async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
  }

  it('reports a page that arrives complete as soon as it is on screen', async () => {
    render(<TimingReporter />)
    await flush()

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/timing')
    expect(sent[0]).toMatchObject({ kind: 'load', route: '/' })
  })

  it('waits for a page that loads its own data, and reports once when it says ready', async () => {
    render(<TimingReporter />)
    window.dispatchEvent(new Event(PAGE_PENDING_EVENT))
    await flush()
    expect(sendBeacon).not.toHaveBeenCalled()

    window.dispatchEvent(new Event(PAGE_READY_EVENT))
    window.dispatchEvent(new Event(PAGE_READY_EVENT))
    await flush()

    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })

  it('reports a tap on an in-app link as a navigation, timed from the tap', async () => {
    const view = render(
      <>
        <a href="/recipes" data-testid="link">Recipes</a>
        <TimingReporter />
      </>
    )
    await flush()
    sendBeacon.mockClear()

    await act(async () => {
      view.getByTestId('link').click()
      pathname = '/recipes'
      view.rerender(
        <>
          <a href="/recipes" data-testid="link">Recipes</a>
          <TimingReporter />
        </>
      )
    })
    await flush()

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sent.at(-1)).toMatchObject({ kind: 'nav', route: '/recipes' })
  })

  it('reports a page that said pending but never ready after a long wait', async () => {
    render(<TimingReporter />)
    window.dispatchEvent(new Event(PAGE_PENDING_EVENT))
    await flush()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000)
    })

    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })
})
