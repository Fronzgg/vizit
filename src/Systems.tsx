import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, CalendarDays, Calculator, Check, Copy, LockKeyhole, Send, X } from 'lucide-react'

export type ToolName = 'calculator' | 'brief' | 'booking' | null
export type CalculationData = { budget: number; years: number; rate: number; total: number; profit: number }

export type SiteContent = {
  headlineTop: string
  headlineAccent: string
  headlineBottom: string
  heroText: string
  stats: [string, string, string]
  telegramPosts: [string, string, string]
}

export const defaultSiteContent: SiteContent = {
  headlineTop: 'Доходность измеряется',
  headlineAccent: 'не километрами от подъезда,',
  headlineBottom: 'а потенциалом роста!',
  heroText: 'Я нахожу недвижимость, которая сохраняет капитал, приносит доход и остаётся вашим сильным решением спустя годы.',
  stats: ['7+', '150+', '2 млрд+'],
  telegramPosts: ['805', '804', '802'],
}

export function getSiteContent(): SiteContent {
  return defaultSiteContent
}

export function trackEvent(name: string, details: Record<string, unknown> = {}) {
  const event = { name, details, at: new Date().toISOString() }
  try {
    const events = JSON.parse(localStorage.getItem('ok_analytics') || '[]')
    localStorage.setItem('ok_analytics', JSON.stringify([...events.slice(-199), event]))
  } catch { /* analytics must never block the interface */ }
  fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), keepalive: true }).catch(() => undefined)
  window.dispatchEvent(new CustomEvent('ok-analytics', { detail: event }))
  const globalWindow = window as typeof window & { dataLayer?: unknown[]; ym?: (...args: unknown[]) => void }
  globalWindow.dataLayer = globalWindow.dataLayer || []
  globalWindow.dataLayer.push({ event: name, ...details })
  const counterId = import.meta.env.VITE_YANDEX_METRIKA_ID
  if (counterId && globalWindow.ym) globalWindow.ym(Number(counterId), 'reachGoal', name, details)
}

export function useAnalytics() {
  useEffect(() => {
    trackEvent('page_view', { path: location.pathname })
    const trackLink = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest('a')
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (href.startsWith('http') || href.startsWith('tel:')) trackEvent('contact_click', { href, label: link.textContent?.trim().slice(0, 80) })
    }
    document.addEventListener('click', trackLink)
    const counterId = import.meta.env.VITE_YANDEX_METRIKA_ID
    if (!counterId || document.getElementById('yandex-metrika')) return () => document.removeEventListener('click', trackLink)
    const globalWindow = window as typeof window & { ym?: (...args: unknown[]) => void }
    globalWindow.ym = globalWindow.ym || function (...args: unknown[]) {
      const fn = globalWindow.ym as unknown as { a?: unknown[]; l?: number }
      fn.a = fn.a || []; fn.a.push(args)
    }
    ;(globalWindow.ym as unknown as { l: number }).l = Date.now()
    const script = document.createElement('script')
    script.id = 'yandex-metrika'; script.async = true; script.src = 'https://mc.yandex.ru/metrika/tag.js'
    document.head.appendChild(script)
    globalWindow.ym(Number(counterId), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true })
    return () => document.removeEventListener('click', trackLink)
  }, [])
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <motion.div className="tool-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
    <motion.section className="tool-modal" initial={{ opacity: 0, y: 35, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .98 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }} onClick={(event) => event.stopPropagation()}>
      <div className="tool-modal-head"><div><span>{eyebrow}</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Закрыть"><X /></button></div>
      {children}
    </motion.section>
  </motion.div>
}

