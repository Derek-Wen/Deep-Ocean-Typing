document.addEventListener('DOMContentLoaded', () => {
  const wordContainer = document.getElementById('word-container');
  const keystrokeTimestamps = [];
  let typingTimer;
  let aboveThresholdTime = 0; // Accumulated time above 80 wpm (in ms, clamped 0–10000)
  let lastBackgroundUpdateTime = Date.now();

  // Globals for persistent particles
  let persistentParticles = [];
  const maxPersistentParticles = 150;

  // Simplified, easy & fun word bank
  const wordPool = [
    // Easy and fun words (80%)
    "emily <3", "cat", "dog", "sun", "star", "moon", "sky", "sea", "wave", "coral", "fish",
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
  let currentInput = "";
  let scheduledTimeout = null;

  function getRandomWord() {
    return wordPool[Math.floor(Math.random() * wordPool.length)];
  }

  function generateWords(count = 30) {
    for (let i = 0; i < count; i++) {
      const word = getRandomWord();
      words.push(word);
      const wordSpan = document.createElement('span');
      wordSpan.classList.add('word');
      if (words.length - 1 === currentWordIndex) {
        wordSpan.classList.add('current');
      }
      for (let char of word) {
        const charSpan = document.createElement('span');
        charSpan.classList.add('letter');
        charSpan.textContent = char;
        wordSpan.appendChild(charSpan);
      }
      wordContainer.appendChild(wordSpan);
    }
  }

  // Trigger the ripple effect behind the textbox every 10 words.
  function triggerRipple() {
    if (currentWordIndex % 10 !== 0) return;
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    const rect = wordContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    ripple.style.left = `${centerX}px`;
    ripple.style.top = `${centerY}px`;
    const finalScale = Math.random() * 60 + 20;
    ripple.style.setProperty('--final-scale', finalScale);
    document.body.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 800);
  }

  // Trigger the particle effect every 5 words.
  function triggerParticles() {
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
      setTimeout(() => { particle.remove(); }, 5000);
    }
  }

  // Add a persistent light blue particle.
  function addPersistentParticle() {
    const particle = document.createElement('div');
    particle.classList.add('persistent-particle');
    const randomX = Math.random() * window.innerWidth;
    const randomY = Math.random() * window.innerHeight;
    particle.style.left = `${randomX}px`;
    particle.style.top = `${randomY}px`;
    particle.style.opacity = 0;
    document.body.appendChild(particle);
    // Fade in
    setTimeout(() => { particle.style.opacity = 1; }, 50);
    persistentParticles.push(particle);
  }

  // Remove all persistent particles (fade them out then remove).
  function removePersistentParticles() {
    persistentParticles.forEach(particle => {
      particle.style.opacity = 0;
      setTimeout(() => {
        if (particle.parentElement) {
          particle.parentElement.removeChild(particle);
        }
      }, 500);
    });
    persistentParticles = [];
  }

  // Signal that the user is typing.
  function userIsTyping() {
    wordContainer.classList.add("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      wordContainer.classList.remove("typing");
    }, 500);
  }

  // Update the background based on typing speed.
  function updateBackgroundBasedOnSpeed() {
    const now = Date.now();
    const deltaTime = now - lastBackgroundUpdateTime;
    lastBackgroundUpdateTime = now;
  
    const windowTime = 10000;
    while (keystrokeTimestamps.length && now - keystrokeTimestamps[0] > windowTime) {
      keystrokeTimestamps.shift();
    }
    const count = keystrokeTimestamps.length;
    let effectiveTime = windowTime;
    if (count > 0) {
      effectiveTime = now - keystrokeTimestamps[0];
      if (effectiveTime < 1000) effectiveTime = 1000;
    }
    const wpm = (count / 5) * (60000 / effectiveTime);
  
    if (wpm >= 80) {
      aboveThresholdTime = Math.min(10000, aboveThresholdTime + deltaTime);
    } else {
      aboveThresholdTime = Math.max(0, aboveThresholdTime - deltaTime);
    }
    const factor = aboveThresholdTime / 10000;
  
    // Updated interpolation: base now starts at black (0,0,0)
    const newR = Math.round((1 - factor) * 0 + factor * 110);
    const newG = Math.round((1 - factor) * 0 + factor * 156);
    const newB = Math.round((1 - factor) * 0 + factor * 255);
    document.body.style.background = `linear-gradient(135deg, #000000, rgba(${newR},${newG},${newB},0.81))`;
  
    // Persistent particles: add until the count reaches factor * maxPersistentParticles.
    if (wpm >= 80) {
      const targetCount = Math.round(factor * maxPersistentParticles);
      while (persistentParticles.length < targetCount) {
        addPersistentParticle();
      }
    } else {
      if (persistentParticles.length > 0) {
        removePersistentParticles();
      }
    }
  }
  

  // Update the display of the current word.
  function updateCurrentWordDisplay() {
    const currentWord = words[currentWordIndex];
    const currentWordSpan = wordContainer.children[currentWordIndex];
    const letterSpans = currentWordSpan.querySelectorAll('.letter');
    letterSpans.forEach(span => {
      span.classList.remove('correct', 'incorrect');
    });
    for (let i = 0; i < currentInput.length; i++) {
      if (i < currentWord.length) {
        if (currentInput[i] === currentWord[i]) {
          letterSpans[i].classList.add('correct');
        } else {
          letterSpans[i].classList.add('incorrect');
        }
      }
    }
    if (currentInput.length === currentWord.length && scheduledTimeout === null) {
      scheduledTimeout = setTimeout(() => {
        moveToNextWord();
        scheduledTimeout = null;
      }, 100);
    }
  }

  // Helper function to continue moving to the next word.
  function continueMoveToNextWord() {
    const currentWordSpan = wordContainer.children[currentWordIndex];
    currentWordSpan.classList.remove('current');
    currentWordSpan.classList.add('completed');
    currentWordIndex++;
    currentInput = "";
    if (currentWordIndex < wordContainer.children.length) {
      wordContainer.children[currentWordIndex].classList.add('current');
    }
    if (currentWordIndex > 10) {
      const wordsToRemove = 5;
      for (let i = 0; i < wordsToRemove; i++) {
        wordContainer.removeChild(wordContainer.firstChild);
      }
      words.splice(0, wordsToRemove);
      currentWordIndex -= wordsToRemove;
    }
    if (currentWordIndex > words.length - 10) {
      generateWords(20);
    }
  }

  // Move to the next word and trigger reward animations.
  function moveToNextWord() {
    const currentWordSpan = wordContainer.children[currentWordIndex];
    const letterSpans = currentWordSpan.querySelectorAll('.letter');
    let fullyCorrect = true;
    letterSpans.forEach(span => {
      if (!span.classList.contains('correct')) {
        fullyCorrect = false;
      }
    });
    // If word is fully correct, you could add extra effects here if desired.
    triggerRipple();
    if (currentWordIndex > 0 && currentWordIndex % 5 === 0) {
      triggerParticles();
    }
    continueMoveToNextWord();
  }

  // --- New: Bubble Trail Effect at Bottom of Screen ---
  function addBubbleTrail(e) {
    // Skip for Backspace
    if (e.key === 'Backspace') return;
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    // Position bubble at a random x-coordinate at the bottom of the screen
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight - 10;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    // Randomize bubble size (8px to 16px)
    const size = Math.random() * 8 + 8;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    // Randomize animation duration between 2 and 4 seconds
    const duration = Math.random() * 2 + 2;
    bubble.style.animationDuration = `${duration}s`;
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), duration * 1000);
  }
  // --- End Bubble Trail Effect ---

  // Initial word generation.
  generateWords();

  // Listen for global keystrokes.
  document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1 && e.key !== 'Backspace') return;
    if (e.key === ' ') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Backspace') {
      currentInput = currentInput.slice(0, -1);
      updateCurrentWordDisplay();
      userIsTyping();
      keystrokeTimestamps.push(Date.now());
      updateBackgroundBasedOnSpeed();
      return;
    }
    currentInput += e.key;
    updateCurrentWordDisplay();
    userIsTyping();
    keystrokeTimestamps.push(Date.now());
    updateBackgroundBasedOnSpeed();
    
    // Add bubble trail effect on each keystroke (bubbles appear at the bottom of the screen)
    addBubbleTrail(e);
  });

  // Continuously update the background even if no keystroke occurs.
  setInterval(updateBackgroundBasedOnSpeed, 100);
});

