window.onload = () => {
  console.log('Loaded global Fireworks object:', Fireworks);
  document.body.style.background = "url('bg/nightSky1.jpg') no-repeat center center fixed";
  document.body.style.backgroundSize = "cover";

  // Load sounds
  const lowSound = new Audio('music/fireworkshort.mp3');
  const midSound1 = new Audio('music/fireworkshort1.mp3');
  const midSound2 = new Audio('music/fireworkshort2.mp3');

  // Background music
  const bgMusic = new Audio('music/happy.mp3');
  bgMusic.loop = true;
 // bgMusic.volume = 0.5;
  bgMusic.volume = 0.2; // 🎵 Lower background music volume


  function playSnippet(audio) {
    if (!gameStarted || gameOver || audio.readyState < 2) return;

    const maxStart = Math.max(0, audio.duration - 0.3);
    const start = Math.random() * maxStart;
    const duration = 0.7 + Math.random() * 0.8;

    audio.pause();
    audio.currentTime = start;
    audio.play().catch(() => {});
    setTimeout(() => audio.pause(), duration * 1000);
  }

  const launchLevels = [
    { speed: 32.0, amount: 12, sound: midSound2 },
    { speed: 24.0, amount: 8,  sound: midSound1 },
    { speed: 10.0, amount: 4,  sound: midSound1 },
    { speed: 3.0,  amount: 3,  sound: lowSound }
  ];

  let FW = Fireworks?.Fireworks || Fireworks?.default || Fireworks;
  if (typeof FW !== 'function') {
    console.error('Available Fireworks props:', Object.keys(Fireworks || {}));
    throw new Error('❌ Fireworks constructor not found');
  }

  const container = document.getElementById('fireworks-container');
  const overlay = document.getElementById('overlay');
  const ctx = overlay.getContext('2d');
  overlay.width = window.innerWidth;
  overlay.height = window.innerHeight;

  const fireworks = new FW(container, {
    trace: 3,
    explosion: 5,
    autoresize: true,
    colors: ['#ff5f5f', '#00ffe1', '#ffe100', '#ff00ff']
  });

  window.addEventListener('resize', () => {
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
  });

  const pose = new Pose({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.4/${f}`
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });
  pose.onResults(onResults);

  let cam, video;
  let gameStarted = false;
  let gameOver = false;

  document.getElementById('startGameBtn').addEventListener('click', () => {
    document.getElementById('introScreen').style.display = 'none';
    startTime = performance.now();
    gameStarted = true;
    bgMusic.play().catch(() => {});

    video = document.createElement('video');
    cam = new Camera(video, {
      onFrame: async () => {
        if (gameStarted && !gameOver) await pose.send({ image: video });
      },
      width: 640,
      height: 480
    });
    cam.start();
  });

  const timerEl = document.getElementById('timer');
  const scoreEl = document.getElementById('score');
  const toggleProt = document.getElementById('toggleProt');
  let startTime = performance.now();
  let score = 0;

  let prevT = null, prevLeftX = null, prevRightX = null, prevLeftY = null, prevRightY = null;

  function onResults(res) {
    const elapsed = (performance.now() - startTime) / 1000;

    if (elapsed >= 120 && !gameOver) {
      gameOver = true;
      cam.stop();
      bgMusic.pause();
      timerEl.textContent = "2:00 – Game Over!";
      alert(`🎉 Time's up! Your final score: ${score}`);
      return;
    }

    timerEl.textContent = elapsed.toFixed(1);
    scoreEl.textContent = score;

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!res.poseLandmarks) return;

    if (toggleProt.checked) {
      ctx.fillStyle = 'lime';
      res.poseLandmarks.forEach(lm => {
        ctx.beginPath();
        ctx.arc(lm.x * overlay.width, lm.y * overlay.height, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const now = performance.now();
    const lw = res.poseLandmarks[15], rw = res.poseLandmarks[16];
    const lx = lw.x, ly = lw.y;
    const rx = rw.x, ry = rw.y;

    if (prevLeftX != null && prevRightX != null && prevT != null) {
      const dt = (now - prevT) / 1000;
      const lv = Math.hypot(lx - prevLeftX, ly - prevLeftY) / dt;
      const rv = Math.hypot(rx - prevRightX, ry - prevRightY) / dt;

      let launched = 0;
      const speed = Math.min(lv, rv);

      for (const lvl of launchLevels) {
        if (speed > lvl.speed) {
          fireworks.launch(lvl.amount);
          playSnippet(lvl.sound);
          launched = lvl.amount;
          break;
        }
      }

      if (launched > 0) {
        score += launched;
        scoreEl.textContent = score;
      }
    }

    prevLeftX = lx; prevLeftY = ly;
    prevRightX = rx; prevRightY = ry;
    prevT = now;
  }
};
