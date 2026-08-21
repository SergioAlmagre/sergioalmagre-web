(() => {
  const items = [...document.querySelectorAll('[data-gallery-item]')];
  const lightbox = document.getElementById('waves-lightbox');
  const lightboxImage = document.getElementById('waves-lightbox-image');
  const counter = document.getElementById('waves-lightbox-counter');
  const closeButtons = document.querySelectorAll('[data-lightbox-close]');
  const previousButton = document.querySelector('[data-lightbox-prev]');
  const nextButton = document.querySelector('[data-lightbox-next]');
  let activeIndex = 0;
  let lastFocusedElement = null;

  if (!items.length || !lightbox || !lightboxImage || !counter) return;

  function render(index) {
    activeIndex = (index + items.length) % items.length;
    const image = items[activeIndex].querySelector('img');
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    counter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  }

  function open(index) {
    lastFocusedElement = document.activeElement;
    render(index);
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('waves-lightbox-open');
    lightbox.querySelector('[data-lightbox-close]:not(.waves-lightbox__backdrop)')?.focus();
  }

  function close() {
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage.removeAttribute('src');
    document.body.classList.remove('waves-lightbox-open');
    lastFocusedElement?.focus?.();
  }

  items.forEach((item, index) => item.addEventListener('click', () => open(index)));
  closeButtons.forEach((button) => button.addEventListener('click', close));
  previousButton?.addEventListener('click', () => render(activeIndex - 1));
  nextButton?.addEventListener('click', () => render(activeIndex + 1));

  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') render(activeIndex - 1);
    if (event.key === 'ArrowRight') render(activeIndex + 1);
  });
})();
