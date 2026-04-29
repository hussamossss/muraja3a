import { readFileSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page } = await params
  const num = parseInt(page)
  if (isNaN(num) || num < 1 || num > 604) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
  }
  const pad  = String(num).padStart(3, '0')
  const file = join(process.cwd(), 'public', 'quran', `page-${pad}.json`)
  try {
    const data = readFileSync(file, 'utf8')
    return new NextResponse(data, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return NextResponse.json({ error: `Page ${num} not found` }, { status: 404 })
  }
}
