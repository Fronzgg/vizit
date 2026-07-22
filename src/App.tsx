import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowDown, ArrowUpRight, Menu, Phone, QrCode, X } from 'lucide-react'
import { AdminPanel, getSiteContent, ToolLayer, type ToolName, trackEvent, useAnalytics } from './Systems'

const projects = [
  { number: '01', title: 'Дом у Правдинского озера', type: 'Загородная недвижимость', tag: 'Ленинградская область', image: '/project-pravdinskoe.png', tone: 'sand' },
  { number: '02', title: 'Земля с потенциалом роста', type: 'Инвестиционный участок', tag: 'Республика Карелия', image: '/project-karelia.png', tone: 'wine' },
  { number: '03', title: 'Городской актив', type: 'Доходная недвижимость', tag: 'Санкт-Петербург', image: '', tone: 'graphite' },
]

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const } },
}

function PicturePlaceholder({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div className={`picture-placeholder ${className}`} aria-label={`Место для фотографии: ${label}`}>
      <span className="placeholder-mark">OK</span>
      <span className="placeholder-label">{label}</span>
    </div>
  )
}

function BrandMark({ className = '' }: { className?: string }) {
  return <span className={`brand-mark ${className}`}><img src="/ok-logo.png" alt="Ольга Корзун" /></span>
}

function TelegramFeed({ posts }: { posts: string[] }) {
  return (
    <div className="telegram-feed" aria-label="Последние публикации Telegram-канала">
      {posts.filter(Boolean).map((postId) => (
        <iframe className="telegram-embed" src={`https://t.me/rieltorolgak/${postId}?embed=1&mode=tme`} title={`Публикация Telegram №${postId}`} loading="lazy" key={postId} />
      ))}
    </div>
  )
}

