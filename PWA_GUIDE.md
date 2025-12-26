# Guía PWA - Análisis Producción STC

## 📱 Características PWA Implementadas

### 1. Instalación como App

La aplicación ahora se puede instalar en dispositivos móviles y de escritorio como una aplicación nativa:

#### **Android/iOS:**
1. Abrir la web en Chrome/Safari
2. Tocar el menú (⋮) → "Agregar a pantalla de inicio"
3. La app se instalará con el ícono de Santana Textiles

#### **Desktop (Chrome/Edge):**
1. Buscar el ícono de instalación (+) en la barra de direcciones
2. Clic en "Instalar"
3. La app se abrirá en ventana independiente

### 2. Funcionalidad Offline

**Service Worker configurado con estrategias de caché:**

- **App Shell**: HTML, CSS, JS en caché para carga instantánea
- **Fuentes Google**: Cache-First con 1 año de expiración
- **API**: Network-First con fallback a caché (5 min TTL)
- **Imágenes**: Cache-First para logo y recursos estáticos

### 3. Iconos PWA Generados

Iconos en 8 tamaños para todas las plataformas:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

Generados automáticamente desde `LogoSantana.jpg` usando Sharp.

### 4. Manifest.json

Configuración completa con:
- Nombre: "Análisis Producción STC"
- Color tema: #1E40AF (azul corporativo)
- Display: standalone (app nativa)
- Shortcuts: Accesos directos a las 3 secciones principales
  - Residuos ÍNDIGO
  - Análisis Residuos
  - Consulta ROLADA

### 5. Meta Tags iOS

Configuración específica para iPhone/iPad:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="STC Producción" />
<link rel="apple-touch-icon" href="/icon-192x192.png" />
```

## 🎨 Mejoras Responsive Móvil

### **ConsultaRoladaIndigo.vue**

#### Header Responsive:
- **Desktop**: Layout horizontal con logo grande
- **Móvil**: Layout vertical con logo compacto
- Input ROLADA se expande a ancho completo en móvil
- Botones con texto oculto en pantallas pequeñas (solo iconos)

#### Tabla Responsive:
- **Scroll horizontal** en móvil (min-width: 1200px)
- Padding adaptable: `px-2 lg:px-3`
- Texto más pequeño: `text-xs lg:text-sm`
- Todas las columnas visibles con scroll

#### Botones de Acción:
- **Desktop**: "Buscar", "Imagen", "Excel"
- **Móvil**: Solo iconos + tooltips

### **NavBar.vue**

#### Menú Móvil:
- **Botón flotante** en esquina superior izquierda (solo móvil)
- **Overlay oscuro** al abrir menú
- **Animaciones suaves** de entrada/salida
- Cierre automático al seleccionar opción
- Botón X visible en el header del sidebar

#### Comportamiento Adaptable:
- **Desktop**: Aparece con hover en borde izquierdo
- **Móvil**: Se abre con botón flotante, se cierra con overlay o botón X

## 🛠️ Configuración Técnica

### **vite.config.js**
```javascript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      // Fuentes Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
        }
      },
      // API local
      {
        urlPattern: /^http:\/\/localhost:3002\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxAgeSeconds: 60 * 5 }
        }
      }
    ]
  }
})
```

### **Service Worker Registration**
```javascript
// main.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

## 📊 Breakpoints Tailwind

```
sm: 640px   - Móvil grande
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Desktop grande
```

Usamos principalmente `lg:` para diferenciar móvil/desktop.

## 🚀 Comandos de Desarrollo

```bash
# Instalar dependencias PWA
npm install vite-plugin-pwa workbox-window -D
npm install sharp --save-dev

# Generar iconos PWA
node scripts/generate-icons.cjs

# Ejecutar con PWA habilitada
npm run dev

# Build producción
npm run build
```

## 📝 Archivos Clave

```
public/
├── manifest.json              # Configuración PWA
├── icon-*.png                 # Iconos 72px-512px
└── LogoSantana.jpg           # Logo original

scripts/
└── generate-icons.cjs        # Script para generar iconos

src/
├── main.js                   # Registro Service Worker
└── components/
    ├── NavBar.vue           # Menú responsive
    └── ConsultaRoladaIndigo.vue  # Tabla responsive

vite.config.js                # Config PWA
index.html                    # Meta tags PWA
```

## ✅ Testing PWA

### Chrome DevTools:
1. F12 → Application tab
2. Manifest: Verificar configuración
3. Service Workers: Estado activo
4. Cache Storage: Recursos cacheados

### Lighthouse:
1. F12 → Lighthouse tab
2. Seleccionar "Progressive Web App"
3. Run audit
4. Score objetivo: >90

### Mobile Testing:
1. Chrome Remote Debugging
2. Ngrok para HTTPS (requerido para PWA)
3. Probar instalación en Android real

## 🎯 Próximas Mejoras

- [ ] Notificaciones Push (Web Push API)
- [ ] Sincronización en segundo plano
- [ ] Modo offline completo con IndexedDB
- [ ] Update prompt cuando hay nueva versión
- [ ] Splash screen personalizado
- [ ] Share Target API (compartir a la app)
- [ ] Shortcuts dinámicos basados en uso

## 📖 Referencias

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
