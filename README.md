# Repositorio de Diplomados — Griky

Catálogo web de SCORMs educativos, alojado en **GitHub Pages**.

---

## 🗂️ Estructura del repositorio

```
Repositorio_Diplomados/
├── index.html        ← Página principal del catálogo
├── styles.css        ← Estilos (modo oscuro + gradientes)
├── app.js            ← Lógica de navegación
├── catalog.json      ← ⭐ ARCHIVO CLAVE: datos del catálogo
├── logo.jpg          ← Logo de Griky (reemplazar cuando sea necesario)
└── scorms/           ← Aquí van los archivos .zip
    ├── da-1/
    │   ├── d-1/
    │   │   ├── unidad-1.zip
    │   │   └── ...
    │   └── d-2/
    └── da-2/
        └── ...
```

---

## 🚀 Activar GitHub Pages

1. Sube esta carpeta a un repositorio de GitHub
2. Ve a **Settings → Pages**
3. En **Source** selecciona: `Deploy from a branch`
4. Rama: `main`, carpeta: `/ (root)`
5. Guarda — en unos minutos tendrás la URL pública

---

## ➕ Agregar un nuevo SCORM

### Desde la interfaz web
1. Entra al catálogo
2. Usa el botón **"+ Nuevo Diplomado Avanzado"** o **"+ Nuevo Diplomado"**
3. Al guardar, el sitio descargará automáticamente un `catalog.json` actualizado
4. Reemplaza el `catalog.json` en tu repositorio con el descargado

### Manualmente (para agregar unidades/SCORMs)
1. Sube el archivo `.zip` a la carpeta correcta dentro de `scorms/`
2. Edita `catalog.json` y agrega una entrada en el array `unidades` del diplomado correspondiente:

```json
{
  "id": "u-nuevo-id",
  "title": "Unidad 5",
  "filename": "unidad-5.zip",
  "path": "scorms/da-1/d-1/unidad-5.zip",
  "createdAt": "2026-08-06",
  "size": ""
}
```

3. Haz commit y push — GitHub Pages actualizará el catálogo automáticamente

---

## 🔧 Personalización

| Qué cambiar | Dónde |
|---|---|
| Logo | Reemplaza `logo.jpg` con tu imagen |
| Colores / fuentes | Edita variables en `styles.css` (:root) |
| Datos del catálogo | Edita `catalog.json` |

---

## 📝 Notas

- Los archivos `.zip` deben estar dentro del repositorio para que GitHub Pages los sirva
- El tamaño máximo por archivo en GitHub es **100 MB** (usar Git LFS para archivos más grandes)
- El catálogo funciona 100% en el navegador, sin servidor ni base de datos
