# 🎤 Tradutor em Tempo Real - PWA

Progressive Web App para tradução em tempo real com transcrição de voz, otimizado para iPhone e suporte a fones Bluetooth.

## ✨ Recursos

- ✅ **Transcrição em tempo real** usando DeepInfra Whisper ou OpenAI
- ✅ **Tradução automática** com LLMs avançados (Qwen/GPT-4)
- ✅ **Síntese de voz (TTS)** com Kokoro ou OpenAI TTS
- ✅ **Suporte a fones Bluetooth** - captura e reprodução automática
- ✅ **Detecção de silêncio** para economia de API calls
- ✅ **Rastreamento de custos** em tempo real
- ✅ **PWA instalável** no iPhone
- ✅ **Modo offline** com cache inteligente
- ✅ **Dark mode** otimizado para iPhone

## 📱 Instalação no iPhone

1. Abra o Safari no iPhone
2. Acesse o PWA hospedado
3. Toque no ícone de compartilhar (📤)
4. Selecione "Adicionar à Tela de Início"
5. Confirme e o app será instalado!

## 🔑 Configuração

1. Abra o app e toque no ícone de configurações (⚙️)
2. Insira suas API keys:
   - **DeepInfra API Key** (principal)
   - **OpenAI API Key** (fallback)
3. As chaves serão salvas localmente no navegador
4. O iPhone pode salvar as chaves no gerenciador de senhas para preenchimento automático

> **⚠️ Suas API keys nunca saem do seu dispositivo** - todas as chamadas são feitas diretamente do navegador para as APIs

## 🎧 Usando com Fones Bluetooth

1. Conecte seus fones Bluetooth ao iPhone
2. Inicie a gravação no app
3. O áudio será automaticamente capturado pelo microfone do fone
4. O áudio traduzido será reproduzido nos fones

Funciona com: AirPods, AirPods Pro, AirPods Max, e outros fones Bluetooth compatíveis.

## 🚀 Como Usar

1. **Configure suas API keys** (primeira vez apenas)
2. **Selecione o idioma de entrada** (o que você vai falar)
3. **Selecione o idioma de saída** (tradução desejada)
4. **Toque no botão "Iniciar"** para começar a gravar
5. **Fale normalmente** - o app transcreve, traduz e reproduz automaticamente
6. **Toque em "Parar"** quando terminar

## ⚙️ Configurações Avançadas

- **Velocidade do TTS**: Ajuste de 0.8x a 2.0x
- **Limite de Silêncio**: Controle a sensibilidade de detecção de voz
- **Ativar/Desativar TTS**: Apenas transcrição e tradução sem fala

## 💰 Custos

O app mostra custos em tempo real:
- STT (Speech-to-Text)
- Tradução (LLM)
- TTS (Text-to-Speech)
- Estimativa por hora

Você paga apenas pelo que usar através das suas próprias API keys.

## 🌐 Hospedagem

Para hospedar este PWA, você pode usar:

### 1. GitHub Pages (Grátis)
```bash
# Fork o repositório
# Ative GitHub Pages em Settings > Pages
# URL: https://seu-usuario.github.io/tradutor-pwa/
```

### 2. Vercel (Grátis)
```bash
# Instale o Vercel CLI
npm i -g vercel

# Na pasta web/
vercel

# URL será fornecida automaticamente
```

### 3. Netlify (Grátis)
```bash
# Arraste a pasta web/ para netlify.com/drop
# URL será fornecida automaticamente
```

### 4. Servidor Próprio
Copie todos os arquivos da pasta `web/` para seu servidor web.

## 📂 Estrutura de Arquivos

```
web/
├── index.html          # Interface principal
├── styles.css          # Estilos (dark mode, iPhone-optimized)
├── app.js              # Lógica da aplicação
├── manifest.json       # Configuração PWA
├── service-worker.js   # Cache e offline
└── icons/              # Ícones do app
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-180.png
    ├── icon-192.png
    └── icon-512.png
```

## 🔒 Privacidade e Segurança

- ✅ **API keys armazenadas localmente** (localStorage)
- ✅ **Nenhum servidor intermediário** - chamadas diretas às APIs
- ✅ **Código aberto** - você pode auditar todo o código
- ✅ **Sem rastreamento** - nenhum dado é coletado
- ✅ **HTTPS obrigatório** - segurança nas comunicações

## 📋 Requisitos

- iPhone com iOS 15+ (Safari)
- Conexão com internet (para API calls)
- API keys da DeepInfra e/ou OpenAI
- Permissão para acesso ao microfone

## 🛠️ Desenvolvimento

Se você quiser modificar o código:

1. Clone o repositório
2. Edite os arquivos em `web/`
3. Teste localmente com um servidor HTTP:
   ```bash
   # Python 3
   cd web
   python -m http.server 8000
   
   # Node.js
   npx serve web
   ```
4. Acesse `http://localhost:8000`

## 🐛 Solução de Problemas

### Microfone não funciona
- Verifique as permissões do Safari em Ajustes > Safari > Câmera e Microfone
- Recarregue a página e permita o acesso

### Fones Bluetooth não funcionam
- Certifique-se de que os fones estão conectados ao iPhone
- Verifique se outras apps de áudio funcionam com os fones
- Reinicie a gravação no app

### API key não funciona
- Verifique se a chave está correta (sem espaços)
- Confirme se a chave tem créditos disponíveis
- Tente a chave de fallback

### PWA não instala
- Use o Safari (Chrome iOS não suporta PWA completo)
- Certifique-se de estar em HTTPS
- Tente limpar cache e tentar novamente

## 📄 Licença

MIT License - use como quiser!

## 🙏 Créditos

- **DeepInfra**: STT (Whisper), TTS (Kokoro), LLM (Qwen)
- **OpenAI**: STT/TTS/LLM fallback
- **Web Audio API**: Captura e processamento de áudio
- **Service Workers**: Funcionalidade offline

---

**Desenvolvido com ❤️ para tradução em tempo real no iPhone**
