import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const root = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 4174)
const requestedDataDir = process.env.DATA_DIR || path.join(root, 'data')
let dataDir = requestedDataDir
let storePath = path.join(dataDir, 'site-data.enc.json')
const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-2026'
const encryptionSecret = process.env.DATA_ENCRYPTION_KEY || `${adminPassword}:olga-korzun-local-store`
const encryptionKey = crypto.createHash('sha256').update(encryptionSecret).digest()
const sessions = new Map()

async function prepareDataDirectory() {
  const candidates = [...new Set([requestedDataDir, path.join(root, 'data'), path.join(process.env.TEMP || '/tmp', 'olga-korzun-data')])]
  for (const candidate of candidates) {
    const probe = path.join(candidate, `.write-probe-${process.pid}`)
    try {
      await fs.mkdir(candidate, { recursive: true })
      await fs.writeFile(probe, 'ok', { encoding: 'utf8', mode: 0o600 })
      await fs.rm(probe, { force: true })
      dataDir = candidate
      storePath = path.join(dataDir, 'site-data.enc.json')
      if (candidate !== requestedDataDir) console.warn(`DATA_DIR is unavailable; using writable fallback storage: ${candidate}`)
      return
    } catch (error) {
      await fs.rm(probe, { force: true }).catch(() => undefined)
      console.warn(`Storage directory is not writable (${candidate}): ${error.message}`)
    }
  }
  throw new Error('No writable server storage directory is available')
}

const defaultContent = {
  headlineTop: 'Доходность измеряется', headlineAccent: 'не километрами от подъезда,', headlineBottom: 'а потенциалом роста!',
  heroText: 'Я нахожу недвижимость, которая сохраняет капитал, приносит доход и остаётся вашим сильным решением спустя годы.',
  stats: ['7+', '150+', '2 млрд+'], telegramPosts: ['805', '804', '802'],
}
const emptyStore = () => ({ version: 1, content: defaultContent, leads: [], bookings: [], analytics: [] })

async function readStore() {
  try {
    const envelope = JSON.parse(await fs.readFile(storePath, 'utf8'))
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(envelope.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8')
    const store = { ...emptyStore(), ...JSON.parse(plaintext) }
    if (store.content?.headlineTop === 'Покупайте' && store.content?.headlineAccent === 'ценность,') {
      store.content.headlineTop = defaultContent.headlineTop
      store.content.headlineAccent = defaultContent.headlineAccent
      store.content.headlineBottom = defaultContent.headlineBottom
    }
    return store
  } catch (error) {
    if (error?.code !== 'ENOENT') console.error('Encrypted store could not be read:', error.message)
    return emptyStore()
  }
}

async function writeStore(store) {
  await fs.mkdir(dataDir, { recursive: true })
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(store), 'utf8'), cipher.final()])
  const envelope = JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') })
  const temporary = `${storePath}.${process.pid}.tmp`
  await fs.writeFile(temporary, envelope, { encoding: 'utf8', mode: 0o600 })
  try {
    await fs.rename(temporary, storePath)
  } catch (error) {
    if (!['EEXIST', 'EPERM'].includes(error?.code)) throw error
    await fs.rm(storePath, { force: true })
    await fs.rename(temporary, storePath)
  }
}

let writeQueue = Promise.resolve()
async function updateStore(updater) {
  writeQueue = writeQueue.catch(() => undefined).then(async () => { const store = await readStore(); await updater(store); await writeStore(store); return store })
  return writeQueue
}

function cleanText(value, max = 300) { return String(value || '').trim().slice(0, max) }
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const expires = token && sessions.get(token)
  if (!expires || expires < Date.now()) return res.status(401).json({ error: 'unauthorized' })
  next()
}

app.disable('x-powered-by')
app.use(express.json({ limit: '64kb' }))
app.use((_, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); next() })

