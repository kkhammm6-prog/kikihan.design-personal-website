(() => {
  const trigger = document.querySelector('#wechat-trigger');
  const modal = document.querySelector('#wechat-modal');
  const close = document.querySelector('#wechat-close');
  const card = document.querySelector('#wechat-lanyard');
  if (!trigger || !modal || !close || !card) return;

  let drag = null;
  const closeModal = () => { modal.classList.remove('is-entered'); modal.hidden = true; document.body.style.overflow = ''; trigger.focus(); };
  trigger.addEventListener('click', () => {
    const rect = trigger.getBoundingClientRect();
    modal.style.setProperty('--reveal-x', `${rect.left + rect.width / 2}px`);
    modal.style.setProperty('--reveal-y', `${rect.top + rect.height / 2}px`);
    modal.hidden = false;
    modal.classList.remove('is-entered');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('is-entered'));
    close.focus();
  });
  close.addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
  card.addEventListener('pointerdown', event => {
    card.setPointerCapture(event.pointerId);
    drag = { pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:0, y:0 };
    card.classList.add('is-dragging');
  });
  card.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = Math.max(-innerWidth * .34, Math.min(innerWidth * .34, event.clientX - drag.startX));
    drag.y = Math.max(-innerHeight * .26, Math.min(innerHeight * .26, event.clientY - drag.startY));
    card.style.setProperty('--badge-x', `${drag.x}px`);
    card.style.setProperty('--badge-y', `${drag.y}px`);
    card.style.setProperty('--badge-rotation', `${drag.x * .018}deg`);
  });
  const end = event => { if (!drag || drag.pointerId !== event.pointerId) return; drag = null; card.classList.remove('is-dragging'); card.releasePointerCapture(event.pointerId); };
  card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
})();
