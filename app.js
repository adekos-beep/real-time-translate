// === Application State ===
const AppState = {
    recording: false,
    audioContext: null,
    mediaStream: null,
    audioProcessor: null,
    config: {
        deepinfraKey: '',
        openaiKey: '',
        inputLang: 'pt',
        outputLang: 'en',
        ttsEnabled: true,
        ttsSpeed: 1.3,
        silenceThreshold: -50
    },
    costs: {
        deepinfraSTT: 0,
        openaiSTT: 0,
        deepinfraLLM: 0,
        openaiLLM: 0,
        kokoroTTS: 0,
        openaiTTS: 0
    },
    sessionStart: null,
    audioChunks: [],
    transcriptionBuffer: '',
    audioQueue: [],
    isPlayingAudio: false
};

// === Constants ===
const SAMPLE_RATE = 16000;
const CHUNK_DURATION_SEC = 5;
const COSTS = {
    deepinfra_whisper: 0.00045 / 60,
    openai_stt: 0.36 / 3600,
    deepinfra_llm_input: 0.14 / 1_000_000,
    deepinfra_llm_output: 1.10 / 1_000_000,
    openai_llm_input: 0.4 / 1_000_000,
    openai_llm_output: 1.6 / 1_000_000,
    kokoro_tts: 0.62 / 1_000_000,
    openai_tts: 0.6 / 1_000_000
};

// === DOM Elements ===
let elements = {};

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    loadSettings();
    setupEventListeners();
    checkInstallStatus();
    registerServiceWorker();
});

function initializeElements() {
    elements = {
        recordBtn: document.getElementById('recordBtn'),
        recordBtnText: document.getElementById('recordBtnText'),
        statusText: document.getElementById('statusText'),
        costDisplay: document.getElementById('costDisplay'),
        vuMeterBar: document.getElementById('vuMeterBar'),
        console: document.getElementById('console'),
        settingsBtn: document.getElementById('settingsBtn'),
        settingsModal: document.getElementById('settingsModal'),
        closeSettings: document.getElementById('closeSettings'),
        saveSettings: document.getElementById('saveSettings'),
        inputLang: document.getElementById('inputLang'),
        outputLang: document.getElementById('outputLang'),
        deepinfraKey: document.getElementById('deepinfraKey'),
        openaiKey: document.getElementById('openaiKey'),
        ttsEnabled: document.getElementById('ttsEnabled'),
        ttsSpeed: document.getElementById('ttsSpeed'),
        ttsSpeedValue: document.getElementById('ttsSpeedValue'),
        silenceThreshold: document.getElementById('silenceThreshold'),
        silenceValue: document.getElementById('silenceValue'),
        costBreakdown: document.getElementById('costBreakdown'),
        installPrompt: document.getElementById('installPrompt'),
        closeInstallPrompt: document.getElementById('closeInstallPrompt')
    };
}

function setupEventListeners() {
    // Record button
    elements.recordBtn.addEventListener('click', toggleRecording);
    
    // Settings
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettings.addEventListener('click', closeSettings);
    elements.saveSettings.addEventListener('click', saveSettings);
    
    // Language changes
    elements.inputLang.addEventListener('change', () => {
        AppState.config.inputLang = elements.inputLang.value;
    });
    elements.outputLang.addEventListener('change', () => {
        AppState.config.outputLang = elements.outputLang.value;
    });
    
    // TTS Speed
    elements.ttsSpeed.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        elements.ttsSpeedValue.textContent = `${value.toFixed(1)}x`;
        AppState.config.ttsSpeed = value;
    });
    
    // Silence Threshold
    elements.silenceThreshold.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        elements.silenceValue.textContent = `${value} dBFS`;
        AppState.config.silenceThreshold = value;
    });
    
    // TTS Enabled
    elements.ttsEnabled.addEventListener('change', (e) => {
        AppState.config.ttsEnabled = e.target.checked;
    });
    
    // Install prompt
    elements.closeInstallPrompt.addEventListener('click', () => {
        elements.installPrompt.classList.remove('active');
        localStorage.setItem('installPromptClosed', 'true');
    });
}

