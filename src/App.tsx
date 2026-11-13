import { useEffect, useState } from 'react'
import type { Check, Run, Site } from './types'

async function loadJson(name: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!response.ok) throw new Error(`Файл ${name} не загрузился: код ${response.status}.`)
  return response.json()
}

function statusText(check: Check | undefined) {
  if (!check) return 'Не проверялся'
  return check.ok ? `Работает · ${check.ms} мс` : `Не открывается · ${check.status || check.error}`
}

function App() {
  const [sites, setSites] = useState<Site[]>([])
  const [history, setHistory] = useState<Run[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/')

  useEffect(() => {
    function onHashChange() { setRoute(window.location.hash.slice(1) || '/') }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const [list, results]: [Site[], { history: Run[] }] = await Promise.all([
          loadJson('sites.json'), loadJson('results.json'),
        ])
        if (!ignore) { setSites(list); setHistory(results.history) }
      } catch (e) {
        if (!ignore) setError((e as Error).message)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const last = history[0]
  const site = sites.find((item) => route === `/site/${encodeURIComponent(item.id)}`)
  const knownRoute = route === '/' || route === '/about' || Boolean(site)

  return (
    <>
      <header className="header">
        <h1>Мониторинг сайтов группы</h1>
        <p>{last ? `Последняя проверка: ${new Date(last.time).toLocaleString('ru')}` : 'Проверок ещё не было'}</p>
        <nav className="nav"><a href="#/">Сводка</a><a href="#/about">О проверке</a></nav>
      </header>
      <main className="main">
        {error && <p className="load-error">{error}</p>}
        {loading ? <p>Загрузка...</p> : route === '/' ? (
          <>
            <h2>Сводка</h2>
            <ul className="sites">
              {sites.map((item) => {
                const check = last?.checks.find((c) => c.id === item.id)
                return (
                  <li key={item.id} className={`site ${!check ? 'site--unknown' : check.ok ? '' : 'site--bad'}`}>
                    <span className="site__status">{statusText(check)}</span>
                    <h3><a href={`#/site/${encodeURIComponent(item.id)}`}>{item.name}</a></h3>
                    <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
                  </li>
                )
              })}
            </ul>
          </>
        ) : route === '/about' ? (
          <section className="panel">
            <h2>О проверке</h2>
            <p>Каждую ночь GitHub Actions проверяет адреса из списка. Результаты сохраняются в репозитории, после чего сайт публикуется заново.</p>
            <p>Проверка ждёт ответ до 15 секунд. Успешными считаются HTTP-ответы с кодами от 200 до 299. Время показывает длительность запроса.</p>
            <p>Хранятся последние 30 проверок. Бот сообщает, когда сайт перестал открываться или снова заработал.</p>
          </section>
        ) : site ? (
          <section className="panel">
            <h2>{site.name}</h2>
            <p><a href={site.url} target="_blank" rel="noreferrer">{site.url}</a></p>
            <h3>История проверок</h3>
            {history.some((run) => run.checks.some((check) => check.id === site.id)) ? (
              <ul className="history">
                {history.map((run) => {
                  const check = run.checks.find((item) => item.id === site.id)
                  return check && <li key={run.time}><time dateTime={run.time}>{new Date(run.time).toLocaleString('ru')}</time><span>{statusText(check)}</span></li>
                })}
              </ul>
            ) : <p>Проверок этого сайта пока нет.</p>}
          </section>
        ) : !knownRoute && !error ? (
          <section className="panel"><h2>Страница не найдена</h2><p>Такого адреса нет.</p><a href="#/">Вернуться к сводке</a></section>
        ) : null}
      </main>
    </>
  )
}

export default App
