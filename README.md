# Repositorio de Diplomados — Griky

Catálogo web de SCORMs educativos, alojado en **GitHub Pages**.

Los archivos `.zip` **no** viven en este repositorio: están en el SharePoint de la
empresa. Este sitio es solo un índice navegable que apunta a ellos.

---

## 🗂️ Estructura

```
Repositorio_Diplomados/
├── index.html      ← Página principal
├── styles.css      ← Estilos (modo oscuro + gradientes)
├── app.js          ← Navegación de 3 niveles + búsqueda
├── catalog.json    ← ⭐ ARCHIVO CLAVE: qué existe y dónde está en SharePoint
└── logo.png        ← Logo de Griky
```

---

## 📐 Formato de `catalog.json`

La URL completa de SharePoint mide unos 400 caracteres y es casi idéntica para
todas las unidades. En lugar de repetirla 300+ veces, se guarda en tres piezas
que `app.js` vuelve a unir:

```
base  (una sola vez para todo el archivo)
  + folder  (una vez por curso)
    + filename  (por unidad)
      + "?download=1"
```

```json
{
  "base": "https://grikyco136.sharepoint.com/sites/GrikyRecursos/.../Griky%20Academy/",
  "catalog": [
    {
      "id": "da-1",
      "title": "1. Diplomado en Acción Climática",
      "description": "Diplomado Avanzado 1",
      "color": "linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)",
      "icon": "🎓",
      "createdAt": "2026-01-15",
      "diplomados": [
        {
          "id": "d-1-1",
          "title": "Curso 1. Energías Renovables y Transición Energética",
          "description": "Curso 1",
          "createdAt": "2026-01-15",
          "folder": "1. Diplomado en Acción Climática/Curso 1. Energías Renovables y Transición Energética/Producción y diseño/SCORMS",
          "unidades": [
            {
              "id": "u-1-1-1",
              "title": "Fundamentos de la Transición Energética",
              "filename": "unidad-1-fundamentos-de-la-transicion-energetica.zip",
              "createdAt": "2026-01-15"
            }
          ]
        }
      ]
    }
  ]
}
```

`folder` se escribe **sin codificar** (con acentos y espacios normales); `app.js`
lo codifica al construir la URL. No pegues rutas con `%20` ni `%C3%B3n`.

---

## ➕ Agregar o corregir contenido

Todo se edita a mano en `catalog.json`, se hace commit y GitHub Pages se
actualiza solo. No hay backend ni base de datos.

**Nueva unidad en un curso existente:** añade una entrada al array `unidades`.
Basta con `id`, `title`, `filename` y `createdAt` — la ruta sale del `folder`
del curso.

**Curso nuevo:** copia la ruta de la carpeta `SCORMS` desde SharePoint, quítale
el prefijo `base`, decodifica los `%20`/`%C3%xx` y ponla en `folder`.

---

## ⏳ Unidades pendientes

Una unidad marcada con `"pending": true` aparece en la web como **⏳ Ruta
pendiente**, sin botón de descarga. Es el estado de los diplomados avanzados
**9 al 20**: se conocen los nombres de archivo, pero no la carpeta de SharePoint
de cada curso.

Para completar uno:

1. Pon el nombre real del curso en su `title` (hoy dice `Curso 1`, `Curso 2`, …).
2. Añade el `folder` del curso.
3. Borra la línea `"pending": true` de sus unidades.
4. Revisa el `title` de cada unidad: se derivó del nombre del archivo, así que
   le faltan acentos y mayúsculas (`"Fundamentos de la inversion esg"`).

---

## 🚀 GitHub Pages

**Settings → Pages → Source:** `Deploy from a branch`, rama `main`, carpeta
`/ (root)`. El archivo `.nojekyll` evita que Jekyll procese el sitio.

---

## 🔧 Personalización

| Qué cambiar | Dónde |
|---|---|
| Logo | Reemplaza `logo.png` |
| Colores y tipografía | Variables en `:root` de `styles.css` |
| Color/icono de un diplomado | Campos `color` e `icon` en `catalog.json` |
| Datos del catálogo | `catalog.json` |

---

## ⌨️ Atajos

| Tecla | Acción |
|---|---|
| `/` | Enfocar el buscador |
| `Esc` | Limpiar la búsqueda |

La URL refleja dónde estás (`#da-1/d-1-1`), así que los enlaces se pueden
compartir y el botón "atrás" del navegador funciona.

---

## 📝 Notas

- Las descargas llevan a SharePoint, así que **hay que tener sesión iniciada**
  con una cuenta con permiso sobre la biblioteca. Sin sesión, SharePoint redirige
  al login.
- El `?download=1` que añade `app.js` hace que SharePoint entregue el `.zip` en
  vez de abrir la vista previa.
- Todo corre en el navegador: sin servidor, sin base de datos, sin build.