function SubmissionFlight({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2100)
    return () => window.clearTimeout(timer)
  }, [onComplete])
  return <div className="submission-flight" aria-label="Заявка отправляется">
    <motion.div className="flight-caption" initial={{ opacity: 0, y: 10 }} animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -8] }} transition={{ duration: 1.8 }}>Отправляем заявку…</motion.div>
    <motion.div className="envelope-flight" animate={{ x: [0, 0, 0, 520], y: [0, 0, 0, -230], scale: [1, 1, .72, .25], rotate: [0, 0, -8, -24], opacity: [1, 1, 1, 0] }} transition={{ duration: 1.9, times: [0, .42, .62, 1], ease: [0.22, 1, 0.36, 1] }}>
      <motion.div className="flight-paper" initial={{ y: -68, scaleY: 1 }} animate={{ y: [ -68, 4, 22 ], scaleY: [1, .72, .12], opacity: [1, 1, 0] }} transition={{ duration: .9, times: [0, .65, 1], ease: [0.76, 0, 0.24, 1] }}><span /><span /><span /></motion.div>
      <div className="envelope-body" />
      <motion.div className="envelope-flap" initial={{ rotateX: 0 }} animate={{ rotateX: 180 }} transition={{ duration: .45, delay: .65, ease: [0.76, 0, 0.24, 1] }} />
      <motion.div className="flight-plane" initial={{ opacity: 0, scale: .4 }} animate={{ opacity: [0, 0, 1], scale: [0, .4, 1] }} transition={{ duration: 1.05, times: [0, .78, 1] }}><Send /></motion.div>
    </motion.div>
  </div>
}

function CalculatorTool({ onClose, onAttach }: { onClose: () => void; onAttach: (calculation: CalculationData) => void }) {
  const [budget, setBudget] = useState(10_000_000)
  const [years, setYears] = useState(5)
  const [rate, setRate] = useState(12)
  const total = useMemo(() => budget * Math.pow(1 + rate / 100, years), [budget, years, rate])
  const profit = total - budget
  const format = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' ₽'

  return <ModalShell title="Калькулятор стратегии" eyebrow="Предварительный сценарий" onClose={onClose}>
    <div className="calculator-layout">
      <div className="calculator-inputs">
        <label><span>Инвестиционный бюджет</span><strong>{format(budget)}</strong><input type="range" min="2000000" max="100000000" step="500000" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></label>
        <label><span>Горизонт</span><strong>{years} {years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}</strong><input type="range" min="1" max="15" value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
        <label><span>Ожидаемый рост в год</span><strong>{rate}%</strong><input type="range" min="4" max="25" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label>
      </div>
      <div className="calculator-result"><span>Расчётная стоимость актива</span><strong>{format(total)}</strong><div><span>Потенциальный прирост</span><b>+{format(profit)}</b></div><small>Расчёт ориентировочный и не является гарантией доходности.</small></div>
    </div>
    <div className="calculator-actions"><button className="tool-secondary" onClick={onClose}>Закрыть</button><button className="tool-primary" onClick={() => { const calculation = { budget, years, rate, total: Math.round(total), profit: Math.round(profit) }; trackEvent('calculator_attached', calculation); onAttach(calculation) }}>Прикрепить к заявке <ArrowUpRight /></button></div>
  </ModalShell>
}