app.get('/api/health', (_, res) => res.json({ ok: true, storage: dataDir === requestedDataDir ? 'configured' : 'fallback' }))
app.get('/api/content', async (_, res) => { const store = await readStore(); res.json(store.content) })
app.get('/api/telegram/posts', async (_, res) => {
  try {
    const response = await fetch('https://t.me/s/rieltorolgak', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) })
    if (!response.ok) throw new Error(`Telegram ${response.status}`)
    const html = await response.text()
    const ids = [...html.matchAll(/data-post="rieltorolgak\/(\d+)"/g)].map((match) => match[1]).slice(-3).reverse()
    if (ids.length !== 3) throw new Error('Not enough posts')
    await updateStore((store) => { store.content.telegramPosts = ids })
    res.json({ posts: ids })
  } catch {
    const store = await readStore(); res.json({ posts: store.content.telegramPosts, cached: true })
  }
})
app.post('/api/leads', async (req, res) => {
  const rawCalculation = req.body.calculation
  const calculation = rawCalculation && typeof rawCalculation === 'object' ? {
    budget: Math.max(0, Number(rawCalculation.budget) || 0), years: Math.max(0, Number(rawCalculation.years) || 0), rate: Math.max(0, Number(rawCalculation.rate) || 0), total: Math.max(0, Number(rawCalculation.total) || 0), profit: Math.max(0, Number(rawCalculation.profit) || 0),
  } : null
  const lead = {
    id: crypto.randomUUID(), at: new Date().toISOString(), name: cleanText(req.body.name, 80), contact: cleanText(req.body.contact, 120),
    goal: cleanText(req.body.goal), budget: cleanText(req.body.budget), region: cleanText(req.body.region),
    investmentExperience: cleanText(req.body.investmentExperience, 300), savings: cleanText(req.body.savings, 200),
    creditLeverage: cleanText(req.body.creditLeverage, 200), readiness: cleanText(req.body.readiness, 300), calculation,
  }
  if (!lead.name || !lead.contact || !lead.goal || !lead.budget || !lead.region || !lead.investmentExperience || !lead.savings || !lead.creditLeverage || !lead.readiness) return res.status(400).json({ error: 'missing_fields' })
  await updateStore((store) => { store.leads.push(lead); store.leads = store.leads.slice(-1000) }); res.status(201).json({ ok: true, id: lead.id })
})
app.post('/api/bookings', async (req, res) => {
  const booking = {
    id: crypto.randomUUID(), at: new Date().toISOString(), date: cleanText(req.body.date, 20), time: cleanText(req.body.time, 10),
    name: cleanText(req.body.name, 120), phone: cleanText(req.body.phone, 60), preferredContact: cleanText(req.body.preferredContact, 40),
    investmentExperience: cleanText(req.body.investmentExperience, 300), savings: cleanText(req.body.savings, 200),
    creditLeverage: cleanText(req.body.creditLeverage, 200), readiness: cleanText(req.body.readiness, 200), status: 'new',
  }
  if (!booking.date || !booking.time || !booking.name || !booking.phone || !booking.preferredContact || !booking.investmentExperience || !booking.savings || !booking.creditLeverage || !booking.readiness) return res.status(400).json({ error: 'missing_fields' })
  await updateStore((store) => { store.bookings.push(booking); store.bookings = store.bookings.slice(-1000) }); res.status(201).json({ ok: true, id: booking.id })
})
app.post('/api/events', async (req, res) => {
  const event = { id: crypto.randomUUID(), at: new Date().toISOString(), name: cleanText(req.body.name, 80), details: req.body.details && typeof req.body.details === 'object' ? req.body.details : {} }
  await updateStore((store) => { store.analytics.push(event); store.analytics = store.analytics.slice(-3000) }); res.status(202).json({ ok: true })
})
app.post('/api/admin/login', (req, res) => {
  const supplied = Buffer.from(String(req.body.password || ''))
  const expected = Buffer.from(adminPassword)
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(401).json({ error: 'invalid_password' })
  const token = crypto.randomBytes(32).toString('base64url'); sessions.set(token, Date.now() + 8 * 60 * 60 * 1000); res.json({ token })
})
app.get('/api/admin/dashboard', requireAdmin, async (_, res) => { const store = await readStore(); res.json({ content: store.content, leads: store.leads.slice().reverse(), bookings: store.bookings.slice().reverse(), analytics: store.analytics.slice(-500).reverse() }) })
app.put('/api/admin/content', requireAdmin, async (req, res) => {
  const next = req.body || {}
  await updateStore((store) => { store.content = { headlineTop: cleanText(next.headlineTop, 60), headlineAccent: cleanText(next.headlineAccent, 60), headlineBottom: cleanText(next.headlineBottom, 60), heroText: cleanText(next.heroText, 500), stats: Array.isArray(next.stats) ? next.stats.slice(0, 3).map((v) => cleanText(v, 30)) : store.content.stats, telegramPosts: Array.isArray(next.telegramPosts) ? next.telegramPosts.slice(0, 3).map((v) => cleanText(v, 12).replace(/\D/g, '')) : store.content.telegramPosts } }); res.json({ ok: true })
})

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  console.error(`${req.method} ${req.path} failed:`, error)
  res.status(500).json({ error: 'server_storage_error' })
})

app.use(express.static(path.join(root, 'dist'), { maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0 }))
app.use((_, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
await prepareDataDirectory()
app.listen(port, '0.0.0.0', () => console.log(`Olga Korzun server listening on ${port}`))
