# JobDorker — Búsquedas avanzadas de empleo

**JobDorker** genera *Google dorks* listos para usar y te muestra los resultados en **mosaicos web**. Filtrás por **rol**, **área/industria**, **seniority**, **idioma**, **país** y **modalidad** (remoto / híbrido / presencial). Ideal para llegar directo a las páginas de **careers/jobs** de empresas y portales.

> Hecho en Tkinter. by **Garbox0**.

---

## Funcionalidades

* **Generación de dorks** (consultas Google) con exclusiones útiles

  * `inurl:careers OR inurl:jobs`
  * exclusión de **internships/voluntariados** (opcional)
  * pistas de **salario** (opcional)
  * modo **Exploración** (consultas menos estrictas).
* **Mosaicos web**: abre varias fuentes a la vez (visor embebido con fallback al navegador).
* **Portales personalizados**: agregá tu `site:` o filtro y guardalo como nueva fuente.
* **Tema oscuro / claro** y **color de acento**.
* UI responsive con scroll, tarjetas limpias, botones “Abrir en visor / Copiar URL”.

**Fuentes incluidas (por defecto):**
Google (general), LinkedIn Jobs, Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Get on Board, Bumeran.
Además podés sumar las tuyas desde **Portales personalizados**.

---

## Uso básico

1. **Rol (obligatorio)**
   Escribí el rol con variantes:
   `“soporte técnico” OR "help desk" OR "service desk" OR "mesa de ayuda"`.
2. Elegí **Área/Industria**, **Seniority**, **Idioma**, **Ubicación (país)** y **Modalidad**.
3. Opciones:

   * **Excluir prácticas / pasantías** (–internship, –voluntariado, etc.)
   * **Incluir pistas de salario** (muestra selector de moneda)
   * **Modo exploración (menos estricto)** para ampliar resultados.
4. Elegí una acción:

   * **Generar dorks** → verás las consultas + botones por fuente.
   * **Búsqueda web (mosaicos)** → abre los resultados en el visor.
     *(Si no hay runtime de WebView2, se abre tu navegador por defecto.)*
5. (Opcional) **Portales personalizados**
   Poné un **Nombre** y un **Filtro / URL** (ej. `site:smartrecruiters.com` o `inurl:jobs`) → **Agregar**.

---

## Descarga

* Ir a la pestaña **Releases** y bajar:

  * **EXE:** `JobDorker_v1.0.0.exe`
  * **ZIP:** `JobDorker_v1.0.0_Windows.zip`

**Verificación de integridad**

* SHA-256 **(.exe)**: `9803307f3a3416de091246655225183141c99277068350cf78cde90dd1abd17d`
* SHA-256 **(.zip)**: `7C0A068D72DDC5DAF1CA237968601F5D6D4FC96F5E052273E54A78C2C5CBA7CA`

En Windows:

```powershell
CertUtil -hashfile .\JobDorker_v1.0.0.exe SHA256
```

> ⚠️ **SmartScreen** puede advertir por no estar firmado.
> Click en **Más información → Ejecutar de todas formas**.

---

## Ejecutar desde código (dev)

**Requisitos:** Windows 10/11, **Python 3.12+**.

```bash
git clone https://github.com/<tu-usuario>/JobDorker.git
cd JobDorker
python -m venv .venv
# Activar venv:
#   PowerShell: .\.venv\Scripts\Activate
#   CMD:       .venv\Scripts\activate
pip install -r requirements.txt
python JobDorker.py
```

---

## 🏭 Construir el .exe (local)

Hay un script de build listo:

```bat
build_windows_exe.bat
```

Qué hace:

* Crea un **venv** limpio.
* Instala dependencias (`requirements.txt`).
* Convierte `logo.png` a `logo.ico` si hace falta.
* Compila un **.exe portable** (one-file, windowed) con PyInstaller.

> Si preferís forzar navegador externo (sin visor embebido), abrí el `.bat` y poné `INCLUDE_WEBVIEW=0` antes de compilar.

El ejecutable queda en `dist\JobDorker.exe`.

---

## Consejos & solución de problemas

* **CAPTCHAs de Google**: reducí el ritmo de consultas, desactivá temporariamente algunas fuentes, o probá el modo **Exploración**.
* **Sin resultados**: probá quitar exclusiones, usar sinónimos del rol o cambiar “Publicado en”.
* **Visor embebido**: usa **Edge WebView2**. Si no está, JobDorker abre el navegador externo automáticamente.
* **Antivirus/SmartScreen**: es normal en binarios no firmados. Preferí el **ZIP** + verificá **SHA-256**.

---

## Privacidad

No hay login, ni backend. JobDorker **no guarda ni envía** tus datos.
Solo construye URLs de búsqueda y abre páginas en tu entorno local.

---

## Roadmap (ideas)

* Guardar presets de usuario (según feedback).
* Más fuentes por región.
* Exportar resultados / URLs.
* Banderas por país e idioma en mosaicos.
* Firma de código (para evitar advertencias de SmartScreen).

---

## Contribuir

¡PRs bienvenidos!
Abrí un **Issue** con bugs o ideas, o enviá un **Pull Request** con mejoras (UI/UX, nuevas fuentes, refactors, etc.).

---

## 🧾 Licencia

Este proyecto se publica bajo la licencia **MIT** (ver `LICENSE`).