// === Settings Management ===
function loadSettings() {
    try {
        const saved = localStorage.getItem('appConfig');
        if (saved) {
            const config = JSON.parse(saved);
            AppState.config = { ...AppState.config, ...config };
            
            // Update UI
            elements.deepinfraKey.value = AppState.config.deepinfraKey || '';
            elements.openaiKey.value = AppState.config.openaiKey || '';
            elements.inputLang.value = AppState.config.inputLang;
            elements.outputLang.value = AppState.config.outputLang;
            elements.ttsEnabled.checked = AppState.config.ttsEnabled;
            elements.ttsSpeed.value = AppState.config.ttsSpeed;
            elements.ttsSpeedValue.textContent = `${AppState.config.ttsSpeed.toFixed(1)}x`;
            elements.silenceThreshold.value = AppState.config.silenceThreshold;
            elements.silenceValue.textContent = `${AppState.config.silenceThreshold} dBFS`;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function saveSettings() {
    try {
        AppState.config.deepinfraKey = elements.deepinfraKey.value.trim();
        AppState.config.openaiKey = elements.openaiKey.value.trim();
        
        if (!AppState.config.deepinfraKey && !AppState.config.openaiKey) {
            showError('Por favor, insira pelo menos uma API key (DeepInfra ou OpenAI)');
            return;
        }
        
        localStorage.setItem('appConfig', JSON.stringify(AppState.config));
        closeSettings();
        logToConsole('✅ Configurações salvas com sucesso!', 'system');
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Erro ao salvar configurações');
    }
}

function openSettings() {
    elements.settingsModal.classList.add('active');
    updateCostDisplay();
}

function closeSettings() {
    elements.settingsModal.classList.remove('active');
}

// === Recording Control ===
async function toggleRecording() {
    if (AppState.recording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        // Validate API keys
        if (!AppState.config.deepinfraKey && !AppState.config.openaiKey) {
            showError('Configure suas API keys primeiro');
            openSettings();
            return;
        }
        
        // Request microphone access (works with Bluetooth headphones automatically)
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: SAMPLE_RATE
            }
        });
        
        AppState.mediaStream = stream;
        AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: SAMPLE_RATE
        });
        
        // Unlock audio context on iOS
        if (AppState.audioContext.state === 'suspended') {
            await AppState.audioContext.resume();
        }
        
        // Create audio processor
        await setupAudioProcessing(stream);
        
        // Update UI
        AppState.recording = true;
        AppState.sessionStart = Date.now();
        elements.recordBtn.classList.add('recording');
        elements.recordBtnText.textContent = 'Parar';
        elements.statusText.textContent = 'Gravando...';
        
        logToConsole('🎙️ Gravação iniciada', 'system');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        showError('Erro ao acessar microfone. Verifique as permissões.');
    }
}

function stopRecording() {
    try {
        // Stop all tracks
        if (AppState.mediaStream) {
            AppState.mediaStream.getTracks().forEach(track => track.stop());
        }
        
        // Close audio context
        if (AppState.audioContext) {
            AppState.audioContext.close();
        }
        
        // Reset state
        AppState.recording = false;
        AppState.audioChunks = [];
        AppState.transcriptionBuffer = '';
        
        // Update UI
        elements.recordBtn.classList.remove('recording');
        elements.recordBtnText.textContent = 'Iniciar';
        elements.statusText.textContent = 'Pronto';
        elements.vuMeterBar.style.width = '0%';
        
        logToConsole('⏹️ Gravação parada', 'system');
        
    } catch (error) {
        console.error('Error stopping recording:', error);
    }
}

