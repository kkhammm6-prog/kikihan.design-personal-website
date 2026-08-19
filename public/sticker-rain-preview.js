(() => {
  const root = document.querySelector('#sticker-rain');
  if (!root) return;

  const stickers = ['1','2','3','4','5','6','7','8','9','10','12'].map(name => `public/stickers/user-cut/${name}.png`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let particles = [];
  let frame = 0;
  let previous = performance.now();

  const random = (min, max) => min + Math.random() * (max - min);
  const bounds = () => root.getBoundingClientRect();

  function release(particle, oneShot = particle.oneShot, origin) {
    const area = bounds();
    const size = random(innerWidth < 720 ? 38 : 52, innerWidth < 720 ? 76 : 110);
    particle.oneShot = oneShot;
    particle.size = size;
    particle.x = origin ? origin.x + random(-size * .8, size * .8) : random(size * .2, Math.max(size, area.width - size * 1.2));
    particle.y = origin ? origin.y + random(-size, size * .15) : -size - Math.random() * area.height * .42;
    particle.speed = random(area.height * .085, area.height * .15);
    particle.angle = random(-24, 24);
    particle.rotationSpeed = random(-34, 34);
    particle.windPhase = random(0, Math.PI * 2);
    particle.windAmplitude = random(6, Math.min(38, area.width * .05));
    const src = stickers[Math.floor(Math.random() * stickers.length)];
    particle.image.src = src;
    particle.element.style.setProperty('--sticker-art', `url("${src}")`);
    particle.element.style.width = `${size}px`;
  }

  function createParticle(oneShot = false, origin) {
    const element = document.createElement('span');
    element.className = 'sticker-rain-item';
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    element.appendChild(image);
    root.appendChild(element);
    const particle = { element, image, x: 0, y: 0, speed: 0, size: 0, angle: 0, rotationSpeed: 0, windPhase: 0, windAmplitude: 0, oneShot };
    release(particle, oneShot, origin);
    return particle;
  }

  function reset() {
    particles.forEach(particle => particle.element.remove());
    particles = Array.from({ length: innerWidth < 720 ? 7 : stickers.length }, () => createParticle());
    const area = bounds();
    particles.forEach((particle, index) => { const src = stickers[index % stickers.length]; particle.image.src = src; particle.element.style.setProperty('--sticker-art', `url("${src}")`); particle.y = random(-particle.size * .2, area.height * .88); });
  }

  function draw(now) {
    const delta = Math.min((now - previous) / 1000, .1);
    previous = now;
    const area = bounds();
    particles = particles.filter(particle => {
      if (!reduced) {
        const multiplier = root.dataset.slowed === 'true' ? .18 : 1;
        particle.y += particle.speed * delta * multiplier;
        particle.x += Math.sin(now * .0003 + particle.windPhase) * particle.windAmplitude * delta * multiplier;
        particle.angle += particle.rotationSpeed * delta * multiplier;
      }
      const entered = Math.min(1, Math.max(0, (particle.y + particle.size) / (particle.size * 1.4)));
      const exited = Math.min(1, Math.max(0, (area.height - particle.y) / (particle.size * 1.4)));
      particle.element.style.opacity = Math.min(entered, exited);
      particle.element.style.transform = `translate3d(${particle.x}px,${particle.y}px,0) rotate(${particle.angle}deg)`;
      if (particle.y <= area.height + particle.size) return true;
      if (particle.oneShot) { particle.element.remove(); return false; }
      release(particle);
      return true;
    });
    frame = requestAnimationFrame(draw);
  }

  addEventListener('resize', reset);
  reset();
  frame = requestAnimationFrame(draw);
})();
