            /* --- CONFIGURATION --- */
            const CFG = {
                fftSize: 4096, // High resolution for detailed waveform
                smoothing: 0.8,
                waveSpeed: 5, // Pixels per frame
                bars: 120,
                particleCount: 60
            };

            const PALETTES = {
                electronic: { h: 290, s: 100, l: 60 },
                techno:     { h: 120, s: 100, l: 50 },
                rock:       { h: 355, s: 90,  l: 50 },
                metal:      { h: 0,   s: 0,   l: 40 },
                pop:        { h: 195, s: 90,  l: 60 },
                jazz:       { h: 45,  s: 80,  l: 55 },
                blues:      { h: 230, s: 70,  l: 55 },
                ambient:    { h: 170, s: 60,  l: 50 },
                hiphop:     { h: 270, s: 90,  l: 60 },
                reggae:     { h: 90,  s: 85,  l: 50 },
                latin:      { h: 15,  s: 100, l: 55 },
                classical:  { h: 210, s: 20,  l: 85 },
                folk:       { h: 35,  s: 60,  l: 45 },
                chanson:    { h: 25,  s: 60,  l: 65 },
                rnb:        { h: 320, s: 80,  l: 60 },
                default:    { h: 220, s: 80,  l: 60 }
            };

            const WEATHER = {
                clear:  { hOff: 0,   sMult: 1.1, lMult: 1.0 },
                rain:   { hOff: 15,  sMult: 0.6, lMult: 0.8 },
                storm:  { hOff: -20, sMult: 0.8, lMult: 0.7 },
                snow:   { hOff: 5,   sMult: 0.4, lMult: 1.2 },
                cloudy: { hOff: 0,   sMult: 0.5, lMult: 0.9 }
            };

            /* --- STATE --- */
            const state = {
                isPlaying: false,
                isPaused: false,
                mode: 'analyzer', // 'analyzer' | 'waveform'
                uiVisible: true,
                weather: 'clear',
                genre: 'default',
                energy: 0,
                zcr: 0, 
                volumeScalar: 1.0,
                radioActive: false
            };

            /* --- REFERENCES --- */
            const audio = document.getElementById('audio-element');
            let actx, analyser, srcNode;
            let dataArray, timeDataArray, bufferLen;

            const cvsBg = document.getElementById('bg-canvas');
            const ctxBg = cvsBg.getContext('2d');
            const cvsMain = document.getElementById('main-canvas');
            const ctxMain = cvsMain.getContext("2d", {
                desynchronized: true
            });
            
            // Waveform Scroll Canvas
            let cvsWave = document.createElement('canvas');
            const ctxWave = cvsWave.getContext("2d", {
                desynchronized: true
            });

            /* --- INIT --- */
            function init() {
                resize();
                window.addEventListener('resize', resize);
                
                ['keydown', 'mousedown', 'touchstart'].forEach(evt => 
                    window.addEventListener(evt, () => {
                        if(!state.uiVisible) toggleUI();
                    })
                );

                getWeather();
                animate();
            }

            function resize() {
                [cvsBg, cvsMain, cvsWave].forEach(c => {
                    c.width = window.innerWidth;
                    c.height = window.innerHeight;
                });
                ctxWave.clearRect(0, 0, cvsWave.width, cvsWave.height);
            }

            /* --- UI --- */
            function toggleUI() {
                state.uiVisible = !state.uiVisible;
                const ui = document.getElementById('ui-layer');
                const hint = document.getElementById('restore-hint');
                if(state.uiVisible) {
                    ui.classList.remove('ui-hidden');
                    hint.style.opacity = '0';
                } else {
                    ui.classList.add('ui-hidden');
                    hint.style.opacity = '1';
                }
            }

            function toggleMode() {
                state.mode = state.mode === 'analyzer' ? 'waveform' : 'analyzer';
                document.getElementById('mode-icon').innerText = state.mode === 'analyzer' ? 'equalizer' : 'graphic_eq';
                ctxBg.clearRect(0, 0, cvsBg.width, cvsBg.height);
            }

            function toggleRadioInput() {
                const container = document.getElementById('control-bar');
                container.classList.toggle('radio-active');
                state.radioActive = container.classList.contains('radio-active');
                if(state.radioActive) setTimeout(() => document.getElementById('stream-url').focus(), 100);
            }

            function checkRadioEnter(e) {
                if(e.key === 'Enter') playStream();
            }

            /* --- AUDIO --- */
            function initAudioCtx() {
                if(!actx) {
                    actx = new (window.AudioContext || window.webkitAudioContext)();
                    analyser = actx.createAnalyser();
                    analyser.fftSize = CFG.fftSize; 
                    analyser.smoothingTimeConstant = CFG.smoothing;
                    
                    bufferLen = analyser.frequencyBinCount;
                    dataArray = new Uint8Array(bufferLen); 
                    timeDataArray = new Uint8Array(bufferLen); 

                    srcNode = actx.createMediaElementSource(audio);
                    srcNode.connect(analyser);
                    analyser.connect(actx.destination);
                    
                    state.volumeScalar = 1.2; 
                }
                if(actx.state === 'suspended') actx.resume();
            }

            function handleFile(file) {
                if(!file) return;
                initAudioCtx();
                audio.src = URL.createObjectURL(file);
                document.getElementById('genre-text').innerText = "ФАЙЛ ЗАГРУЖЕН";
                playAudio();
            }

            function playStream() {
                const url = document.getElementById('stream-url').value;
                if(!url) return;
                initAudioCtx();
                audio.src = url;
                audio.crossOrigin = "anonymous"; 
                document.getElementById('genre-text').innerText = "ПОДКЛЮЧЕНИЕ...";
                playAudio();
                toggleRadioInput();
            }

            function playAudio() {
                audio.play().then(() => {
                    state.isPlaying = true;
                    state.isPaused = false;
                    updatePlayIcon();
                }).catch(e => {
                    console.error(e);
                    document.getElementById('genre-text').innerText = "ОШИБКА / CORS";
                });
            }

            function togglePlay() {
                initAudioCtx();
                if(state.isPlaying) {
                    audio.pause();
                    state.isPlaying = false;
                    state.isPaused = true;
                } else {
                    if(audio.src) playAudio();
                }
                updatePlayIcon();
            }

            function updatePlayIcon() {
                document.getElementById('play-icon').innerText = state.isPlaying ? 'pause' : 'play_arrow';
            }

            /* --- ANALYSIS --- */
            async function getWeather() {
                try {
                    let latitude = null;
                    let longitude = null;
                    let city = null;

                    // ========= 1. GEOLOCATION API (самое точное) =========
                    try {
                        const pos = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 5000,
                                maximumAge: 5000
                            });
                        });

                        latitude = pos.coords.latitude;
                        longitude = pos.coords.longitude;
                        city = "LOCAL";

                        console.log("Geo from device:", latitude, longitude);

                    } catch (e) {
                        console.warn("Device geolocation failed → trying ipapi…", e);
                    }


                    // ========= 2. IP API (fallback) =========
                    if (latitude === null || longitude === null) {
                        try {
                            const geo = await (await fetch("https://ipapi.is/json/", { mode: "cors" })).json();

                            latitude = geo.latitude;
                            longitude = geo.longitude;
                            city = geo.city || "LOCAL";

                            console.log("Geo from IP:", latitude, longitude, city);

                        } catch (e) {
                            console.warn("IP geo failed → final fallback.", e);
                        }
                    }


                    // ========= 3. Если ничего не удалось =========
                    if (latitude === null || longitude === null) {
                        document.getElementById('geo-text').innerText = "ОФФЛАЙН";
                        state.weather = "clear";
                        return;
                    }

                    // Показ города в UI
                    document.getElementById('geo-text').innerText =
                        (city || 'LOCAL').toUpperCase();


                    // ========= 4. ПОГОДА =========
                    const w = await (await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
                        { mode: "cors" }
                    )).json();

                    const c = w.current_weather.weathercode;

                    if(c <= 3) state.weather = 'clear';
                    else if(c >= 95) state.weather = 'storm';
                    else if(c >= 71) state.weather = 'snow';
                    else if(c >= 51) state.weather = 'rain';
                    else state.weather = 'cloudy';

                } catch (e) {
                    console.warn("Weather failed:", e);
                    document.getElementById('geo-text').innerText = "ОФФЛАЙН";
                    state.weather = "clear";
                }
            }

            let lastGenreCheck = 0;
            function detectGenre(bass, mid, high, energy, zcr) {
                let g = 'default';
                const total = bass + mid + high + 1;
                const bR = bass / total;
                const mR = mid / total;
                const hR = high / total;

                // Expanded logic for better Chanson/Rock/Jazz/Pop separation
                if (zcr > 0.12 && energy > 180) g = 'metal';
                else if (bass > 180 && high > 140) g = 'techno';
                else if (bass > 160 && high > 120 && mR < 0.25) g = 'electronic';
                else if (bass > 170 && mid < 100 && hR > 0.3) g = 'hiphop';
                else if (hR > 0.4 && energy > 100 && energy < 160) g = 'jazz';
                else if (mR > 0.4 && energy < 140 && zcr < 0.05 && bR < 0.3) g = 'chanson'; // Vocal heavy, less bass
                else if (mR > 0.35 && bR > 0.3 && energy > 150) g = 'rock';
                else if (bR > 0.4 && mR > 0.25 && energy < 160) g = 'reggae';
                else if (energy < 60 && zcr < 0.03) g = 'ambient';
                else if (energy > 120 && mR > 0.45) g = 'folk';
                else if (energy < 120 && hR > 0.35 && bR < 0.15) g = 'classical';
                else if (bass > 140 && mid > 120 && hR > 0.2) g = 'latin';
                else if (energy > 180 && mR > 0.3) g = 'pop'; 
                else if (energy > 100) g = 'pop'; 
                else g = 'default';

                state.genre = g;
                const names = {
                    electronic:'ЭЛЕКТРО', techno:'ТЕХНО', rock:'РОК', metal:'МЕТАЛ',
                    pop:'ПОП', jazz:'ДЖАЗ', blues:'БЛЮЗ', ambient:'ЭМБИЕНТ',
                    hiphop:'ХИП-ХОП', reggae:'РЕГГИ', latin:'ЛАТИНО', classical:'КЛАССИКА',
                    folk:'ФОЛК', chanson:'ШАНСОН', rnb:'R&B', default:'НАРОДНАЯ'
                };
                document.getElementById('genre-text').innerText = names[g] || 'МУЗЫКА';
            }

            /* --- ANIMATION --- */
            function animate() {
                requestAnimationFrame(animate);

                if(analyser) {
                    if(state.isPlaying) {
                        analyser.getByteFrequencyData(dataArray);
                        analyser.getByteTimeDomainData(timeDataArray);
                    } else {
                        for(let i=0; i<bufferLen; i++) {
                            dataArray[i] = Math.max(0, dataArray[i] * 0.94);
                            timeDataArray[i] = 128;
                        }
                    }
                    
                    let b=0, m=0, h=0, max=0;
                    for(let i=0; i<bufferLen; i++) {
                        const v = dataArray[i];
                        if(v > max) max = v;
                        if(i<20) b+=v; else if(i<200) m+=v; else h+=v;
                    }

                    let crosses = 0;
                    for(let i=1; i<bufferLen; i++) {
                        if((timeDataArray[i-1]-128)*(timeDataArray[i]-128) < 0) crosses++;
                    }
                    state.zcr = crosses/bufferLen;
                    
                    if(state.isPlaying) {
                        const target = max > 0 ? 230/max : 1.5;
                        state.volumeScalar += (target - state.volumeScalar) * 0.05;
                    }
                    state.energy = (b/20) * state.volumeScalar;

                    if(state.isPlaying && Date.now() - lastGenreCheck > 1500) {
                        detectGenre(b/20, m/180, h/(bufferLen-200), state.energy, state.zcr);
                        lastGenreCheck = Date.now();
                    }
                }

                ctxBg.fillStyle = state.weather === 'storm' ? '#08080a' : '#020203';
                ctxBg.fillRect(0, 0, cvsBg.width, cvsBg.height);
                if(state.weather === 'clear') drawSunRays(ctxBg);

                ctxMain.clearRect(0, 0, cvsMain.width, cvsMain.height);

                drawParticles(); 

                if(state.mode === 'analyzer') {
                    drawBars(); 
                } else {
                    drawHighResWaveform(); 
                }

                if(state.weather === 'storm' && state.energy > 220 && Math.random() > 0.97) {
                    ctxMain.fillStyle = 'rgba(255,255,255,0.1)';
                    ctxMain.fillRect(0,0,cvsMain.width,cvsMain.height);
                }
            }

            /* --- DRAWING --- */
            function getColor(rawVal, alpha = 1) {
                const p = PALETTES[state.genre];
                const w = WEATHER[state.weather];
                const val = Math.min(255, rawVal * state.volumeScalar);
                
                const hue = (p.h + w.hOff + (val/5)) % 360;
                const sat = Math.min(100, p.s * w.sMult);
                const light = Math.min(100, p.l * w.lMult + (val/8));
                
                if (state.genre === 'metal') {
                    const g = Math.min(255, val + 40);
                    return `rgba(${g}, ${g*0.1}, ${g*0.1}, ${alpha})`;
                }
                return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
            }

            // MODE 1
            function drawBars() {
                if(!dataArray) return;
                const count = CFG.bars;
                const gap = 4;
                const w = (cvsMain.width / count) - gap;
                for(let i=0; i<count; i++) {
                    const idx = Math.floor(Math.pow(i/count, 1.5) * (bufferLen*0.6));
                    const raw = dataArray[idx];
                    const val = Math.min(255, raw * state.volumeScalar);
                    const h = (val / 255) * (cvsMain.height * 0.85);
                    const x = i * (w + gap) + gap/2;
                    const y = cvsMain.height - h;
                    ctxMain.fillStyle = getColor(raw);
                    if(state.energy > 180) {
                        ctxMain.shadowBlur = 15;
                        ctxMain.shadowColor = ctxMain.fillStyle;
                    }
                    ctxMain.beginPath();
                    ctxMain.roundRect(x, y, w, h + 20, [4,4,0,0]);
                    ctxMain.fill();
                    ctxMain.shadowBlur = 0;
                }
            }

            // MODE 2: High-Res Sliced Waveform
            function drawHighResWaveform() {
                if(!timeDataArray) return;
                
                const speed = CFG.waveSpeed; // e.g. 4 pixels per frame
                // Shift history
                ctxWave.globalCompositeOperation = 'copy';
                ctxWave.drawImage(cvsWave, -speed, 0);
                ctxWave.globalCompositeOperation = 'source-over';
                
                // We have 'speed' pixels to fill with new data.
                // We have bufferLen samples (e.g. 4096)
                // Divide buffer into 'speed' chunks to get min/max for each pixel column.
                
                const startX = cvsWave.width - speed;
                const chunkSize = Math.floor(bufferLen / speed); // e.g. 1024 samples per pixel
                const cy = cvsWave.height / 2;
                
                // Clear new strip
                ctxWave.clearRect(startX, 0, speed, cvsWave.height);
                
                for(let i = 0; i < speed; i++) {
                    let min = 128, max = 128;
                    let sumSq = 0;
                    
                    const offset = i * chunkSize;
                    // Scan sector
                    for(let j = 0; j < chunkSize; j++) {
                        // Safety check
                        if (offset + j >= bufferLen) break;
                        
                        const val = timeDataArray[offset + j];
                        if(val < min) min = val;
                        if(val > max) max = val;
                        
                        // RMS calc
                        const d = val - 128;
                        sumSq += d*d;
                    }
                    
                    // Calculate RMS for core
                    const rms = Math.sqrt(sumSq / chunkSize);
                    
                    // Draw this 1px column
                    const drawX = startX + i;
                    
                    // 1. Draw "Haze" (Max Peak - Min Peak) - lighter, transparent
                    // Limit height to 60% of screen to avoid blockiness
                    const peakHeight = Math.min(cvsWave.height * 0.6, (max - min) * 2 * state.volumeScalar);
                    
                    if (peakHeight > 2) {
                        ctxWave.fillStyle = getColor(peakHeight * 2, 0.3); // Transparent
                        const top = cy - (peakHeight / 2);
                        ctxWave.fillRect(drawX, top, 1, peakHeight);
                        
                        // 2. Draw "Core" (RMS) - solid, darker
                        const coreHeight = Math.min(peakHeight, rms * 4 * state.volumeScalar);
                        if (coreHeight > 1) {
                            ctxWave.fillStyle = getColor(peakHeight * 2, 1.0); // Solid
                            const coreTop = cy - (coreHeight / 2);
                            ctxWave.fillRect(drawX, coreTop, 1, coreHeight);
                        }
                    } else {
                        // Silence
                        ctxWave.fillStyle = 'rgba(255,255,255,0.05)';
                        ctxWave.fillRect(drawX, cy, 1, 1);
                    }
                }
                
                // Render to Main ON TOP of particles
                ctxMain.drawImage(cvsWave, 0, 0);
            }

            /* --- PARTICLES --- */
            const particles = Array.from({length: CFG.particleCount}, () => ({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                z: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.2,
                offset: Math.random() * 100
            }));

            function drawParticles() {
                const beat = 1 + (state.energy / 80);
                ctxMain.beginPath();
                
                particles.forEach(p => {
                    if(state.weather === 'rain' || state.weather === 'storm') {
                        p.y += (15 * p.speed) * beat;
                        p.x -= 1;
                    } else if(state.weather === 'snow') {
                        p.y += (2 * p.speed) * (beat * 0.5);
                        p.x += Math.sin((p.y + p.offset)/50);
                    } else {
                        p.y -= 0.8 * p.speed;
                        p.x += Math.sin((p.y + p.offset)/100) * 0.2;
                    }
                    
                    if (p.y > cvsMain.height + 10) { p.y = -10; p.x = Math.random() * cvsMain.width; }
                    else if (p.y < -10) { p.y = cvsMain.height + 10; p.x = Math.random() * cvsMain.width; }
                    if (p.x < -10) p.x = cvsMain.width + 10;
                    if (p.x > cvsMain.width + 10) p.x = -10;

                    if(state.weather === 'rain' || state.weather === 'storm') {
                        ctxMain.moveTo(p.x, p.y);
                        ctxMain.lineTo(p.x - 1, p.y + 12);
                    } else {
                        ctxMain.moveTo(p.x, p.y);
                        ctxMain.arc(p.x, p.y, p.z, 0, Math.PI * 2);
                    }
                });

                if(state.weather === 'rain' || state.weather === 'storm') {
                    ctxMain.strokeStyle = 'rgba(200, 220, 255, 0.4)';
                    ctxMain.stroke();
                } else {
                    ctxMain.fillStyle = state.weather === 'snow' ? 'rgba(255,255,255,0.7)' : getColor(100, 0.6);
                    ctxMain.fill();
                }
            }

            function drawSunRays(ctx) {
                const cx = ctx.canvas.width/2;
                const t = Date.now()/5000;
                ctx.save();
                ctx.translate(cx, -100);
                ctx.rotate(Math.sin(t)*0.2);
                const grad = ctx.createRadialGradient(0,0,0,0,0,ctx.canvas.height*1.5);
                const p = PALETTES[state.genre];
                grad.addColorStop(0, `hsla(${p.h}, 80%, 60%, 0.1)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.arc(0,0,ctx.canvas.height*2, Math.PI*0.3, Math.PI*0.7);
                ctx.fill();
                ctx.restore();
            }

            init();