// === Audio Processing ===
async function setupAudioProcessing(stream) {
    const source = AppState.audioContext.createMediaStreamSource(stream);
    const processor = AppState.audioContext.createScriptProcessor(4096, 1, 1);
    
    let audioBuffer = [];
    const chunkSize = SAMPLE_RATE * CHUNK_DURATION_SEC;
    
    processor.onaudioprocess = (e) => {
        if (!AppState.recording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        
        // Convert float32 to int16
        for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Update VU meter
        updateVUMeter(pcmData);
        
        // Check silence
        const rmsDB = calculateRMSdBFS(pcmData);
        if (rmsDB < AppState.config.silenceThreshold) {
            return; // Skip silent chunks
        }
        
        // Add to buffer
        audioBuffer.push(...pcmData);
        
        // When buffer reaches chunk size, process it
        if (audioBuffer.length >= chunkSize) {
            const chunk = audioBuffer.slice(0, chunkSize);
            audioBuffer = audioBuffer.slice(chunkSize);
            processAudioChunk(new Int16Array(chunk));
        }
    };
    
    source.connect(processor);
    processor.connect(AppState.audioContext.destination);
    AppState.audioProcessor = processor;
}

function calculateRMSdBFS(pcmData) {
    if (pcmData.length === 0) return -120;
    
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) {
        const normalized = pcmData[i] / 32768.0;
        sum += normalized * normalized;
    }
    
    const rms = Math.sqrt(sum / pcmData.length);
    return rms > 0 ? 20 * Math.log10(rms) : -120;
}

function updateVUMeter(pcmData) {
    const rmsDB = calculateRMSdBFS(pcmData);
    const threshold = AppState.config.silenceThreshold;
    
    if (rmsDB < threshold) {
        elements.vuMeterBar.style.width = '0%';
        return;
    }
    
    const range = 0 - threshold;
    const percent = Math.min(100, Math.max(0, ((rmsDB - threshold) / range) * 100));
    elements.vuMeterBar.style.width = `${percent}%`;
}

// === Audio Chunk Processing ===
async function processAudioChunk(pcmData) {
    try {
        // Convert to WAV format
        const wavBlob = createWavBlob(pcmData, SAMPLE_RATE);
        
        // Transcribe
        const transcription = await transcribeAudio(wavBlob);
        
        if (transcription && transcription.trim()) {
            logToConsole(`[STT] ${transcription}`, 'stt');
            
            // Translate
            const translation = await translateText(transcription);
            
            if (translation && translation.trim()) {
                logToConsole(translation, 'translation');
                
                // Speak translation
                if (AppState.config.ttsEnabled) {
                    await speakText(translation, AppState.config.outputLang);
                }
            }
        }
        
    } catch (error) {
        console.error('Error processing audio chunk:', error);
        logToConsole(`❌ Erro: ${error.message}`, 'error');
    }
}

// === WAV Conversion ===
function createWavBlob(pcmData, sampleRate) {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    
    // Write PCM data
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// === API Integration ===
async function transcribeAudio(audioBlob) {
    const duration = CHUNK_DURATION_SEC;
    
    // Try DeepInfra first
    if (AppState.config.deepinfraKey) {
        try {
            const result = await transcribeWithDeepInfra(audioBlob);
            AppState.costs.deepinfraSTT += duration * COSTS.deepinfra_whisper;
            updateCostDisplay();
            return result;
        } catch (error) {
            console.warn('DeepInfra STT failed, trying OpenAI...', error);
        }
    }
    
    // Fallback to OpenAI
    if (AppState.config.openaiKey) {
        try {
            const result = await transcribeWithOpenAI(audioBlob);
            AppState.costs.openaiSTT += duration * COSTS.openai_stt;
            updateCostDisplay();
            return result;
        } catch (error) {
            throw new Error('STT failed: ' + error.message);
        }
    }
    
    throw new Error('No API key configured for STT');
}

async function transcribeWithDeepInfra(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'mistralai/Voxtral-Mini-3B-2507');
    formData.append('language', AppState.config.inputLang);
    
    const response = await fetch('https://api.deepinfra.com/v1/openai/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.config.deepinfraKey}`
        },
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`DeepInfra STT error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text;
}

async function transcribeWithOpenAI(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'gpt-4o-transcribe');
    formData.append('language', AppState.config.inputLang);
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.config.openaiKey}`
        },
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI STT error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text;
}

