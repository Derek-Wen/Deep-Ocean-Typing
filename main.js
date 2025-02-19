document.addEventListener('DOMContentLoaded', () => {
  const wordContainer = document.getElementById('word-container');
  const statsDisplay = document.getElementById('stats-display');
  const toggleStatsButton = document.getElementById('toggle-stats');
  const toggleSoundButton = document.getElementById('toggle-sound');
  const keystrokeTimestamps = [];
  let typingTimer;
  let aboveThresholdTime = 0; // Accumulated time above 80 wpm (in ms, clamped 0–10000)
  let lastBackgroundUpdateTime = Date.now();

  // Globals for persistent particles
  let persistentParticles = [];
  const maxPersistentParticles = 150;

  // --- Audio Setup ---
  // Background audio (looping)
  const bgAudio = new Audio('assets/underwater_bg.mp3');
  bgAudio.loop = true;
  let soundOn = false;

  // Magical surface audio (for background changes)
  let magicalSurfaceAudio = null;
  let magicalSurfaceFadeInterval = null;

  // Toggle sound event listener for background audio (and all sounds)
  toggleSoundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    if (soundOn) {
      bgAudio.play();
      toggleSoundButton.textContent = "Mute Sound";
    } else {
      bgAudio.pause();
      toggleSoundButton.textContent = "Play Sound";
      // Immediately stop magical_surface audio if playing.
      if (magicalSurfaceAudio) {
        magicalSurfaceAudio.pause();
        magicalSurfaceAudio = null;
        if (magicalSurfaceFadeInterval) {
          clearInterval(magicalSurfaceFadeInterval);
          magicalSurfaceFadeInterval = null;
        }
      }
    }
  });

  // Function to play the ripple sound effect
  function playRippleSound() {
    if (!soundOn) return;
    const rippleAudio = new Audio('assets/underwater_movement.wav');
    rippleAudio.play();
  }

  // Function to play the keyboard typing sound (for non-deleting keys) at lower volume.
  function playKeyboardSound() {
    if (!soundOn) return;
    const keyboardAudio = new Audio('assets/keyboard_type.wav');
    keyboardAudio.volume = 0.3; // Lower volume
    keyboardAudio.play();
  }

  // Function to play the keyboard deletion sound (for Backspace)
  function playKeyboardDeleteSound() {
    if (!soundOn) return;
    const deleteAudio = new Audio('assets/keyboard_type_2.wav');
    deleteAudio.play();
  }

  // Function to play the particles sound effect using particles_2.mp3.
  function playParticleSound() {
    if (!soundOn) return;
    const particleAudio = new Audio('assets/particles_2.mp3');
    particleAudio.play();
  }

  // --- Background Change Audio ---
  // When the background starts to change, we start playing magical_surface in loop.
  // When factor becomes 0, we gradually fade it out.
  function updateMagicalSurfaceAudio(factor) {
    if (!soundOn) return;
    if (factor > 0) {
      if (!magicalSurfaceAudio) {
        magicalSurfaceAudio = new Audio('assets/magical_surface.wav');
        magicalSurfaceAudio.loop = true;
        magicalSurfaceAudio.volume = 1;
        magicalSurfaceAudio.play();
      }
      // Optionally adjust volume based on factor.
    } else {
      if (magicalSurfaceAudio && !magicalSurfaceFadeInterval) {
        // Fade out magicalSurfaceAudio over ~2 seconds
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

  // --- Stats Variables ---
  let totalTypedLetters = 0;
  let totalCorrectLetters = 0;
  let currentWpm = 0;
  let statsVisible = false;

  // Simplified, easy & fun word bank
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
    const finalScale = Math.random() * 80 + 20;
    ripple.style.setProperty('--final-scale', finalScale);
    document.body.appendChild(ripple);
    
    // Play the ripple sound effect
    playRippleSound();
    
    setTimeout(() => { ripple.remove(); }, 800);
  }

  // Trigger the particle effect every 5 words.
  function triggerParticles() {
    // Play particle sound effect using particles_2.mp3.
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
    currentWpm = Math.round(wpm);
  
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
  
    // Update the magical_surface audio based on factor.
    updateMagicalSurfaceAudio(factor);
  
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
  
    // Update stats display if visible
    if (statsVisible) {
      updateStatsDisplay();
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
    
    // Update stats based on completed word.
    let wordTotal = letterSpans.length;
    let wordCorrect = 0;
    letterSpans.forEach(span => {
      if (span.classList.contains('correct')) {
        wordCorrect++;
      }
    });
    totalTypedLetters += wordTotal;
    totalCorrectLetters += wordCorrect;
    
    // Trigger extra effects: ripple and particles.
    triggerRipple();
    if (currentWordIndex > 0 && currentWordIndex % 5 === 0) {
      triggerParticles();
    }
    continueMoveToNextWord();
  }

  // --- Bubble Trail Effect at Bottom of Screen ---
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

  // Update the stats display element.
  function updateStatsDisplay() {
    let accuracy = totalTypedLetters > 0 
      ? Math.round((totalCorrectLetters / totalTypedLetters) * 100)
      : 100;
    statsDisplay.textContent = `Accuracy: ${accuracy}% | WPM: ${currentWpm}`;
  }

  // Toggle button event listener for stats display.
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

  // --- Purple Wave Effect ---
  // This function creates a luminescent purple wave that sweeps through the screen
  // and plays the "magical_disorder" audio.
  function triggerPurpleWave() {
    const wave = document.createElement('div');
    // Inline styles for the purple wave effect
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
    // Start the animation after a brief delay
    setTimeout(() => {
      wave.style.transform = 'translateX(200%)';
      wave.style.opacity = '0';
    }, 100);
    // Remove the element after the animation
    setTimeout(() => { wave.remove(); }, 5100);
    // Play the magical_disorder audio
    if (soundOn) {
      const disorderAudio = new Audio('assets/magical_disorder.wav');
      disorderAudio.play();
    }
  }

  // Schedule the purple wave to trigger at a random interval (0 to 20 seconds)
  function schedulePurpleWave() {
    const delay = Math.random() * 20000;
    setTimeout(() => {
      triggerPurpleWave();
      schedulePurpleWave();
    }, delay);
  }

  // Start scheduling the purple wave effect
  schedulePurpleWave();

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
      // Play deletion sound effect for Backspace.
      playKeyboardDeleteSound();
      currentInput = currentInput.slice(0, -1);
      updateCurrentWordDisplay();
      userIsTyping();
      keystrokeTimestamps.push(Date.now());
      updateBackgroundBasedOnSpeed();
      return;
    }
    // For non-deleting keystrokes, play typing sound.
    playKeyboardSound();
    
    currentInput += e.key;
    updateCurrentWordDisplay();
    userIsTyping();
    keystrokeTimestamps.push(Date.now());
    updateBackgroundBasedOnSpeed();
    
    // Add bubble trail effect on each keystroke.
    addBubbleTrail(e);
  });

  // Continuously update the background even if no keystroke occurs.
  setInterval(updateBackgroundBasedOnSpeed, 100);
});