function BriefTool({ onClose, onSent, calculation }: { onClose: () => void; onSent: () => void; calculation: CalculationData | null }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ goal: '', budget: '', region: '', name: '', contact: '' })
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [flying, setFlying] = useState(false)
  const [error, setError] = useState('')
  const questions = [
    { key: 'goal', title: 'Какая задача сейчас главная?', options: ['Сохранить капитал', 'Получать доход', 'Купить для себя', 'Продать объект'] },
    { key: 'budget', title: 'Какой бюджет рассматриваете?', options: ['До 10 млн ₽', '10–30 млн ₽', '30–70 млн ₽', 'Более 70 млн ₽'] },
    { key: 'region', title: 'Какое направление интересно?', options: ['Санкт-Петербург', 'Ленинградская область', 'Карелия', 'Открыт к предложениям'] },
  ] as const

  const finish = async () => {
    if (sending || flying) return
    setSending(true); setError('')
    const record = { ...answers, calculation, at: new Date().toISOString() }
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => null)
    if (!response?.ok) { setSending(false); setError('Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.'); return }
    const calculationText = calculation ? `\nРасчёт: бюджет ${calculation.budget.toLocaleString('ru-RU')} ₽, ${calculation.years} лет, ${calculation.rate}% в год, итог ${calculation.total.toLocaleString('ru-RU')} ₽` : ''
    const message = `Новый запрос с сайта\nИмя: ${answers.name}\nКонтакт: ${answers.contact}\nЗадача: ${answers.goal}\nБюджет: ${answers.budget}\nРегион: ${answers.region}${calculationText}`
    await navigator.clipboard?.writeText(message).catch(() => undefined)
    trackEvent('brief_completed', { goal: answers.goal, budget: answers.budget, region: answers.region })
    setSending(false); setFlying(true)
  }

  return <ModalShell title="Короткий бриф" eyebrow={`Шаг ${Math.min(step + 1, 4)} из 4`} onClose={onClose}>
    {flying ? <SubmissionFlight onComplete={onSent} /> : done ? <div className="tool-success"><Check /><h3>Запрос подготовлен</h3></div> : step < 3 ? <div className="brief-step"><h3>{questions[step].title}</h3><div className="choice-grid">{questions[step].options.map((option) => <button key={option} onClick={() => { setAnswers({ ...answers, [questions[step].key]: option }); setStep(step + 1) }}>{option}<ArrowUpRight /></button>)}</div></div> : <div className="brief-step"><h3>Как с вами связаться?</h3>{calculation && <div className="attached-calculation"><span><Check /> Расчёт прикреплён</span><div><strong>{calculation.budget.toLocaleString('ru-RU')} ₽</strong><small>{calculation.years} лет · {calculation.rate}% в год</small></div><div><strong>{calculation.total.toLocaleString('ru-RU')} ₽</strong><small>расчётная стоимость</small></div></div>}<div className="form-grid"><label><span>Ваше имя</span><input value={answers.name} onChange={(e) => setAnswers({ ...answers, name: e.target.value })} placeholder="Имя" /></label><label><span>Телефон или Telegram</span><input value={answers.contact} onChange={(e) => setAnswers({ ...answers, contact: e.target.value })} placeholder="@username или +7..." /></label></div>{error && <p className="submit-error">{error}</p>}<div className="tool-actions"><button className="tool-back" onClick={() => setStep(2)}><ArrowLeft /> Назад</button><button className="tool-primary" disabled={!answers.name || !answers.contact || sending} onClick={finish}>{sending ? 'Отправляем…' : 'Отправить заявку'} <ArrowUpRight /></button></div></div>}
  </ModalShell>
}