async function translateText(text) {
    // Skip if same language
    if (AppState.config.inputLang === AppState.config.outputLang) {
        return text;
    }
    
    const messages = createTranslationMessages(text);
    const prompt = JSON.stringify(messages);
    
    // Try DeepInfra first
    if (AppState.config.deepinfraKey) {
        try {
            const result = await translateWithDeepInfra(messages);
            AppState.costs.deepinfraLLM += estimateTokens(prompt) * COSTS.deepinfra_llm_input;
            AppState.costs.deepinfraLLM += estimateTokens(result) * COSTS.deepinfra_llm_output;
            updateCostDisplay();
            return result;
        } catch (error) {
            console.warn('DeepInfra translation failed, trying OpenAI...', error);
        }
    }
    
    // Fallback to OpenAI
    if (AppState.config.openaiKey) {
        try {
            const result = await translateWithOpenAI(messages);
            AppState.costs.openaiLLM += estimateTokens(prompt) * COSTS.openai_llm_input;
            AppState.costs.openaiLLM += estimateTokens(result) * COSTS.openai_llm_output;
            updateCostDisplay();
            return result;
        } catch (error) {
            throw new Error('Translation failed: ' + error.message);
        }
    }
    
    throw new Error('No API key configured for translation');
}

function createTranslationMessages(text) {
    const langNames = {
        pt: 'português brasileiro',
        en: 'English',
        es: 'español',
        ja: '日本語',
        fr: 'français',
        zh: '中文'
    };
    
    const sourceLang = langNames[AppState.config.inputLang] || AppState.config.inputLang;
    const targetLang = langNames[AppState.config.outputLang] || AppState.config.outputLang;
    
    return [
        {
            role: 'system',
            content: 'You are an expert translator. Translate accurately and naturally. Output ONLY the translation inside <translation> tags.'
        },
        {
            role: 'user',
            content: `Translate from ${sourceLang} to ${targetLang}:\n\n<source_text>\n${text}\n</source_text>\n\nYour response MUST be ONLY the translated text in ${targetLang}, inside <translation> tags.`
        }
    ];
}

async function translateWithDeepInfra(messages) {
    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.config.deepinfraKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
            messages: messages,
            temperature: 0.1,
            max_tokens: 500
        })
    });
    
    if (!response.ok) {
        throw new Error(`DeepInfra translation error: ${response.status}`);
    }
    
    const data = await response.json();
    return extractTranslation(data.choices[0].message.content);
}

async function translateWithOpenAI(messages) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.config.openaiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4.1-mini-2025-04-14',
            messages: messages,
            temperature: 0.1,
            max_tokens: 500
        })
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI translation error: ${response.status}`);
    }
    
    const data = await response.json();
    return extractTranslation(data.choices[0].message.content);
}

function extractTranslation(text) {
    const match = text.match(/<translation>(.*?)<\/translation>/s);
    return match ? match[1].trim() : text.trim();
}

async function speakText(text, lang) {
    try {
        const audioBlob = await synthesizeSpeech(text, lang);
        await queueAudio(audioBlob);
    } catch (error) {
        console.error('TTS error:', error);
        logToConsole(`🔇 Erro TTS: ${error.message}`, 'error');
    }
}

async function synthesizeSpeech(text, lang) {
    const kokoroVoices = {
        ja: 'jf_gongitsune',
        en: 'af_heart',
        es: 'ef_dora',
        pt: 'pf_dora',
        zh: 'zf_xiaoxiao',
        fr: 'ff_siwis'
    };
    
    // Try Kokoro TTS first
    if (AppState.config.deepinfraKey && kokoroVoices[lang]) {
        try {
            const audioBlob = await synthesizeWithKokoro(text, kokoroVoices[lang]);
            AppState.costs.kokoroTTS += text.length * COSTS.kokoro_tts;
            updateCostDisplay();
            return audioBlob;
        } catch (error) {
            console.warn('Kokoro TTS failed, trying OpenAI...', error);
        }
    }
    
    // Fallback to OpenAI
    if (AppState.config.openaiKey) {
        const audioBlob = await synthesizeWithOpenAI(text);
        AppState.costs.openaiTTS += text.length * COSTS.openai_tts;
        updateCostDisplay();
        return audioBlob;
    }
    
    throw new Error('No TTS service available');
}

async function synthesizeWithKokoro(text, voice) {
    const response = await fetch('https://api.deepinfra.com/v1/openai/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.config.deepinfraKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'hexgrad/Kokoro-82M',
            input: text.substring(0, 4096),
            voice: voice,
            speed: AppState.config.ttsSpeed,
            response_format: 'mp3'
        })
    });
    
    if (!response.ok) {
        throw new Error(`Kokoro TTS error: ${response.status}`);
    }
    
    return await response.blob();
}

async function synthesizeWithOpenAI(text) {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.config.openaiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini-tts',
            input: text.substring(0, 4096),
            voice: 'nova',
            speed: AppState.config.ttsSpeed,
            response_format: 'mp3'
        })
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI TTS error: ${response.status}`);
    }
    
    return await response.blob();
}

