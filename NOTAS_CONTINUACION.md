# Notas para Continuar - Mensajes y Llamadas de Voz

## Estado Actual ✅

### Completado
- ✅ Video chat reparado (commit `794d12d`)
- ✅ Hook `useVoiceMessage.js` creado para grabar audio
- ✅ Nombres reales y banderas en lobby
- ✅ Resaltado de movimientos mejorado

### En Progreso 🚧
- 🚧 Mensajes de voz (hook creado, falta integrar en UI)
- 🚧 Llamadas de voz (pendiente)

---

## Próximos Pasos

### 1. Integrar Mensajes de Voz en Game.jsx

**Importar hook**:
```jsx
import { useVoiceMessage } from '../hooks/useVoiceMessage';
```

**Usar hook**:
```jsx
const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording
} = useVoiceMessage();

const handleVoiceMessage = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob) {
        // Convertir a base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Audio = reader.result;
            
            // Enviar via PeerJS
            connection.send({
                type: 'voice',
                audio: base64Audio,
                duration: recordingTime
            });
            
            // Agregar a mensajes locales
            setMessages(prev => [...prev, {
                sender: 'Tú',
                type: 'voice',
                audio: base64Audio,
                duration: recordingTime
            }]);
        };
        reader.readAsDataURL(audioBlob);
    }
};
```

**Botón en UI** (agregar en chat-input):
```jsx
<div className="chat-input">
    <button 
        className="voice-btn"
        onMouseDown={startRecording}
        onMouseUp={handleVoiceMessage}
        onTouchStart={startRecording}
        onTouchEnd={handleVoiceMessage}
        style={{
            background: isRecording ? '#ef4444' : '#3b82f6',
            padding: '0.5rem',
            borderRadius: '50%'
        }}
    >
        {isRecording ? `🔴 ${recordingTime}s` : '🎤'}
    </button>
    <input type="text" ... />
    <button onClick={sendMessage}>Enviar</button>
</div>
```

**Recibir mensajes de voz** (en handleData):
```jsx
const handleData = (data) => {
    if (data.type === 'voice') {
        setMessages(prev => [...prev, {
            sender: 'Oponente',
            type: 'voice',
            audio: data.audio,
            duration: data.duration
        }]);
        playSound('notify');
    }
    // ... resto del código
};
```

**Renderizar mensaje de voz**:
```jsx
{messages.map((msg, i) => (
    <div key={i} className={`message ${msg.sender === 'Tú' ? 'own' : 'opponent'}`}>
        {msg.type === 'voice' ? (
            <div className="voice-message">
                <button onClick={() => {
                    const audio = new Audio(msg.audio);
                    audio.play();
                }}>
                    ▶️ {msg.duration}s
                </button>
            </div>
        ) : (
            <><strong>{msg.sender}:</strong> {msg.text}</>
        )}
    </div>
))}
```

---

### 2. Implementar Llamada de Voz (Solo Audio)

**Estado**:
```jsx
const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
const [voiceStream, setVoiceStream] = useState(null);
const voiceCallRef = useRef(null);
```

**Función toggle**:
```jsx
const toggleVoiceCall = async () => {
    if (isVoiceCallActive) {
        // Colgar
        if (voiceStream) {
            voiceStream.getTracks().forEach(track => track.stop());
        }
        if (voiceCallRef.current) {
            voiceCallRef.current.close();
        }
        setIsVoiceCallActive(false);
        setVoiceStream(null);
    } else {
        // Iniciar llamada
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            setVoiceStream(stream);
            
            // Hacer llamada
            const call = window.peerInstance.call(connection.peer, stream);
            voiceCallRef.current = call;
            
            call.on('stream', (remoteStream) => {
                // Reproducir audio remoto
                const audio = new Audio();
                audio.srcObject = remoteStream;
                audio.play();
            });
            
            setIsVoiceCallActive(true);
        } catch (err) {
            console.error('Error starting voice call:', err);
            alert('No se pudo iniciar la llamada de voz');
        }
    }
};
```

**Botón en header**:
```jsx
<button 
    onClick={toggleVoiceCall}
    style={{
        padding: '4px 8px',
        fontSize: '0.8rem',
        background: isVoiceCallActive ? '#ef4444' : '#22c55e'
    }}
>
    {isVoiceCallActive ? '📞 Colgar' : '📞 Llamar'}
</button>
```

---

## Estilos CSS Necesarios

Agregar a `index.css`:

```css
.voice-btn {
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    transition: all 0.2s;
}

.voice-btn:active {
    transform: scale(0.95);
}

.voice-message {
    background: rgba(59, 130, 246, 0.2);
    padding: 0.5rem;
    border-radius: 8px;
    display: inline-block;
}

.voice-message button {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    font-size: 0.9rem;
}
```

---

## Archivos a Modificar

1. ✅ `src/hooks/useVoiceMessage.js` - Creado
2. 🚧 `src/components/Game.jsx` - Agregar integración
3. 🚧 `src/index.css` - Agregar estilos

---

## Commits Realizados

- `794d12d` - fix: Reparado video chat usando window.peerInstance global
- `[nuevo]` - feat: Agregado hook useVoiceMessage (WIP)

---

## Para Continuar desde Celular

1. Accede a GitHub: https://github.com/Taladro678/ajedrez-p2p
2. Abre este archivo: `NOTAS_CONTINUACION.md`
3. Usa Gemini en Android para:
   - Modificar `Game.jsx` siguiendo los ejemplos de código arriba
   - Agregar estilos CSS
   - Hacer commits y push

---

## Comandos Git Útiles

```bash
# Ver cambios
git status

# Agregar archivos
git add src/components/Game.jsx src/index.css

# Commit
git commit -m "feat: Implementados mensajes de voz y llamadas de voz"

# Push
git push origin main
```

---

¡Buen viaje! 🚀
