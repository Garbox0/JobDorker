# JobDorker 2.0 — Búsquedas avanzadas de empleo

**JobDorker** es una aplicación gratuita para organizar una búsqueda laboral estratégica y honesta. Genera *Google dorks* listos para usar en portales de empleo y sistemas ATS directos (Greenhouse, Lever, Ashby, etc.), organiza búsquedas por fuente y permite gestionar un tablero de seguimiento de postulaciones localmente con exportación a CSV, sin login ni registro.

> Creado por **Garbox0**. Disponible en dos versiones: la nueva **Web & Desktop App (React 19 + Tauri 2)** y la versión clásica **Python + Tkinter**.

---

## Ediciones de JobDorker

| Característica | Versión Web & Desktop (`web/`) | Versión Clásica (`JobDorker_MVP_v2/`) |
| :--- | :--- | :--- |
| **Tecnología** | React 19, TypeScript, Vite, Tauri 2 | Python 3.12, Tkinter, PyWebView |
| **Plataformas** | Windows Desktop (.exe / NSIS) y Web | Windows Desktop (.exe portable) |
| **Generación de dorks** | ✔ Por grupos (General, Tech, Remoto) | ✔ Filtros por fuente individual |
| **Tablero de postulaciones** | ✔ Local con filtros y exportación CSV | ✔ Guardado local en JSON |
| **Asistente IA opcional** | En desarrollo | ✔ Endpoint OpenAI-compatible |
| **Privacidad** | 100% local (`localStorage`) | 100% local (`~/.jobdorker.json`) |

---

## Funcionalidades principales

* **Generación de dorks (consultas Google estructuradas)**:
  * Portales de empleo y ATS: `inurl:careers OR inurl:jobs`, Greenhouse, Lever, Ashby, Get on Board, Wellfound, We Work Remotely, Remote OK, LinkedIn, etc.
  * Filtros por país, modalidad (*Remoto*, *Híbrido*, *Presencial*), seniority e idioma.
  * Opciones de consulta rápida (*Ver ofertas*) o ampliada (*Ver más resultados / Exploración*).
* **Mi tablero de postulaciones (local y privado)**:
  * Guardá tus postulaciones con empresa, puesto, portal, enlace, fecha y estado (*Para revisar*, *Postulé*, *Entrevista*, *Oferta*, *Cerrada*).
  * Filtro interactivo por estado.
  * **Exportación a CSV**: descargá tu planilla de seguimiento en cualquier momento.
* **Búsquedas guardadas**: volvé a consultar tus roles frecuentes con un solo clic.
* **Asistente IA opcional** (en versión Python): analiza CVs u ofertas mediante endpoints compatibles con OpenAI, sin almacenar la clave en disco y solicitando `store: false`.
* **Aporte voluntario por Ko-fi**: ninguna función depende de donar; el proyecto es 100% libre y de código abierto.

---

## Desarrollo y ejecución

### Opción A: Versión moderna Web & Desktop (`web/`)

Requiere **Node.js 20+** o **pnpm 12+**.

```powershell
cd web
pnpm install
pnpm run dev
```

* Abre la aplicación en tu navegador (por defecto `http://localhost:5173`).
* Para compilar la versión web estática: `pnpm run build`.
* Con **Rust** instalado, para ejecutar o compilar el instalador nativo de Windows:
  * Modo desarrollo: `pnpm run desktop:dev`
  * Generar instalador NSIS (.exe): `pnpm run desktop:build`

### Opción B: Versión clásica Python (`JobDorker_MVP_v2/`)

Requiere **Windows 10/11** y **Python 3.12+**.

```powershell
cd JobDorker_MVP_v2
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
python JobDorker.py
```

Para compilar el `.exe` portable de la versión Python:

```bat
build_windows_exe.bat
```

El binario se generará en `JobDorker_MVP_v2\dist\JobDorker.exe`.

---

## Pruebas unitarias

Desde la raíz del repositorio:

```bash
python -m unittest discover -s tests
```

---

## Privacidad por diseño

JobDorker no incluye telemetría intrusiva, rastreadores ni requiere registro.
- En la versión Web, los datos del tablero y las búsquedas se guardan exclusivamente en el `localStorage` de tu navegador o WebView.
- En la versión Python, las preferencias y postulaciones se guardan localmente en `~/.jobdorker.json`.
- En el módulo de IA, la clave de API solo reside en la memoria RAM durante la sesión y nunca se escribe en disco.

---

## Aportes voluntarios

JobDorker es y seguirá siendo gratuito y de código abierto. Si te resulta de ayuda en tu búsqueda y querés apoyar el proyecto:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y5Z4271CHS)

---

## Licencia

Distribuido bajo licencia **MIT**. Ver archivo `LICENSE` para más detalles.