// Audio Queue Management
async function queueAudio(audioBlob) {
    AppState.audioQueue.push(audioBlob);
    if (!AppState.isPlayingAudio) {
        await processAudioQueue();
    }
}

async function processAudioQueue() {
    while (AppState.audioQueue.length > 0) {
        AppState.isPlayingAudio = true;
        const audioBlob = AppState.audioQueue.shift();
        try {
            await playAudio(audioBlob);
        } catch (error) {
            console.error('Audio playback error:', error);
            logToConsole(`🔇 Erro ao reproduzir áudio: ${error.message}`, 'error');
        }
    }
    AppState.isPlayingAudio = false;
}

async function playAudio(audioBlob) {
    // Ensure AudioContext is ready (critical for iOS)
    if (AppState.audioContext && AppState.audioContext.state === 'suspended') {
        try {
            await AppState.audioContext.resume();
            console.log('AudioContext resumed');
        } catch (error) {
            console.warn('Failed to resume AudioContext:', error);
        }
    }

    return new Promise((resolve, reject) => {
        const audio = new Audio();
        const url = URL.createObjectURL(audioBlob);
        
        audio.onended = () => {
            console.log('Audio playback completed');
            URL.revokeObjectURL(url);
            resolve();
        };
        
        audio.onerror = (error) => {
            console.error('Audio element error:', error);
            URL.revokeObjectURL(url);
            reject(new Error('Failed to play audio'));
        };
        
        audio.oncanplaythrough = () => {
            audio.play().then(() => {
                console.log('Audio playback started');
            }).catch(err => {
                console.error('Play failed:', err);
                URL.revokeObjectURL(url);
                reject(err);
            });
        };
        
        audio.src = url;
        audio.load();
    });
}

// === Utilities ===
function estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
}

function updateCostDisplay() {
    const total = Object.values(AppState.costs).reduce((a, b) => a + b, 0);
    elements.costDisplay.textContent = `$${total.toFixed(6)}`;
    
    if (elements.costBreakdown) {
        const sessionTime = AppState.sessionStart ? (Date.now() - AppState.sessionStart) / 1000 : 0;
        const hourlyEstimate = sessionTime > 0 ? (total / sessionTime) * 3600 : 0;
        
        elements.costBreakdown.innerHTML = `
            <p>STT DeepInfra: $${AppState.costs.deepinfraSTT.toFixed(6)}</p>
            <p>STT OpenAI: $${AppState.costs.openaiSTT.toFixed(6)}</p>
            <p>LLM DeepInfra: $${AppState.costs.deepinfraLLM.toFixed(6)}</p>
            <p>LLM OpenAI: $${AppState.costs.openaiLLM.toFixed(6)}</p>
            <p>TTS Kokoro: $${AppState.costs.kokoroTTS.toFixed(6)}</p>
            <p>TTS OpenAI: $${AppState.costs.openaiTTS.toFixed(6)}</p>
            <p><strong>Total: $${total.toFixed(6)}</strong></p>
            <p>Estimativa/hora: $${hourlyEstimate.toFixed(2)}</p>
        `;
    }
}

function logToConsole(message, type = 'system') {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = message;
    elements.console.appendChild(line);
    elements.console.scrollTop = elements.console.scrollHeight;
    
    // Limit console lines
    while (elements.console.children.length > 100) {
        elements.console.removeChild(elements.console.firstChild);
    }
}

function showError(message) {
    alert(message);
    logToConsole(`❌ ${message}`, 'error');
}

// === PWA Functions ===
function checkInstallStatus() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true;
    
    const promptClosed = localStorage.getItem('installPromptClosed');
    
    if (!isStandalone && !promptClosed) {
        // Show install prompt for iOS users
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            elements.installPrompt.classList.add('active');
        }
    }
}

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // Use relative path for GitHub Pages compatibility
            const registration = await navigator.serviceWorker.register('./service-worker.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            // Non-critical error, app still works without SW
        }
    }
}
