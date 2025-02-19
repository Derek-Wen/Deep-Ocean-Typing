document.addEventListener('DOMContentLoaded', () => {
  // === ELEMENT REFERENCES ===
  const wordContainer = document.getElementById('word-container');
  const statsDisplay = document.getElementById('stats-display');
  const toggleStatsButton = document.getElementById('toggle-stats');
  const toggleSoundButton = document.getElementById('toggle-sound');

  // === AUDIO & VISUALS SETUP ===
  let soundOn = false;
  let statsVisible = false;

  // Audio assets
  const bgAudio = new Audio('assets/underwater_bg.mp3');
  bgAudio.loop = true;
  let magicalSurfaceAudio = null;
  let magicalSurfaceFadeInterval = null;

  // Sound functions (same as before)
  function playRippleSound() {
    if (!soundOn) return;
    const rippleAudio = new Audio('assets/underwater_movement.wav');
    rippleAudio.play();
  }
  function playKeyboardSound() {
    if (!soundOn) return;
    const keyboardAudio = new Audio('assets/keyboard_type.wav');
    keyboardAudio.volume = 0.3;
    keyboardAudio.play();
  }
  function playKeyboardDeleteSound() {
    if (!soundOn) return;
    const deleteAudio = new Audio('assets/keyboard_type_2.wav');
    deleteAudio.play();
  }
  function playParticleSound() {
    if (!soundOn) return;
    const particleAudio = new Audio('assets/particles_2.mp3');
    particleAudio.play();
  }
  function updateMagicalSurfaceAudio(factor) {
    if (!soundOn) return;
    if (factor > 0) {
      if (!magicalSurfaceAudio) {
        magicalSurfaceAudio = new Audio('assets/magical_surface.wav');
        magicalSurfaceAudio.loop = true;
        magicalSurfaceAudio.volume = 1;
        magicalSurfaceAudio.play();
      }
    } else {
      if (magicalSurfaceAudio && !magicalSurfaceFadeInterval) {
        magicalSurfaceFadeInterval = setInterval(() => {
          if (magicalSurfaceAudio.volume > 0.05) {
            magicalSurfaceAudio.volume = Math.max(0, magicalSurfaceAudio.volume - 0.05);
          } else {
            magicalSurfaceAudio.pause();
            magicalSurfaceAudio = null;
            clearInterval(magicalSurfaceFadeInterval);
            magicalSurfaceFadeInterval = null;
          }
        }, 100);
      }
    }
  }

  // === BACKGROUND & STATS UPDATE SYSTEM ===
  let keystrokeTimestamps = [];
  let lastBackgroundUpdateTime = Date.now();
  let aboveThresholdTime = 0;
  let currentWpm = 0;
  let totalTypedLetters = 0;
  let totalCorrectLetters = 0;

  function updateStatsDisplay() {
    const accuracy =
      totalTypedLetters > 0
        ? Math.round((totalCorrectLetters / totalTypedLetters) * 100)
        : 100;
    statsDisplay.textContent = `Accuracy: ${accuracy}% | WPM: ${currentWpm}`;
  }

  function updateBackgroundBasedOnSpeed() {
    const now = Date.now();
    const deltaTime = now - lastBackgroundUpdateTime;
    lastBackgroundUpdateTime = now;

    // Remove timestamps older than 10 seconds.
    while (keystrokeTimestamps.length && now - keystrokeTimestamps[0] > 10000) {
      keystrokeTimestamps.shift();
    }
    const count = keystrokeTimestamps.length;
    const effectiveTime = count > 0 ? Math.max(now - keystrokeTimestamps[0], 1000) : 10000;
    const wpm = (count / 5) * (60000 / effectiveTime);
    currentWpm = Math.round(wpm);

    if (wpm >= 80) {
      aboveThresholdTime = Math.min(10000, aboveThresholdTime + deltaTime);
    } else {
      aboveThresholdTime = Math.max(0, aboveThresholdTime - deltaTime);
    }
    const factor = aboveThresholdTime / 10000;
    const r = Math.round((1 - factor) * 0 + factor * 110);
    const g = Math.round((1 - factor) * 0 + factor * 156);
    const b = Math.round((1 - factor) * 0 + factor * 255);
    document.body.style.background =
      `linear-gradient(135deg, #000000, rgba(${r},${g},${b},0.81))`;
    updateMagicalSurfaceAudio(factor);

    if (statsVisible) updateStatsDisplay();
  }

  // === VISUAL EFFECTS ===
  function triggerRipple() {
    if (currentWordIndex % 10 !== 0) return;
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    const rect = wordContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    ripple.style.left = `${centerX}px`;
    ripple.style.top = `${centerY}px`;
    const finalScale = Math.random() * 80 + 20;
    ripple.style.setProperty('--final-scale', finalScale);
    document.body.appendChild(ripple);
    playRippleSound();
    setTimeout(() => ripple.remove(), 800);
  }

  function triggerParticles() {
    if (currentWordIndex % 5 !== 0) return;
    playParticleSound();
    const count = Math.floor(Math.random() * 20) + 40;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      const randomX = Math.random() * window.innerWidth;
      const randomY = Math.random() * window.innerHeight;
      particle.style.left = `${randomX}px`;
      particle.style.top = `${randomY}px`;
      const xOffset = (Math.random() * 100 - 50) + "px";
      const yOffset = (Math.random() * -50 - 50) + "px";
      particle.style.setProperty('--x-offset', xOffset);
      particle.style.setProperty('--y-offset', yOffset);
      const size = Math.random() * 3 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 5000);
    }
  }

  // Persistent particles support.
  let persistentParticles = [];
  const maxPersistentParticles = 150;
  function addPersistentParticle() {
    const particle = document.createElement('div');
    particle.classList.add('persistent-particle');
    const randomX = Math.random() * window.innerWidth;
    const randomY = Math.random() * window.innerHeight;
    particle.style.left = `${randomX}px`;
    particle.style.top = `${randomY}px`;
    particle.style.opacity = 0;
    document.body.appendChild(particle);
    setTimeout(() => { particle.style.opacity = 1; }, 50);
    persistentParticles.push(particle);
  }
  function removePersistentParticles() {
    persistentParticles.forEach(p => {
      p.style.opacity = 0;
      setTimeout(() => {
        if (p.parentElement) p.parentElement.removeChild(p);
      }, 500);
    });
    persistentParticles = [];
  }

  // Bubble trails.
  function addBubbleTrail(e) {
    if (e.key === 'Backspace') return;
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight - 10;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    const size = Math.random() * 8 + 8;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    const duration = Math.random() * 2 + 2;
    bubble.style.animationDuration = `${duration}s`;
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), duration * 1000);
  }

  // Purple wave effect.
  function schedulePurpleWave() {
    const delay = Math.random() * 20000;
    setTimeout(() => {
      triggerPurpleWave();
      schedulePurpleWave();
    }, delay);
  }
  function triggerPurpleWave() {
    const wave = document.createElement('div');
    wave.style.position = 'fixed';
    wave.style.top = '0';
    wave.style.left = '-100%';
    wave.style.width = '100%';
    wave.style.height = '100%';
    wave.style.pointerEvents = 'none';
    wave.style.background = 'linear-gradient(90deg, transparent, rgba(128,0,128,0.5), transparent)';
    wave.style.opacity = '0.7';
    wave.style.zIndex = '0';
    wave.style.transition = 'transform 5s ease-out, opacity 5s ease-out';
    document.body.appendChild(wave);
    setTimeout(() => {
      wave.style.transform = 'translateX(200%)';
      wave.style.opacity = '0';
    }, 100);
    setTimeout(() => wave.remove(), 5100);
    if (soundOn) {
      const disorderAudio = new Audio('assets/magical_disorder.wav');
      disorderAudio.play();
    }
  }

  // === WORDS & TYPING MECHANICS ===
  const wordPool = [
    "emily", "cat", "dog", "sun", "star", "moon", "sky", "sea", "wave", "coral", "fish",
    "blue", "red", "green", "light", "deep", "fun", "joy", "play", "cool", "smile",
    "happy", "chill", "surf", "dive", "ocean", "tide", "breeze", "shell", "sand", "reef",
    "jump", "laugh", "dance", "float", "run", "walk", "zoom", "apple", "banana", "grape",
    "peach", "lemon", "melon", "cloud", "drift", "bubbles", "glow", "shine", "fizz", "pop",
    "splash", "cheer", "wink", "giggle", "hug", "zebra", "fox", "panda", "taco", "piano",
    "music", "echo", "jelly", "candy", "soda", "berry", "cookie", "snack", "robot", "cactus",
    "programming", "developer", "keyboard", "function", "variable", "integer", "syntax",
    "framework", "algorithm", "compile", "console", "debugging", "database", "hardware",
    "software", "execute", "command", "network", "frontend", "backend"
  ];
  let words = [];
  let currentWordIndex = 0;
  let typedInput = "";

  // Generate a batch of words.
  function generateWords(count = 30) {
    for (let i = 0; i < count; i++) {
      const word = wordPool[Math.floor(Math.random() * wordPool.length)];
      words.push(word);
      const wordSpan = document.createElement('span');
      wordSpan.classList.add('word');
      if (words.length - 1 === currentWordIndex) {
        wordSpan.classList.add('current');
      }
      for (let char of word) {
        const letterSpan = document.createElement('span');
        letterSpan.classList.add('letter');
        letterSpan.textContent = char;
        wordSpan.appendChild(letterSpan);
      }
      wordContainer.appendChild(wordSpan);
    }
  }

  // Update the display for the current word.
  function updateCurrentWordDisplay() {
    const currentWord = words[currentWordIndex];
    const currentElem = wordContainer.children[currentWordIndex];
    if (!currentElem) return;
    const letterSpans = currentElem.querySelectorAll('.letter');
    letterSpans.forEach(span => {
      span.classList.remove('correct', 'incorrect', 'active');
    });
    for (let i = 0; i < letterSpans.length; i++) {
      if (i < typedInput.length) {
        if (typedInput[i] === currentWord[i]) {
          letterSpans[i].classList.add('correct');
        } else {
          letterSpans[i].classList.add('incorrect');
        }
      } else if (i === typedInput.length) {
        letterSpans[i].classList.add('active');
      }
    }
  }

  // When the user hits space (completing a word).
  function moveToNextWord() {
    const currentElem = wordContainer.children[currentWordIndex];
    if (!currentElem) return;
    const letterSpans = currentElem.querySelectorAll('.letter');
    let correctCount = 0;
    letterSpans.forEach(span => {
      if (span.classList.contains('correct')) correctCount++;
    });
    totalTypedLetters += words[currentWordIndex].length;
    totalCorrectLetters += correctCount;

    // Trigger effects.
    triggerRipple();
    triggerParticles();

    // Mark current word as complete.
    currentElem.classList.remove('current');
    currentElem.classList.add('completed');

    // Advance the index and reset typed input.
    currentWordIndex++;
    typedInput = "";

    // Generate new words if nearing the end.
    if (currentWordIndex >= words.length - 10) {
      generateWords(20);
    }

    // Instead of removing older words immediately, let the DOM keep its structure.
    // (You can implement removal later if performance becomes an issue.)

    // Mark the new current word.
    const nextElem = wordContainer.children[currentWordIndex];
    if (nextElem) {
      nextElem.classList.add('current');
      // Use the native scrollIntoView to center the new word.
      nextElem.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  // === EVENT LISTENERS FOR TYPING ===
  document.addEventListener('keydown', (e) => {
    // Accept only character keys and Backspace.
    if (e.key.length !== 1 && e.key !== 'Backspace') return;
    if (e.key === ' ') {
      e.preventDefault();
      moveToNextWord();
      return;
    }
    if (e.key === 'Backspace') {
      if (typedInput.length > 0) {
        typedInput = typedInput.slice(0, -1);
        playKeyboardDeleteSound();
        updateCurrentWordDisplay();
      }
      keystrokeTimestamps.push(Date.now());
      updateBackgroundBasedOnSpeed();
      return;
    }
    // For normal character input:
    typedInput += e.key;
    playKeyboardSound();
    updateCurrentWordDisplay();
    keystrokeTimestamps.push(Date.now());
    updateBackgroundBasedOnSpeed();
    addBubbleTrail(e);
  });

  // === CONTROLS: SOUND & STATS TOGGLE ===
  toggleSoundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    if (soundOn) {
      bgAudio.play();
      toggleSoundButton.textContent = "Mute Sound";
    } else {
      bgAudio.pause();
      toggleSoundButton.textContent = "Play Sound";
      if (magicalSurfaceAudio) {
        magicalSurfaceAudio.pause();
        magicalSurfaceAudio = null;
      }
      if (magicalSurfaceFadeInterval) {
        clearInterval(magicalSurfaceFadeInterval);
        magicalSurfaceFadeInterval = null;
      }
    }
  });
  toggleStatsButton.addEventListener('click', () => {
    statsVisible = !statsVisible;
    if (statsVisible) {
      toggleStatsButton.textContent = "Hide Stats";
      statsDisplay.style.display = "block";
      updateStatsDisplay();
    } else {
      toggleStatsButton.textContent = "Show Stats";
      statsDisplay.style.display = "none";
    }
  });

  // === INITIALIZATION ===
  generateWords();
  schedulePurpleWave();
  setInterval(updateBackgroundBasedOnSpeed, 100);
});
