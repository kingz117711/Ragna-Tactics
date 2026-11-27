const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Draw the response on its own layer. Map cards and dialog contents can change
// during the same click. Leaving the control's DOM alone also preserves focus.
function pulse(x, y, container, kind) {
  if (reducedMotion.matches) return;
  const ring = document.createElement('span');
  ring.className = 'input-pulse ' + kind;
  ring.setAttribute('aria-hidden', 'true');
  const insideDialog = container instanceof HTMLDialogElement;
  const rect = insideDialog ? container.getBoundingClientRect() : { left: 0, top: 0 };
  ring.style.left = (x - rect.left + (insideDialog ? container.scrollLeft : 0)) + 'px';
  ring.style.top = (y - rect.top + (insideDialog ? container.scrollTop : 0)) + 'px';
  container.append(ring);
  const animation = ring.animate([
    { transform: 'translate(-50%, -50%) scale(.35)', opacity: 1 },
    { transform: 'translate(-50%, -50%) scale(1.4)', opacity: 0 }
  ], { duration: 370, easing: 'ease-out' });
  animation.finished.then(() => ring.remove(), () => ring.remove());
}

document.addEventListener('click', event => {
  const control = event.target.closest('button, .choice-card');
  if (!control || control.disabled || reducedMotion.matches) return;
  const rect = control.getBoundingClientRect();
  const x = event.detail ? event.clientX : rect.left + rect.width / 2;
  const y = event.detail ? event.clientY : rect.top + rect.height / 2;
  pulse(x, y, control.closest('dialog') || document.body, 'control-pulse');
  control.animate([{ scale: '.97' }, { scale: '1' }], { duration: 180, easing: 'ease-out' });
}, true);

export function acknowledgePoint(event) {
  pulse(event.clientX, event.clientY, document.body, 'field-pulse');
}
