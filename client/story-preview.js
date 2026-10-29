'use strict';

const slides = [
  { chapter: 'THE CHARTER', title: 'The frontier has gone silent.',
    copy: 'The Guild sends four Wayfarers to find the source, recover the survey records, and bring every crawler home.',
    alt: 'Four Wayfarers receive a sealed charter from the mysterious Guild Quest Master.', position: '0% 0%' },
  { chapter: 'THE OUTPOST', title: 'The forest is freezing from within.',
    copy: 'An abandoned outpost stands where deepwood meets permafrost. Beneath its broken arch, a violet signal marks a route the old map cannot explain.',
    alt: 'The expedition approaches a deserted frontier outpost amid frost, roots and a faint violet signal.', position: '100% 0%' },
  { chapter: 'THE DEEPWOOD', title: 'Stand together beneath the wings.',
    copy: 'Roots break the ground. Barkwings wheel above the guardian. The Wayfarers hold the line, protect one another, and search for an opening.',
    alt: 'The mage, protector, scout and healer cooperate against a towering root guardian and airborne Barkwings.', position: '0% 100%' },
  { chapter: 'THE RECORDS', title: 'The charter leaves questions unanswered.',
    copy: 'The recovered survey folio offers a clue. The gate still glows, and the Guild has more to explain. This aftermath is a story proposal; the playable build records victory and offers a harder cycle.',
    alt: 'The four travelers examine recovered survey records on a bridge beside a mysterious violet gate.', position: '100% 100%' }
];
const scene = document.querySelector('#scene');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
let index = 0;

function showSlide(requested) {
  index = Math.max(0, Math.min(slides.length - 1, requested));
  const slide = slides[index];
  scene.style.backgroundPosition = slide.position;
  scene.setAttribute('aria-label', slide.alt);
  document.querySelector('#chapter').textContent = `${String(index + 1).padStart(2, '0')} / 04 · ${slide.chapter}`;
  document.querySelector('#scene-title').textContent = slide.title;
  document.querySelector('#scene-copy').textContent = slide.copy;
  document.querySelector('#page-count').textContent = `${index + 1} of ${slides.length}`;
  previous.disabled = index === 0;
  next.disabled = index === slides.length - 1;
}
previous.addEventListener('click', () => showSlide(index - 1));
next.addEventListener('click', () => showSlide(index + 1));
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  showSlide(index + (event.key === 'ArrowRight' ? 1 : -1));
});
showSlide(0);