function PublicSite() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [qrOpen, setQrOpen] = useState<'max' | 'telegram' | null>(null)
  const [tool, setTool] = useState<ToolName>(null)
  const [siteContent, setSiteContent] = useState(getSiteContent)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  const titleX = useTransform(scrollYProgress, [0, .16], [0, -55])
  useAnalytics()

  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 650)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/content').then((response) => response.ok ? response.json() : null).catch(() => null),
      fetch('/api/telegram/posts').then((response) => response.ok ? response.json() : null).catch(() => null),
    ]).then(([content, telegram]) => setSiteContent((current) => ({ ...current, ...(content || {}), telegramPosts: telegram?.posts || content?.telegramPosts || current.telegramPosts })))
  }, [])

  useEffect(() => {
    if (!qrOpen) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setQrOpen(null)
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [qrOpen])

  return (
    <div className="site-shell">
      <motion.div className="scroll-progress" style={{ scaleX }} />
      <motion.div className="loader" animate={{ visibility: loaded ? 'hidden' : 'visible' }} transition={{ delay: 1.15 }} aria-hidden="true">
        <motion.div className="loader-panel loader-panel-left" animate={{ x: loaded ? '-101%' : 0 }} transition={{ duration: 1.05, delay: .25, ease: [0.76, 0, 0.24, 1] }} />
        <motion.div className="loader-panel loader-panel-right" animate={{ x: loaded ? '101%' : 0 }} transition={{ duration: 1.05, delay: .25, ease: [0.76, 0, 0.24, 1] }} />
        <div className="split-logo">
          <motion.div className="logo-half logo-half-left" initial={{ x: 0 }} animate={{ x: loaded ? '-42vw' : 0, opacity: loaded ? 0 : 1 }} transition={{ duration: .9, delay: .15, ease: [0.76, 0, 0.24, 1] }}><BrandMark /></motion.div>
          <motion.div className="logo-half logo-half-right" initial={{ x: 0 }} animate={{ x: loaded ? '42vw' : 0, opacity: loaded ? 0 : 1 }} transition={{ duration: .9, delay: .15, ease: [0.76, 0, 0.24, 1] }}><BrandMark /></motion.div>
        </div>
        <motion.div className="loader-flymark" initial={{ left: '50%', top: '50%', scale: 1, opacity: 0 }} animate={{ left: loaded ? 'calc(100% - 46px)' : '50%', top: loaded ? '44px' : '50%', scale: loaded ? .18 : 1, opacity: loaded ? [0, 1, 1, 0] : 0 }} transition={{ duration: 1, delay: .1, ease: [0.22, 1, 0.36, 1] }}><BrandMark /></motion.div>
      </motion.div>

      <header className="nav-wrap">
        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#approach">Подход</a><a href="#projects">Проекты</a><a href="#journal">Журнал</a><button className="nav-tool" onClick={() => { setTool('calculator'); trackEvent('calculator_open', { source: 'navigation' }) }}>Калькулятор</button><button className="nav-application" onClick={() => { setTool('brief'); trackEvent('brief_open', { source: 'navigation' }) }}>Оставить заявку</button>
        </nav>
        <a className="logo" href="#top" aria-label="Ольга Корзун — на главную"><BrandMark /></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

      {menuOpen && <motion.nav className="mobile-nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><a onClick={() => setMenuOpen(false)} href="#approach">Подход</a><a onClick={() => setMenuOpen(false)} href="#projects">Проекты</a><a onClick={() => setMenuOpen(false)} href="#journal">Журнал</a><button onClick={() => { setMenuOpen(false); setTool('calculator'); trackEvent('calculator_open', { source: 'mobile_navigation' }) }}>Калькулятор</button><button onClick={() => { setMenuOpen(false); setTool('brief'); trackEvent('brief_open', { source: 'mobile_navigation' }) }}>Оставить заявку</button><a onClick={() => setMenuOpen(false)} href="#contact">Контакты</a></motion.nav>}

      <main>
        <section className="hero" id="top">
          <div className="hero-copy">
            <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: loaded ? 1 : 0 }} transition={{ delay: .2 }}>Инвестиции в недвижимость · Санкт-Петербург</motion.p>
            <motion.div className="hero-title-wrap" style={{ x: titleX }}>
              <motion.h1 className={(siteContent.headlineTop + siteContent.headlineAccent + siteContent.headlineBottom).length > 45 ? 'long-headline' : ''} initial={{ y: 100, opacity: 0 }} animate={{ y: loaded ? 0 : 100, opacity: loaded ? 1 : 0 }} transition={{ delay: .4, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
                {siteContent.headlineTop}<br /><em>{siteContent.headlineAccent}</em><br />{siteContent.headlineBottom}
              </motion.h1>
            </motion.div>
            <motion.div className="hero-bottom" initial={{ opacity: 0 }} animate={{ opacity: loaded ? 1 : 0 }} transition={{ delay: .65 }}>
              <p>{siteContent.heroText}</p>
              <a href="#approach" className="round-link" aria-label="Узнать больше"><ArrowDown size={20} /></a>
            </motion.div>
          </div>
          <motion.div className="hero-portrait" initial={{ clipPath: 'inset(100% 0 0 0)' }} animate={{ clipPath: loaded ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)' }} transition={{ duration: 1.15, delay: .55, ease: [0.76, 0, 0.24, 1] }}>
            <motion.div className="portrait-parallax" initial={{ scale: 1.06 }} animate={{ scale: loaded ? 1 : 1.06 }} transition={{ duration: 1.6, delay: .55, ease: [0.22, 1, 0.36, 1] }}>
              <img className="hero-photo" src="/olga-hero.png" alt="Ольга Корзун" />
            </motion.div>
            <div className="portrait-caption"><span>Ольга Корзун</span><span>Частный брокер<br />и инвестиционный консультант</span></div>
          </motion.div>
        </section>

        <div className="moving-line" aria-hidden="true"><motion.div className="moving-line-track" initial={{ x: '0%' }} animate={{ x: '-50%' }} transition={{ duration: 22, repeat: Infinity, repeatType: 'loop', ease: 'linear' }}>{[0, 1].map((copy) => <div className="moving-line-group" key={copy}><span>СТРАТЕГИЯ</span><i>✦</i><span>НЕДВИЖИМОСТЬ</span><i>✦</i><span>КАПИТАЛ</span><i>✦</i><span>ТОЧНЫЙ ВЫБОР</span><i>✦</i></div>)}</motion.div></div>

        <section className="manifesto" id="approach">
          <motion.div className="section-index" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}><span>01</span><span>Подход</span></motion.div>
          <motion.p className="manifesto-text" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }}>
            Недвижимость — это не просто адрес. Это <em>сценарий будущего:</em> финансового, семейного, личного. Моя работа — увидеть его раньше рынка.
          </motion.p>
          <div className="principles">
            {[['01', 'Сначала — стратегия', 'Определяем цель, горизонт и допустимый риск. Только после этого начинаем поиск.'], ['02', 'Цифры без иллюзий', 'Проверяю экономику объекта, документы и скрытые расходы до принятия решения.'], ['03', 'Личная ответственность', 'Веду каждый проект сама — от первой встречи до ключей и дальнейшей стратегии.']].map(([n,t,d]) => (
              <motion.article key={n} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}><span>{n}</span><h3>{t}</h3><p>{d}</p></motion.article>
            ))}
          </div>
        </section>

        <section className="numbers">
          <p className="numbers-lead">Опыт, который<br />можно измерить</p>
          <div className="number-grid">
            {[[siteContent.stats[0], 'лет в недвижимости'], [siteContent.stats[1], 'проведённых сделок'], [siteContent.stats[2], 'совокупный объём объектов']].map(([value,label]) => <motion.div key={label} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}><strong>{value}</strong><span>{label}</span></motion.div>)}
          </div>
        </section>

        <section className="projects-section" id="projects">
          <motion.div className="section-index light" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}><span>02</span><span>Избранные проекты</span></motion.div>
          <div className="projects-heading"><h2>Объекты с<br /><em>характером.</em></h2><p>Каждый проект — история о том, как точный выбор превращает пространство в работающий актив.</p></div>
          <div className="project-list">
            {projects.map((project, index) => (
              <motion.article className="project-card" key={project.number} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7, delay: index * .1 }}>
                <div className={`project-image ${project.tone}`}>{project.image ? <img src={project.image} alt={project.title} /> : <PicturePlaceholder label={`Фото проекта ${project.number}`} />}<span className="project-number">{project.number}</span></div>
                <div className="project-meta"><div><span>{project.type}</span><h3>{project.title}</h3></div><span>{project.tag}</span></div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="process">
          <motion.div className="section-index" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}><span>03</span><span>Как мы работаем</span></motion.div>
          <div className="process-layout"><h2>От вопроса<br />к <em>решению.</em></h2><div className="steps">
            {[['01', 'Знакомимся', 'Обсуждаем вашу ситуацию, ожидания и критерии успеха.'], ['02', 'Формируем стратегию', 'Собираю инвестиционную модель и рамку для поиска.'], ['03', 'Отбираю лучшее', 'Анализирую рынок и показываю только обоснованные варианты.'], ['04', 'Закрываем сделку', 'Проверка, переговоры, документы и сопровождение до результата.']].map(([n,t,d]) => <motion.div className="step" key={n} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}><span>{n}</span><h3>{t}</h3><p>{d}</p></motion.div>)}
          </div></div>
          <div className="service-actions"><span>Начать с удобного формата</span><div><button onClick={() => { setTool('brief'); trackEvent('brief_open') }}>Пройти короткий бриф <ArrowUpRight /></button><button onClick={() => { setTool('booking'); trackEvent('booking_open') }}>Выбрать время встречи <ArrowUpRight /></button></div></div>
        </section>

        <section className="journal" id="journal">
          <div className="journal-intro"><div className="section-index"><span>04</span><span>Telegram-журнал</span></div><h2>О рынке —<br /><em>по существу.</em></h2><p>Наблюдения, разборы объектов и логика решений, которой я делюсь в своём канале.</p><a href="#contact">Перейти в Telegram <ArrowUpRight size={16} /></a></div>
          <TelegramFeed posts={siteContent.telegramPosts} />
        </section>

        <section className="quote-section">
          <div className="quote-image"><img src="/olga-final.png" alt="Ольга Корзун" /></div>
          <motion.blockquote variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>«Хорошая инвестиция начинается с честного разговора — о целях, рисках и том, что действительно важно лично вам».</motion.blockquote>
        </section>

        <section className="contact" id="contact">
          <div className="contact-kicker">Всегда на связи</div>
          <h2>Контакты<span>.</span></h2>
          <div className="contact-grid">
            <div className="contact-row"><motion.a className="contact-main" href="https://t.me/KorzunOlga" target="_blank" rel="noreferrer" whileHover={{ x: 8 }}><span className="contact-icon image-icon"><img src="/telegram-icon.png" alt="" /></span><span><small>Telegram</small><strong>@KorzunOlga</strong></span><ArrowUpRight /></motion.a></div>
            <div className="contact-row"><motion.a className="contact-main" href="tel:+79602566929" whileHover={{ x: 8 }}><span className="contact-icon"><Phone /></span><span><small>Телефон</small><strong>+7 960 256-69-29</strong></span><ArrowUpRight /></motion.a></div>
            <div className="contact-row has-qr"><motion.a className="contact-main" href="https://t.me/rieltorolgak" target="_blank" rel="noreferrer" whileHover={{ x: 8 }}><span className="contact-icon image-icon"><img src="/telegram-icon.png" alt="" /></span><span><small>Telegram-канал</small><strong>@rieltorolgak</strong></span><ArrowUpRight /></motion.a><button className="qr-trigger" onClick={() => setQrOpen('telegram')}><QrCode /><span>QR</span></button></div>
            <div className="contact-row has-qr"><motion.a className="contact-main" href="https://max.ru/u/f9LHodD0cOLsrSdJRlQ1l-d9Jf7h0K0-VJ8OxYZgr1TG5n_sbkqvmnNCwwg" target="_blank" rel="noreferrer" whileHover={{ x: 8 }}><span className="contact-icon image-icon"><img src="/max-icon.png" alt="" /></span><span><small>Канал MAX</small><strong>Канал Ольги Корзун</strong></span><ArrowUpRight /></motion.a><button className="qr-trigger" onClick={() => setQrOpen('max')}><QrCode /><span>QR</span></button></div>
          </div>
          <div className="contact-bottom"><div className="contact-note">Ольга Корзун · инвестиции в недвижимость</div><div className="contact-credit">Сайт сделан by <a href="https://t.me/fronzgg" target="_blank" rel="noreferrer">@fronzgg</a></div></div>
        </section>
      </main>

      <footer><a className="logo footer-logo" href="#top"><BrandMark /></a><div><span>Санкт-Петербург · 2026</span><span>Инвестиции в недвижимость</span></div><div className="footer-links"><a href="https://t.me/KorzunOlga" target="_blank" rel="noreferrer">Telegram</a><a href="https://t.me/rieltorolgak" target="_blank" rel="noreferrer">Telegram-канал</a><a href="https://max.ru/u/f9LHodD0cOLsrSdJRlQ1l-d9Jf7h0K0-VJ8OxYZgr1TG5n_sbkqvmnNCwwg" target="_blank" rel="noreferrer">Канал MAX</a></div><div className="footer-legal"><span>© 2026 Все авторские права защищены</span><span>Сайт сделан by <a href="https://t.me/fronzgg" target="_blank" rel="noreferrer">@fronzgg</a></span></div></footer>

      <ToolLayer tool={tool} onClose={() => setTool(null)} onChange={setTool} />

      <AnimatePresence>
        {qrOpen && <motion.div className="qr-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQrOpen(null)} role="dialog" aria-modal="true" aria-label={`QR-код канала ${qrOpen === 'max' ? 'MAX' : 'Telegram'}`}>
          <motion.div className="qr-card" initial={{ opacity: 0, y: 40, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .97 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} onClick={(event) => event.stopPropagation()}>
            <button className="qr-close" onClick={() => setQrOpen(null)} aria-label="Закрыть QR-код"><X /></button>
            <span className="qr-eyebrow">Открыть на телефоне</span>
            <h3>{qrOpen === 'max' ? 'Канал MAX' : 'Telegram-канал'}</h3>
            <div className="qr-image-wrap"><img src={qrOpen === 'max' ? '/max-qr.png' : '/telegram-qr.png'} alt={`QR-код ${qrOpen === 'max' ? 'канала MAX' : 'Telegram-канала'}`} /></div>
            <p>Наведите камеру телефона на QR-код</p>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}

function App() {
  return window.location.pathname.replace(/\/$/, '') === '/udp/frnz/admin' ? <AdminPanel /> : <PublicSite />
}

export default App