function BookingTool({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index + 1); return date }).filter((date) => ![0, 6].includes(date.getDay())).slice(0, 5), [])
  const [step, setStep] = useState(0)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [answers, setAnswers] = useState({ name: '', phone: '', preferredContact: '', investmentExperience: '', savings: '', creditLeverage: '', readiness: '' })
  const [sending, setSending] = useState(false)
  const [flying, setFlying] = useState(false)
  const [error, setError] = useState('')
  const profileQuestions = [
    { key: 'investmentExperience', title: 'Был ли у вас опыт инвестиций в недвижимость и есть ли сформированный капитал?', options: ['Есть опыт и сформированный капитал', 'Есть опыт, капитал формирую', 'Опыта нет, капитал сформирован', 'Опыта нет, капитал только формирую'] },
    { key: 'savings', title: 'Есть ли у вас накопления для инвестиций?', options: ['Да, необходимая сумма сформирована', 'Есть часть необходимой суммы', 'Накопления только формирую', 'Пока нет накоплений'] },
    { key: 'creditLeverage', title: 'Есть ли у вас возможность использовать кредитное плечо?', options: ['Да, готов(а) использовать', 'Возможно, готов(а) рассмотреть', 'Нет, рассматриваю только собственные средства'] },
    { key: 'readiness', title: 'Если вы увидите понятную и надёжную возможность заработать на недвижимости, как скоро готовы приобрести объект?', options: ['В течение месяца', 'В течение 1–3 месяцев', 'В течение 3–6 месяцев', 'Позднее чем через 6 месяцев', 'Пока изучаю возможности'] },
  ] as const
  const profileComplete = profileQuestions.every((question) => answers[question.key])
  const submit = async () => {
    if (sending || flying) return
    setSending(true); setError('')
    const record = { date, time, ...answers, at: new Date().toISOString() }
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => null)
    if (!response?.ok) { setSending(false); setError('Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.'); return }
    await navigator.clipboard?.writeText(`Запись на консультацию: ${date}, ${time}. ${answers.name}, ${answers.phone}, связь: ${answers.preferredContact}`).catch(() => undefined)
    trackEvent('booking_created', { date, time }); setSending(false); setFlying(true)
  }
  return <ModalShell title="Запись на консультацию" eyebrow={`Шаг ${step + 1} из 3`} onClose={onClose}>
    {flying ? <SubmissionFlight onComplete={onSent} /> : <div className="booking-form">
      <div className="consultation-intro"><p>Заполните мини-анкету. Это поможет мне подготовиться и сэкономить Ваше время на консультации.</p><div><span className={step >= 0 ? 'active' : ''} /><span className={step >= 1 ? 'active' : ''} /><span className={step >= 2 ? 'active' : ''} /></div></div>
      {step === 0 && <motion.div className="consultation-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}><h3>Выберите удобные дату и время</h3><div className="date-grid">{days.map((day) => { const value = day.toISOString().slice(0, 10); return <button type="button" className={date === value ? 'selected' : ''} onClick={() => setDate(value)} key={value}><span>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span><strong>{day.getDate()}</strong><small>{day.toLocaleDateString('ru-RU', { month: 'short' })}</small></button> })}</div><div className="time-grid">{['11:00', '13:00', '15:00', '17:00', '19:00'].map((item) => <button type="button" className={time === item ? 'selected' : ''} onClick={() => setTime(item)} key={item}>{item}</button>)}</div><div className="consultation-nav"><button className="tool-primary" disabled={!date || !time} onClick={() => setStep(1)}>Продолжить <ArrowUpRight /></button></div></motion.div>}
      {step === 1 && <motion.div className="consultation-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}><h3>Как с вами связаться?</h3><div className="consultation-fields"><label><span><b>*</b> Ваши фамилия и имя</span><input value={answers.name} onChange={(e) => setAnswers({ ...answers, name: e.target.value })} placeholder="Иванов Иван" autoComplete="name" /><small>Обязательное поле</small></label><label><span><b>*</b> Номер телефона для связи</span><input type="tel" value={answers.phone} onChange={(e) => setAnswers({ ...answers, phone: e.target.value })} placeholder="+7 999 000-00-00" autoComplete="tel" /><small>Обязательное поле</small></label></div><QuestionChoices title="Предпочтительный способ связи" value={answers.preferredContact} options={['Телефон', 'Telegram', 'MAX']} onChange={(value) => setAnswers({ ...answers, preferredContact: value })} /><div className="consultation-nav"><button className="tool-back" onClick={() => setStep(0)}><ArrowLeft /> Назад</button><button className="tool-primary" disabled={!answers.name.trim() || !answers.phone.trim() || !answers.preferredContact} onClick={() => setStep(2)}>Продолжить <ArrowUpRight /></button></div></motion.div>}
      {step === 2 && <motion.div className="consultation-step consultation-profile" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>{profileQuestions.map((question) => <QuestionChoices key={question.key} title={question.title} value={answers[question.key]} options={[...question.options]} onChange={(value) => setAnswers({ ...answers, [question.key]: value })} />)}{error && <p className="submit-error">{error}</p>}<div className="consultation-nav"><button className="tool-back" onClick={() => setStep(1)}><ArrowLeft /> Назад</button><button className="tool-primary" disabled={!profileComplete || sending} onClick={submit}>{sending ? 'Отправляем…' : 'Отправить заявку'} <CalendarDays /></button></div></motion.div>}
    </div>}
  </ModalShell>
}

function QuestionChoices({ title, value, options, onChange }: { title: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <fieldset className="consultation-question"><legend><b>*</b> {title}</legend><small>Обязательное поле</small><div>{options.map((option) => <button type="button" className={value === option ? 'selected' : ''} onClick={() => onChange(option)} key={option}><span>{value === option && <Check />}</span>{option}</button>)}</div></fieldset>
}

export function ToolLayer({ tool, onClose, onChange }: { tool: ToolName; onClose: () => void; onChange: (tool: ToolName) => void }) {
  const [toast, setToast] = useState(false)
  const [calculation, setCalculation] = useState<CalculationData | null>(null)
  const sent = () => { onClose(); setCalculation(null); setToast(true); window.setTimeout(() => setToast(false), 3000) }
  const attach = (data: CalculationData) => { setCalculation(data); onChange('brief') }
  return <><AnimatePresence mode="wait">{tool === 'calculator' ? <CalculatorTool onClose={onClose} onAttach={attach} /> : tool === 'brief' ? <BriefTool onClose={onClose} onSent={sent} calculation={calculation} /> : tool === 'booking' ? <BookingTool onClose={onClose} onSent={sent} /> : null}</AnimatePresence><AnimatePresence>{toast && <motion.div className="success-toast" initial={{ opacity: 0, y: -35, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}><span><Check /></span><div><strong>Заявка успешно отправлена</strong><small>Ожидайте ответа — Ольга скоро свяжется с вами</small></div></motion.div>}</AnimatePresence></>
}

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(Boolean(sessionStorage.getItem('ok_admin_token')))
  const [password, setPassword] = useState('')
  const [content, setContent] = useState<SiteContent>(getSiteContent())
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [leads, setLeads] = useState<Array<Record<string, string>>>([])
  const [bookings, setBookings] = useState<Array<Record<string, string>>>([])
  const [analytics, setAnalytics] = useState<Array<Record<string, unknown>>>([])

  const loadDashboard = async (token = sessionStorage.getItem('ok_admin_token')) => {
    if (!token) return
    const response = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
    if (!response?.ok) { sessionStorage.removeItem('ok_admin_token'); setAuthenticated(false); return }
    const dashboard = await response.json()
    setContent({ ...defaultSiteContent, ...dashboard.content }); setLeads(dashboard.leads || []); setBookings(dashboard.bookings || []); setAnalytics(dashboard.analytics || [])
  }

  useEffect(() => { if (authenticated) void loadDashboard() }, [authenticated])

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }).catch(() => null)
    if (!response?.ok) { setError('Неверный пароль или сервер недоступен'); return }
    const { token } = await response.json(); sessionStorage.setItem('ok_admin_token', token); setAuthenticated(true)
  }

  if (!authenticated) return <main className="admin-login"><BrandAdmin /><form onSubmit={login}><LockKeyhole /><h1>Закрытый раздел</h1><p>Введите серверный пароль администратора.</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" autoFocus />{error && <span className="admin-error">{error}</span>}<button type="submit">Войти</button></form></main>

  const save = async () => {
    const token = sessionStorage.getItem('ok_admin_token')
    const response = await fetch('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(content) }).catch(() => null)
    if (!response?.ok) return
    setSaved(true); window.setTimeout(() => setSaved(false), 1800)
  }
  return <main className="admin-shell"><header><BrandAdmin /><div><a href="/">Открыть сайт <ArrowUpRight /></a><button onClick={() => { sessionStorage.removeItem('ok_admin_token'); setAuthenticated(false) }}>Выйти</button></div></header><div className="admin-heading"><span>Скрытая панель · серверное хранилище</span><h1>Управление сайтом</h1></div><div className="admin-grid"><section><h2>Главный экран</h2><label>Первая строка<input value={content.headlineTop} onChange={(e) => setContent({ ...content, headlineTop: e.target.value })} /></label><label>Акцент<input value={content.headlineAccent} onChange={(e) => setContent({ ...content, headlineAccent: e.target.value })} /></label><label>Последняя строка<input value={content.headlineBottom} onChange={(e) => setContent({ ...content, headlineBottom: e.target.value })} /></label><label>Описание<textarea value={content.heroText} onChange={(e) => setContent({ ...content, heroText: e.target.value })} /></label></section><section><h2>Цифры и Telegram</h2>{content.stats.map((stat, index) => <label key={index}>Показатель {index + 1}<input value={stat} onChange={(e) => { const stats = [...content.stats] as SiteContent['stats']; stats[index] = e.target.value; setContent({ ...content, stats }) }} /></label>)}<label>ID постов<input value={content.telegramPosts.join(', ')} onChange={(e) => { const ids = e.target.value.split(',').map((item) => item.trim()); setContent({ ...content, telegramPosts: [ids[0] || '', ids[1] || '', ids[2] || ''] }) }} /></label></section></div><button className="admin-save" onClick={save}>{saved ? <><Check /> Сохранено</> : 'Сохранить изменения'}</button><div className="admin-stats"><article><strong>{leads.length}</strong><span>брифов</span></article><article><strong>{bookings.length}</strong><span>записей</span></article><article><strong>{analytics.length}</strong><span>событий</span></article></div><div className="admin-records"><section><h2>Последние заявки</h2>{leads.slice(0, 8).map((lead) => { const calc = lead.calculation as unknown as CalculationData | undefined; const contactType = String(lead.contact || '').trim().startsWith('@') ? 'Telegram' : /^\+?[\d\s()-]+$/.test(String(lead.contact || '').trim()) ? 'Телефон' : 'Telegram / телефон'; return <article className="admin-lead" key={lead.id}><div className="admin-field"><small>Имя</small><strong>{lead.name || 'Не указано'}</strong></div><div className="admin-field"><small>Контакт ({contactType})</small><strong>{lead.contact || 'Не указан'}</strong></div><div className="admin-field admin-field-wide"><small>Запрос</small><span>{lead.goal} · {lead.budget} · {lead.region}</span></div>{calc && <div className="admin-calculation"><b>Расчёт прикреплён</b><span>{Number(calc.budget).toLocaleString('ru-RU')} ₽ · {calc.years} лет · {calc.rate}%</span><span>Итог: {Number(calc.total).toLocaleString('ru-RU')} ₽</span></div>}</article> })}</section><section><h2>Записи на консультацию</h2>{bookings.slice(0, 8).map((booking) => <article className="admin-lead" key={booking.id}><div className="admin-field"><small>Фамилия и имя</small><strong>{booking.name || 'Старая заявка'}</strong></div><div className="admin-field"><small>Телефон · {booking.preferredContact || 'способ связи не указан'}</small><strong>{booking.phone || booking.contact}</strong></div><div className="admin-field admin-field-wide"><small>Дата и время</small><strong>{booking.date} · {booking.time}</strong></div>{booking.investmentExperience && <><div className="admin-field admin-field-wide"><small>Опыт и капитал</small><span>{booking.investmentExperience}</span></div><div className="admin-field"><small>Накопления</small><span>{booking.savings}</span></div><div className="admin-field"><small>Кредитное плечо</small><span>{booking.creditLeverage}</span></div><div className="admin-field admin-field-wide"><small>Готовность к покупке</small><span>{booking.readiness}</span></div></>}</article>)}</section></div><section className="admin-note"><Copy /><p>Заявки, записи, события и настройки хранятся на сервере в зашифрованном AES‑256‑GCM файле.</p></section></main>
}

function BrandAdmin() { return <a className="admin-brand" href="/"><img src="/ok-logo.png" alt="Ольга Корзун" /></a> }
