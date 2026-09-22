import './style.css'
import { css } from 'goober'
import { atom } from 'nanostores'
import { Router } from './router'

const clickCount = atom(0)

const themeClass = css`
  color: #1a1a1a;
  --color-brand: blue;
  --space-small: 4px;
  --space-medium: 8px;
`

const app = document.querySelector<HTMLDivElement>('#app')!

new Router(
  [
    {
      path: '/',
      view: () => html`
        <div class=${themeClass}>
          <p>Clicked <output id="click-count">${clickCount.get()}</output> times.</p>
          <button id="increment">Click me</button>
          <a href="/about" data-link>About</a>
        </div>
      `,
    },
    {
      path: '/about',
      view: () => html`
        <div class=${themeClass}>
          <h1>About</h1>
          <a href="/" data-link>Back to counter</a>
        </div>
      `,
    },
  ],
  app,
)

clickCount.subscribe((count) => {
  const countOutput = document.querySelector<HTMLOutputElement>('#click-count')
  if (countOutput) countOutput.textContent = `${count}`
})

app.addEventListener('click', (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('#increment')) return
  clickCount.set(clickCount.get() + 1)
})
