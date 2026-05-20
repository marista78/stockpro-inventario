# 📋 Bitácora Técnica — StockPro: Gestión de Inventario

**Fecha de inicio:** 8 de mayo de 2026  
**Fecha de finalización:** 8 de mayo de 2026  
**Directorio del proyecto:** `c:\Users\Martin\Desktop\Gestion de Inventarios\`  
**Estado:** ✅ Completado y funcional

---

## 1. Descripción del Proyecto
**StockPro** es una aplicación web de gestión de inventario para pequeños negocios, con interfaz completamente en español. Permite controlar productos, categorías, movimientos de stock, generar códigos QR y ver reportes visuales. Funciona como PWA (Progressive Web App), lo que permite instalarla en dispositivos Android sin necesidad de Play Store.

---

## 2. Stack Tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| **React** | 19.x | Framework de UI |
| **Vite** | 8.x | Bundler y servidor de desarrollo |
| **JavaScript (JSX)** | ES2022+ | Lenguaje principal |
| **Vanilla CSS** | — | Estilos (Diseño premium personalizado) |
| **Recharts** | 2.x | Gráficas y reportes |
| **react-qr-code** | 2.x | Generación de códigos QR |
| **html5-qrcode** | 2.x | Escáner de QR con cámara |
| **vite-plugin-pwa** | 1.x | Soporte para instalación en móviles |
| **localStorage** | API nativa | Base de datos local (Persistencia) |

---

## 3. Estructura del Proyecto

```
Gestion de Inventarios/
├── index.html                          ← Punto de entrada HTML
├── vite.config.js                      ← Configuración de Vite y PWA
├── src/
│   ├── main.jsx                        ← Entrada principal de React
│   ├── App.jsx                         ← Router y Estructura principal
│   ├── index.css                       ← Sistema de diseño global
│   ├── context/                        ← Lógica de Auth e Inventario
│   ├── components/                     ← Componentes reutilizables (Sidebar, Modales)
│   └── pages/                          ← Vistas de la aplicación (Dashboard, Inventario, etc.)
```

---

## 4. Características Implementadas

1. **Dashboard Avanzado:** Resumen de stock, valor total, alertas de bajo stock con unidades y panel de próximos vencimientos (30 días).
2. **Inventario Pro (CRUD):** Gestión completa con campos de Unidad de Medida, Marca, Proveedor, Lote, Fecha de Ingreso y Vencimiento.
3. **Categorías:** Organización de productos con colores personalizados.
4. **Movimientos:** Registro detallado de entradas y salidas de mercancía.
5. **Generador de SKU:** Creación automática de códigos inteligentes basados en la categoría.
6. **Búsqueda Mágica de Imágenes:** Integración con Unsplash/IA para encontrar fotos de productos por nombre y acceso directo a Google Imágenes.
7. **Filtros Estilo Excel:** Sistema de filtrado avanzado integrado directamente en los encabezados de la tabla para una navegación rápida.
8. **Código QR:** Generación automática por producto con opción de impresión.
9. **Escáner QR:** Búsqueda rápida de productos usando la cámara del dispositivo.
10. **Reportes:** Exportación de datos a CSV y visualización de estadísticas detalladas.
11. **PWA:** Instalable en Android/iOS como una aplicación nativa.
12. **Gestión de Usuarios:** Módulo completo para administrar accesos, editar perfiles y asignar roles (Admin/User) con persistencia en localStorage.

---

## 5. Acceso de Demostración

| Usuario | Email | Contraseña |
|---|---|---|
| Administrador | `admin@stockpro.com` | `admin123` |
| Usuario Demo | `demo@demo.com` | `demo123` |

---

## 6. Instrucciones de Ejecución

1. **Instalar dependencias:** `npm install`
2. **Iniciar servidor:** `npm run dev`
3. **Acceso móvil:** `npm run dev -- --host` (Abrir la IP mostrada en el navegador del celular).

---

## 7. Base de Datos
La aplicación utiliza **localStorage**. Esto significa que los datos se guardan directamente en el navegador del dispositivo donde se usa. No requiere configuración de servidor externo para funcionar de manera simple y rápida.

---

## 8. Actualizaciones Recientes (UX & Interactividad)

- **Scrollbars Premium:** Rediseño de las barras de desplazamiento con mayor grosor (20px), color púrpura vibrante y tamaño mínimo de botón (120px) para una manipulación cómoda en dispositivos táctiles y de escritorio.
- **Interactividad de Tabla:**
    - **Selección de Fila:** Resaltado visual instantáneo al hacer clic en un producto.
    - **Doble Clic:** Apertura de un modal de detalles premium con imagen ampliada y tarjetas de estadísticas de stock.
- **Optimización de Registro:** Separación de campos de Producto y Stock actual en el modal de movimientos para evitar errores de captura.
- **Rediseño de Modal de Movimientos:** Unificación de columnas para eliminar espacios vacíos. Secciones 1 y 3 (Producto y Cantidad) ahora fluyen en la columna izquierda, mientras que las secciones 2, 4, 5, 6 y 7 (Lote, Motivo, Fecha, Responsable y Notas) se agrupan en la derecha para un diseño ultra-compacto.
- **Eliminación Automática de Lotes:** Los lotes (batches) que llegan a stock 0 se ocultan automáticamente de la vista de Inventario y de la selección de movimientos. Esto mantiene la interfaz limpia de registros agotados, permitiendo que el usuario se enfoque solo en lo disponible.
- **Trazabilidad en Edición:** A pesar de estar ocultos, los registros se mantienen en la base de datos para permitir la edición y eliminación de movimientos históricos (reversión de stock).
- **Reposicionamiento del Símbolo Monetario:** Se reubicó el símbolo monetario peruano (`S/`) colocándolo de manera prefijada adelante de todos los montos de precio en la aplicación (ej. `S/ 15.00` en lugar de `15.00 S/`), abarcando Dashboard, Inventario, Movimientos (incluyendo boleta térmica/ticket), Reportes y Escáner QR.
- **Proveedor y Creación de Lotes en Entrada de Mercadería:**
    - **Selector de Proveedor Integrado:** Se añadió un selector de proveedor en el modal de registro de movimientos de tipo entrada. En lotes existentes, se muestra dinámicamente al lado del selector de lote activo en formato de 2 columnas (`grid-2`), precargando y sincronizando el proveedor asociado por defecto. En lotes nuevos, se mantiene consistente visualmente en paralelo al código de lote.
    - **Soporte de Inserción de Nuevos Lotes en Supabase:** Se completó y corrigió la función `addMovement` en el contexto de inventario, permitiendo insertar una nueva fila independiente en la tabla `products` para registrar de manera real y persistente un nuevo lote con su código, precio de compra y proveedor en Supabase, evitando fallos de producto no encontrado.

---

## 9. Registro de Incidentes y Soluciones (Post-Mortem)

### 🚨 Incidente: Aplicación o Secciones en Blanco (Missing Imports)
**Frecuencia:** 2 veces  
**Causa Raíz:** Se utilizaron iconos de la librería `lucide-react` en el código (ej. `Filter`, `Wand2`) sin haberlos agregado previamente a la lista de importación al inicio del archivo.  
**Impacto:** Fallo crítico de renderizado (Uncaught ReferenceError). Debido a que los errores ocurrían en constantes de nivel superior (como la configuración del menú), la aplicación fallaba antes de cargar el sistema de reporte de errores de React.  
**Solución Aplicada:** 
- Limpieza manual de imports y validación estricta de iconos usados.
- Implementación de controles defensivos en `StockMovements.jsx` para evitar fallos por datos nulos o fechas inválidas.
- **Lección Aprendida:** Cada vez que se agregue un nuevo icono o componente visual, se debe verificar inmediatamente la sección de `import` para evitar regresiones de "Pantalla en Blanco".

### 🚨 Incidente: Sección Inventario en Blanco (Missing Context Export)
**Fecha:** 9 de mayo de 2026  
**Causa Raíz:** Se definió la función `getCategoryById` en `InventoryContext.jsx`, pero no se incluyó en el objeto `value` del `InventoryContext.Provider`. Al intentar usarla en `Inventory.jsx`, React lanzaba un error fatal por intentar llamar a una función inexistente (`undefined`).  
**Impacto:** La página de Inventario se mostraba completamente en blanco a pesar de que el resto de la aplicación funcionaba.  
**Solución Aplicada:** Se agregó `getCategoryById` a la lista de exportaciones del proveedor de contexto.  
**Lección Aprendida:** Al agregar nuevas funciones a un Contexto, siempre se debe verificar su exportación en el Provider antes de intentar usarlas en los componentes hijos.

---

## 10. Actualizaciones de IA, Seguridad y Respaldo

### 🤖 Remoción de IA y Limpieza (10/05/2026)
Se ha procedido a la eliminación completa de los módulos de Inteligencia Artificial por solicitud del usuario para optimizar el rendimiento y simplicidad del sistema:
- **Desinstalación de SDKs:** Se eliminaron `@mistralai/mistralai` y `@google/generative-ai`.
- **Limpieza de UI:** Se borraron las páginas `AIAssistant.jsx`, sus estilos `.css` y el archivo de configuración `ai.js`.
- **Ajuste de Rutas:** Se eliminaron las referencias en `App.jsx` y los enlaces de navegación en la `Sidebar`.

---

## 11. Personalización, Navegación Premium y Persistencia (10/05/2026)

### 🎨 Branding y Configuración Dinámica
Se ha completado el sistema de identidad visual para permitir una personalización total del sistema StockAI:
- **Persistencia en Supabase:** Implementación de la tabla `settings` para guardar permanentemente el nombre de la app, el icono y el color principal.
- **Corrección de Estado:** Se resolvió un error de referencia en `SettingsContext.jsx` que impedía que la configuración se mantuviera tras recargar la página.
- **Limpieza de Mantenimiento:** Se eliminaron las tarjetas redundantes (como Cuentas Demo) para centrar el panel en la personalización de marca.

### 📦 Navegación de Inventario (Slider)
Se ha transformado la visualización de productos en una experiencia mucho más fluida y profesional:
- **Flechas Laterales (Slider):** Se añadieron botones de navegación circulares de gran tamaño en los extremos de la pantalla dentro de la vista de detalles.
- **Atajos de Teclado:** Soporte completo para las flechas del teclado (`←` y `→`) para navegar entre productos sin cerrar el modal.
- **Sincronización de Imágenes:** Se corrigió el mapeo de `image_url` a `image` en `InventoryContext.jsx`, asegurando que las fotos de los productos no desaparezcan tras un refresco de página.
- **Edición Rápida:** Habilitación de la carga de imágenes directa desde la vista de detalles para actualizaciones veloces de catálogo.

### 🔐 Seguridad y Experiencia de Usuario
- **Login Simplificado:** Remoción de la sección pública de "Acceso de demostración" en la página de Login para privatizar el acceso al sistema.
- **Mapeo de Usuarios:** Corrección de la propiedad `created_at` en el contexto de autenticación para mostrar correctamente la fecha de registro de los nuevos usuarios.

---

**Última actualización:** 19 de mayo de 2026 (Moneda al inicio, Proveedor en entrada y creación de lotes en Supabase)

