document.addEventListener('DOMContentLoaded', () => {
  const API_URL        = 'https://informes.educacionweb.es';
  const app            = document.getElementById('app');
  const overlay        = document.getElementById('loadingOverlay');
  const stepEl         = document.getElementById('loadingStep');
  const tipEl          = document.getElementById('loadingTip');
  const chatBox        = document.querySelector('.chat-messages');
  const chipsContainer = document.querySelector('.chat-input .chips');
  const sidebarList    = document.querySelector('.sidebar.right .characters-list');
  const attemptsEl     = document.getElementById('attemptsCounter');
  const input          = document.getElementById('message');
  const sendBtn        = document.getElementById('send');

  let gameData;
  let narratorImage;
  let suspectImages   = [];
  let currentIndex    = 0;    // 0 = narrador, 1+ = sospechosos
  let attemptsLeft    = 5;    // intentos iniciales
  const chatHistory   = {};   // historial por índice

  const loadSteps = [
    'Cargando historia...',
    'Cargando personajes...',
    'Poniendo puntos sobre las i...',
    'Generando imágenes...'
  ];
  const tips = [
    'Tip: Observa cada pista detenidamente.',
    'Tip: Pregunta siempre al narrador primero.',
    'Tip: Revisa las coartadas de todos.',
    'Tip: No subestimes a ningún sospechoso.'
  ];

  ;(async function init () {
    app.classList.add('blur');
    overlay.style.display = 'flex';

    try {
      const startPromise = startGame();
      for (let i = 0; i < loadSteps.length; i++) {
        stepEl.textContent = loadSteps[i];
        tipEl.textContent  = tips[i];
        await new Promise(r => setTimeout(r, 2500));
      }
      await startPromise;
    } finally {
      overlay.style.display = 'none';
      app.classList.remove('blur');
    }

    showIntroModal();
    updateSendButton();
  })();

  async function startGame () {
    const res = await fetch(`${API_URL}/start_game`, { method: 'POST' });
    if (!res.ok) throw new Error('Error generando partida');
    const { data } = await res.json();
    gameData = data;

    // Inicializar historial
    chatHistory[0] = [{ sender: 'bot', text: data.intro_narrator }];
    data.suspects.forEach((_, i) => chatHistory[i + 1] = []);

    // Imagenes
    narratorImage = 'https://preview.redd.it/what-is-your-c-ai-pfp-ill-go-first-v0-19dlqdqksggb1.jpg?width=1080&crop=smart&auto=webp&s=2d56f7565ed5d404454a1d47a2535c69f525158c';
    const descs = data.suspects.map(s => `Retrato de ${s.name}, ${s.descripcion}`);
    suspectImages = await Promise.all(descs.map(fetchPFP));

    renderSidebar();
    renderChips();
    loadCharacter(0);

    document.querySelector('.scene p').textContent          = data.scenario;
    document.querySelector('.sidebar.left > p').textContent = data.inicio;
  }

  async function fetchPFP (description) {
    try {
      const r = await fetch(`${API_URL}/generate_pfp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      if (r.ok) {
        const { image } = await r.json();
        return image;
      }
    } catch {}
    return 'https://i.pinimg.com/1200x/7c/3c/97/7c3c978ebca761862373cdc8e776f5ec.jpg';
  }

  function renderSidebar () {
    sidebarList.innerHTML = '';
    gameData.suspects.forEach((s, i) => {
      const idx = i + 1;
      sidebarList.appendChild(createCard(suspectImages[i], s, idx === currentIndex, idx));
    });
  }

  function renderChips () {
    chipsContainer.innerHTML = '';
    chipsContainer.appendChild(createChip(narratorImage, 'Narrador', currentIndex === 0, () => loadCharacter(0)));
    gameData.suspects.forEach((s, i) => {
      const idx = i + 1;
      chipsContainer.appendChild(createChip(suspectImages[i], s.name, currentIndex === idx, () => loadCharacter(idx)));
    });
  }

  function loadCharacter (idx) {
    currentIndex = idx;
    document.querySelectorAll('.character-card').forEach(el =>
      el.classList.toggle('active', +el.dataset.index === idx)
    );
    document.querySelectorAll('.chat-input .chip').forEach((el, i) =>
      el.classList.toggle('active', i === idx)
    );

    chatBox.innerHTML = '';
    chatHistory[idx].forEach(({ sender, text }) => {
      const div = document.createElement('div');
      div.className = `message ${sender}`;
      div.textContent = text;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;

    input.disabled = false;
    updateAttemptsUI();
    updateSendButton();
  }

  function createCard (img, s, active, idx) {
    const card = document.createElement('div');
    card.className = 'character-card' + (active ? ' active' : '');
    card.dataset.index = idx;
    card.innerHTML = `
      <img class="character-photo" src="${img}" alt="${s.name}">
      <p class="description">${s.name}</p>
      <div class="tags">
        <span class="tag"><img src="svg/Personalidad.svg"> ${s.personality}</span>
        <span class="tag"><img src="svg/Coartada.svg"> ${s.coartada}</span>
        <span class="tag"><img src="svg/Pistas.svg"> ${s.detalles_adicionales}</span>
      </div>`;
    card.addEventListener('click', () => loadCharacter(idx));
    return card;
  }

  function createChip (img, name, active, cb) {
    const chip = document.createElement('div');
    chip.className = 'chip' + (active ? ' active' : '');
    chip.innerHTML = `<img src="${img}" alt="${name}"><span>${name}</span>`;
    chip.addEventListener('click', cb);
    return chip;
  }

  function showIntroModal () {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Comienza la investigación</h2>

      <h3>Inicio</h3>
      <p>${gameData.inicio}</p>

      <h3>Escenario</h3>
      <p>${gameData.scenario}</p>

      <h3>Objetivo del juego</h3>
      <ul class="objective">
        <li>🔪 El arma del crimen</li>
        <li>📍 El lugar donde ocurrió</li>
        <li>⏰ La hora exacta</li>
        <li>🕵️ Quién fue el culpable</li>
      </ul>
      <p>Cuando creas que sabes alguna, puedes hacer una acusación. <strong>Pero cuidado... si te equivocas, pierdes intentos.</strong></p>

      <h3>Normas del juego</h3>
      <ul class="objective">
        <li>Tienes un <strong>número limitado de intentos</strong>. ¡Úsalos bien!</li>
        <li>Puedes <strong>hablar con los sospechosos</strong>. Mira su nombre, descripción y coartada.</li>
        <li>Usa el <strong>chat del narrador</strong> para pedir ayuda o confirmar sospechas.</li>
        <li>Cuando acuses, puedes decir <strong>una o varias cosas</strong> (arma, lugar, hora, culpable).</li>
        <li><strong>Por cada error pierdes un intento</strong>.</li>
        <li>Si aciertas todo, ganas. Si se acaban los intentos, pierdes.</li>
      </ul>

      <h3>Personajes</h3>
      <div class="modal-characters"></div>

      <button class="btn-primary" id="aceptar">Aceptar</button>
    </div>`;
  
  document.body.appendChild(modal);

  // Render de personajes sin clic
  const list = modal.querySelector('.modal-characters');
  gameData.suspects.forEach((s, i) => {
    const idx = i + 1;
    const card = createCard(suspectImages[i], s, false, idx);
    card.style.cursor = 'default';
    card.removeEventListener('click', () => loadCharacter(idx)); // Desactiva por seguridad
    card.onclick = null;
    list.appendChild(card);
  });

  modal.querySelector('#aceptar').addEventListener('click', () => modal.remove());
}

  // Envío de mensaje
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  input.addEventListener('input', updateSendButton);

  function sendMessage () {
    const txt = input.value.trim();
    if (!txt) return;
    addMessage('user', txt);
    input.value = '';
    updateSendButton();

    currentIndex === 0 ? handleNarrator(txt) : handleSuspect(txt);
  }

  function handleNarrator (text) {
    const historyArr = chatHistory[0].map(m =>
      `${m.sender==='user'?'Detective':'Narrador'}: ${m.text}`
    );

    const payload = {
      question:           text,
      start_time:         new Date(gameData.start_time).toISOString(),
      current_time:       new Date().toISOString(),
      history:            historyArr,
      attempts_remaining: attemptsLeft,
      detectives_count:   1,
      scenario:           gameData.scenario,
      suspects:           gameData.suspects,
      murder_details:     gameData.murder_details,
      humor_character:    gameData.humor_character,
      intro_narrator:     gameData.intro_narrator
    };

    fetch(`${API_URL}/ask/narrator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(res => {
        addMessage('bot', res.answer);
        if (res.warning) addMessage('bot', `⚠️ ${res.warning}`);
        if (res.feedback) {
          console.log('Feedback:', res.feedback);
        }

        // ✨ Highlight tutorial messages ✨
        if (res.type.startsWith('tutorial:perso')) {
          const container = document.getElementById('characl');
          container.classList.add('tutorial-highlight');
          setTimeout(() => {
            container.classList.remove('tutorial-highlight');
          }, 5000); // se quita después de 5 segundos
        }
      })
      .catch(() => alert('Error al preguntar al narrador'));
  }


  function handleSuspect (text) {
    const historyArr = chatHistory[currentIndex].map(m =>
      `${m.sender==='user'?'Detective':'Sospechoso'}: ${m.text}`
    );

    const payload = {
      question:      text,
      start_time:    new Date(gameData.start_time).toISOString(),
      current_time:  new Date().toISOString(),
      history:       historyArr,
      suspect_index: currentIndex - 1,
      suspects:      gameData.suspects
    };

    fetch(`${API_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(({ answer }) => addMessage('bot', answer))
      .catch(() => alert('Error al preguntar al sospechoso'));
  }

  function addMessage (sender, text) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    chatHistory[currentIndex].push({ sender, text });
  }

  function updateAttemptsUI () {
    if (currentIndex === 0) {
      attemptsEl.style.display   = 'block';
      attemptsEl.textContent     = `Intentos ${'⬤'.repeat(attemptsLeft)}`;
    } else {
      attemptsEl.style.display   = 'none';
    }
  }

  function updateSendButton () {
    const img = sendBtn.querySelector('img');
    if (input.value.trim()) {
      sendBtn.disabled = false;
      img.src = 'svg/arrow-circle-up-active.svg';
    } else {
      sendBtn.disabled = true;
      img.src = 'svg/arrow-circle-up-disabled.svg';
    }
  }

  // Añadido para manejar el toggle de las sidebars en móvil
  const leftSidebar = document.querySelector('.sidebar.left');
  const rightSidebar = document.querySelector('.sidebar.right');

  const leftToggle = document.createElement('button');
  leftToggle.className = 'sidebar-toggle toggle-left';
  leftToggle.textContent = '☰';
  leftToggle.addEventListener('click', () => {
    leftSidebar.classList.toggle('show');
  });

  document.body.appendChild(leftToggle);

  const rightToggle = document.createElement('button');
  rightToggle.className = 'sidebar-toggle toggle-right';
  rightToggle.textContent = '☰';
  rightToggle.addEventListener('click', () => {
    rightSidebar.classList.toggle('show');
  });

  document.body.appendChild(rightToggle);
});
