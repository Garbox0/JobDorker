#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JobDorker – Búsquedas avanzadas de empleo · by Garbox0
"""

import sys
import os
import json
import tkinter as tk
from tkinter import ttk, messagebox
import webbrowser
import subprocess
from urllib.parse import quote_plus, urlparse

APP_TITLE = "JobDorker – Búsquedas avanzadas de empleo (MVP v4.19) · Garbox0"
CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".jobdorker.json")

# ---------- visor embebido ----------
def _run_viewer(url: str):
    try:
        import webview
    except Exception:
        webbrowser.open_new_tab(url); return
    try:
        webview.create_window("JobDorker – Visor", url)
        webview.start()
    except Exception:
        webbrowser.open_new_tab(url)

if "--viewer" in sys.argv:
    try:
        i = sys.argv.index("--viewer")
        u = sys.argv[i + 1] if i + 1 < len(sys.argv) else "about:blank"
    except Exception:
        u = "about:blank"
    _run_viewer(u); sys.exit(0)

# ---------- helpers para LOGO ----------
def _find_logo_path():
    """Busca un archivo de logo en el directorio del script."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        "logo.png", "logo.jpg", "logo.jpeg", "logo.webp", "logo.gif",
        "Red_Fort.png", "Red_Fort.jpg", "Red_Fort.jpeg", "Red_Fort.webp",
        "Red_Fort.jfif", "Red_Fort.jfif.png"
    ]
    for name in candidates:
        p = os.path.join(here, name)
        if os.path.exists(p):
            return p
    return None

def _load_logo_image(path, target_h=28):
    """
    Devuelve un PhotoImage reescalado a target_h px de alto.
    - Si hay Pillow, reescala con LANCZOS.
    - Sin Pillow, usa PhotoImage.subsample() (entero) para no depender de PIL.
    """
    if not path:
        return None

    # Intento con Pillow (mejor calidad)
    try:
        from PIL import Image, ImageTk
        img = Image.open(path).convert("RGBA")
        ratio = target_h / max(1, img.height)
        new_w = max(1, int(img.width * ratio))
        img = img.resize((new_w, target_h), Image.LANCZOS)
        return ImageTk.PhotoImage(img)
    except Exception:
        pass

    # Fallback sin Pillow
    try:
        raw = tk.PhotoImage(file=path)
        h = max(1, raw.height())
        factor = max(1, int(round(h / float(target_h))))
        scaled = raw.subsample(factor, factor)
        scaled._keep = raw
        return scaled
    except Exception:
        return None

# ---------- datos base ----------
CURRENCIES = ["USD","EUR","GBP","ARS","BRL","CLP","MXN","COP","PEN","UYU","CAD","AUD","CHF","JPY","CNY","INR"]
INDUSTRIES = [
    "IT / Tecnología","Ciencia de Datos","Ciberseguridad","Desarrollo de Software","Soporte Técnico",
    "DevOps / SRE","Redes / Infraestructura","QA / Testing","Análisis de Negocio","Marketing Digital",
    "Ventas","Finanzas / Contabilidad","Legal","Salud / Healthcare","Educación","Manufactura","Operaciones",
    "Producto","Diseño / UX","RRHH / Recruiting","Atención al Cliente","Logística / Supply Chain",
    "Energía / Petróleo y Gas","Gobierno","ONG / Social",
]
LOCATIONS = ["Remoto","Argentina","Bolivia","Brasil","Chile","Colombia","Costa Rica","Cuba","República Dominicana",
             "Ecuador","El Salvador","Guatemala","Honduras","México","Nicaragua","Panamá","Paraguay","Perú",
             "Uruguay","Venezuela","Estados Unidos"]
COUNTRY_TLD = {"Argentina":"ar","Bolivia":"bo","Brasil":"br","Chile":"cl","Colombia":"co","Costa Rica":"cr","Cuba":"cu",
               "República Dominicana":"do","Ecuador":"ec","El Salvador":"sv","Guatemala":"gt","Honduras":"hn","México":"mx",
               "Nicaragua":"ni","Panamá":"pa","Paraguay":"py","Perú":"pe","Uruguay":"uy","Venezuela":"ve"}
SENIORITY_MAP = {
    "Cualquiera": [], "Trainee": ['"trainee"','"aprendiz"','"entry level"'],
    "Junior": ['"junior"','"jr"','"jr."','"entry"'],
    "Semi Senior": ['"semi senior"','"ssr"','"semi-senior"','"mid level"','"mid-level"','"mid"'],
    "Senior": ['"senior"','"sr"','"sr."','"senior+"'],
    "Lead": ['"lead"','"líder"','"staff"','"principal"'],
}
LANGUAGE_MAP = {"Cualquiera": [], "Español": ['"español"','"spanish"'], "Inglés": ['"inglés"','"english"'], "Portugués": ['"portugués"','"portuguese"']}
LANG_TO_GOOGLE = {"Español": ("lang_es","es"), "Inglés": ("lang_en","en"), "Portugués": ("lang_pt","pt")}
MODALITY_MAP = {"Cualquiera": [], "Remoto": ['"remoto"','"remote"'], "Híbrido": ['"híbrido"','"hybrid"'], "Presencial": ['"presencial"','"onsite"','"on-site"']}
PUBLISHED_LABELS = ["Cualquiera","Últimas 24 h","Última semana","Último mes","Último año"]
RECENCY_TO_TBS   = {"Cualquiera":"", "Últimas 24 h":"qdr:d", "Última semana":"qdr:w", "Último mes":"qdr:m", "Último año":"qdr:y"}

JOB_BOARDS = [
    ("Google – General (careers/jobs)",'(inurl:careers OR inurl:jobs)'),
    ("LinkedIn Jobs","site:linkedin.com/jobs"),
    ("Greenhouse","site:boards.greenhouse.io"),
    ("Lever","site:jobs.lever.co"),
    ("Ashby","site:jobs.ashbyhq.com"),
    ("SmartRecruiters","site:smartrecruiters.com"),
    ("Workday","site:workdayjobs.com OR site:myworkdayjobs.com"),
    ("Get on Board","site:getonbrd.com"),
    ("Bumeran","site:bumeran.com.ar"),
    ("Zonajobs","site:zonajobs.com.ar"),
    ("Computrabajo","site:ar.computrabajo.com"),
    ("Indeed","site:ar.indeed.com"),
    ("Glassdoor","site:glassdoor.com"),
]

ROLE_PRESETS = {
    "—": "",
    "Soporte Técnico": '"soporte técnico" OR "help desk" OR "service desk" OR "mesa de ayuda" OR "it support"',
    "DevOps / SRE": 'devops OR "site reliability" OR sre OR "platform engineer"',
    "QA / Testing": 'qa OR "quality assurance" OR testing OR "test engineer"',
    "Data (Analyst/Engineer/Science)": '"data analyst" OR "data engineer" OR "data scientist" OR analytics',
    "SysAdmin": '"system administrator" OR sysadmin OR "linux admin" OR "windows admin"',
    "NOC": 'noc OR "network operations center" OR monitoring',
    "Frontend": 'frontend OR "front-end" OR "front end"',
    "Backend": 'backend OR "back-end" OR "back end"',
    "Ciberseguridad": 'cybersecurity OR ciberseguridad OR infosec OR "security analyst"',
}

PREDICTIVE_FILTERS = [
    "site:boards.greenhouse.io","site:jobs.lever.co","site:jobs.ashbyhq.com",
    "site:smartrecruiters.com","site:workdayjobs.com OR site:myworkdayjobs.com",
    "site:getonbrd.com","inurl:careers","inurl:jobs","site:glassdoor.com",
    "site:linkedin.com/jobs","site:jobvite.com","site:jobs.jobvite.com",
]

# ---------- helpers de query ----------
def _is_advanced_expr(text: str) -> bool:
    t = (text or "").lower()
    return any(x in t for x in [' or ', '"', '(', ')'])

def role_variants(text: str):
    text = (text or "").strip()
    if not text: return []
    if _is_advanced_expr(text): return [text]
    v = set([f'"{text}"', text])
    low = text.lower()
    if "soporte" in low or "help" in low or "service desk" in low:
        v.update(['"soporte técnico"','"help desk"','"service desk"','"mesa de ayuda"','"it support"'])
    if "devops" in low: v.update(['"devops"','"sre"','"site reliability"','"platform engineer"'])
    if "frontend" in low or "front end" in low: v.update(['"frontend"','"front-end"','"front end"'])
    if "backend" in low or "back end" in low: v.update(['"backend"','"back-end"','"back end"'])
    if "data" in low: v.update(['"data engineer"','"data analyst"','"data scientist"','"analytics"'])
    if "seguridad" in low or "security" in low: v.update(['"security"','"cybersecurity"','"ciberseguridad"','"infosec"'])
    return sorted(v)

def area_tokens(area: str):
    a = (area or "").strip()
    if not a: return []
    a = a.replace("/", " ").replace("  ", " ")
    return ['"{}"'.format(w) for w in a.split() if w.strip()]

def location_booster(country: str):
    if not country or country == "Remoto": return []
    items = [f'"{country}"']; tld = COUNTRY_TLD.get(country)
    if tld: items.append(f"site:.{tld}")
    return ["(" + " OR ".join(items) + ")"]

def compose_tokens(rol, area, seniority, idioma, ubicacion, modalidad,
                   excluir_practicas, incluir_salario, moneda, modo_exploracion=False):
    tokens = []
    rv = role_variants(rol)
    if rv: tokens.append("(" + " OR ".join(rv) + ")")
    at = area_tokens(area)
    if at: tokens.append("(" + " OR ".join(at) + ")")
    if not modo_exploracion and seniority != "Cualquiera": tokens.append("(" + " OR ".join(SENIORITY_MAP[seniority]) + ")")
    if not modo_exploracion and idioma != "Cualquiera": tokens.append("(" + " OR ".join(LANGUAGE_MAP[idioma]) + ")")
    tokens += location_booster(ubicacion)
    if modalidad != "Cualquiera": tokens.append("(" + " OR ".join(MODALITY_MAP[modalidad]) + ")")
    if incluir_salario and moneda: tokens.append(f'("{moneda}" OR "sueldo" OR "salario")')
    if excluir_practicas:
        tokens += (['-internship'] if modo_exploracion else ['-prácticas','-pasantía','-internship','-voluntariado','-"sin remuneración"','-"unpaid"'])
    return tokens

def build_google_url(query_text: str, idioma: str, published: str) -> str:
    url = "https://www.google.com/search?q={}".format(quote_plus(query_text))
    lr, hl = ("","")
    if idioma in LANG_TO_GOOGLE: lr, hl = LANG_TO_GOOGLE[idioma]
    if lr: url += "&lr={}".format(lr)
    if hl: url += "&hl={}".format(hl)
    tbs = RECENCY_TO_TBS.get(published,"")
    if tbs: url += "&tbs={}".format(tbs)
    return url

def build_dorks(rol, area, seniority, idioma, ubicacion, modalidad, published,
                excluir_practicas, incluir_salario, moneda, modo_exploracion, boards):
    token_str = " ".join(compose_tokens(rol, area, seniority, idioma, ubicacion, modalidad,
                                        excluir_practicas, incluir_salario, moneda, modo_exploracion)).strip()
    dorks = []
    for label, site_filter in boards:
        q = (site_filter + " " + token_str).strip()
        url = build_google_url(q, idioma, published)
        dorks.append((label, q, url))
    return dorks

# ---------- combobox con autocompletado ----------
class AutoCompleteCombobox(ttk.Combobox):
    def __init__(self, master=None, **kwargs):
        values = kwargs.get("values", [])
        super().__init__(master, **kwargs)
        self._base_values = list(values)
        self._var = self["textvariable"] if "textvariable" in self.keys() else tk.StringVar()
        self.configure(textvariable=self._var)
        self.bind("<KeyRelease>", self._on_keyrelease)

    def _on_keyrelease(self, event):
        if event.keysym in ("Up","Down","Right","Left","Return","Escape","Tab"): return
        typed = self.get().lower()
        self["values"] = self._base_values if not typed else [v for v in self._base_values if typed in v.lower()]
        if self["values"]: self.event_generate("<Down>")

# ---------- Tooltips ----------
class Tooltip:
    def __init__(self, widget, text, delay=450):
        self.widget, self.text, self.delay = widget, text, delay
        self.tip, self.after_id = None, None
        widget.bind("<Enter>", self._schedule)
        widget.bind("<Leave>", self._hide)
    def _schedule(self, _):
        self.after_id = self.widget.after(self.delay, self._show)
    def _show(self):
        if self.tip: return
        try:
            x, y, cx, cy = self.widget.bbox("insert")
        except Exception:
            x = y = 0
        x += self.widget.winfo_rootx() + 16
        y += self.widget.winfo_rooty() + 24
        self.tip = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.wm_geometry(f"+{x}+{y}")
        frm = ttk.Frame(tw, style="Tip.TFrame", padding=(8,6))
        frm.pack()
        ttk.Label(frm, text=self.text, style="Tip.TLabel").pack()
    def _hide(self, _=None):
        if self.after_id: self.widget.after_cancel(self.after_id); self.after_id=None
        if self.tip: self.tip.destroy(); self.tip=None

# ---------- utils color ----------
def _hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2],16) for i in (0,2,4))
def _rgb_to_hex(r,g,b):
    return "#{:02x}{:02x}{:02x}".format(max(0,min(255,r)),max(0,min(255,g)),max(0,min(255,b)))
def _shade_hex(hex_color, factor=0.9):
    r,g,b = _hex_to_rgb(hex_color)
    return _rgb_to_hex(int(r*factor), int(g*factor), int(b*factor))

# ---------- app ----------
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self._theme_name = "dark"
        self._accent_name = "Azul"
        self._accent_options = {
            "Azul": "#2563eb",
            "Violeta": "#7c3aed",
            "Verde": "#059669",
            "Naranja": "#ea580c",
            "Rojo": "#dc2626",   # nuevo para combinar con el logo
        }
        self._custom_boards = []
        self._current_dorks = []
        self._cards_cols = 0
        self._custom_expanded = False
        self._active_view = "dorks"
        self._wheel_target = None
        self._has_run = False  # chips ocultos hasta ejecutar
        self._logo_image = None

        self._setup_theme("dark")
        self._build_ui()
        self._set_initial_geometry()
        self._load_config()
        self.bind("<Configure>", self._on_resize)

        # Atajos
        self.bind_all("<Control-Return>", lambda e: self.on_generar())
        self.bind_all("<Control-Shift-W>", lambda e: self.on_buscar())
        self.bind_all("<Control-l>", lambda e: self.on_clear())

    # ----- tema -----
    def _setup_theme(self, name="dark"):
        self._theme_name = name
        if name == "light":
            bg = "#f5f7fb"; fg = "#0f172a"; accent = self._accent_options.get(self._accent_name, "#2563eb")
            muted = "#475569"; panel = "#ffffff"; preview_bg = "#eef2ff"
            badge_bg = "#e2e8f0"; chip_bg = "#f1f5f9"; entry_bg = "#ffffff"; combo_bg = "#ffffff"; sel_bg = "#e5e7eb"
            ph_fg = "#64748b"; arrow_fg = "#334155"
        else:
            bg = "#0f1115"; fg = "#e5e7eb"; accent = self._accent_options.get(self._accent_name, "#2563eb")
            muted = "#9ca3af"; panel = "#101826"; preview_bg = "#0b1220"
            badge_bg = "#1e293b"; chip_bg = "#111827"; entry_bg = "#0b1220"; combo_bg = "#0b1220"; sel_bg = "#1f2937"
            ph_fg = "#94a3b8"; arrow_fg = "#cbd5e1"
        self.configure(bg=bg)
        st = ttk.Style()
        try: st.theme_use("clam")
        except Exception: pass

        # base
        st.configure(".", background=bg, foreground=fg)
        st.configure("Panel.TFrame", background=panel)
        st.configure("TLabel", background=bg, foreground=fg)
        st.configure("Title.TLabel", background=bg, foreground=fg, font=("Segoe UI", 11, "bold"))
        st.configure("Muted.TLabel", background=bg, foreground=muted)
        st.configure("Card.TFrame", background=panel, relief="ridge", borderwidth=1, padding=14)
        st.configure("CardHover.TFrame", background=panel, relief="raised", borderwidth=2, padding=14)
        st.configure("Preview.TLabel", background=preview_bg, foreground=fg, padding=8, relief="solid", borderwidth=1)
        st.configure("Code.TLabel", background=preview_bg, foreground=fg, padding=8, relief="solid", borderwidth=1, font=("Consolas", 10))
        st.configure("Badge.TLabel", background=badge_bg, foreground=("#1f2937" if name=="light" else "#c7d2fe"), padding=(8,2), font=("Segoe UI", 9, "bold"))
        st.configure("Chip.TLabel", background=chip_bg, foreground=("#475569" if name=="light" else "#9ca3af"), padding=(8,2))

        # Primary con color de acento
        st.configure("Primary.TButton", padding=8, background=accent, foreground="white", relief="flat")
        st.map("Primary.TButton",
               background=[("active", _shade_hex(accent,0.85)),("pressed", _shade_hex(accent,0.75))],
               foreground=[("active","white"),("pressed","white")])

        # Secondary visible
        st.configure("Secondary.TButton", padding=8, background=panel, foreground=fg, relief="solid", borderwidth=1)
        st.map("Secondary.TButton", background=[("active", sel_bg), ("pressed", sel_bg)], foreground=[("active", fg), ("pressed", fg)])

        # Tooltips
        st.configure("Tip.TFrame", background="#111827")
        st.configure("Tip.TLabel", background="#111827", foreground="#e5e7eb", font=("Segoe UI", 9))

        # Entrada y Combobox (flecha visible)
        st.configure("App.TEntry", fieldbackground=entry_bg, foreground=fg)
        st.configure("App.TCombobox",
                    fieldbackground=combo_bg, background=combo_bg,
                    foreground=fg, selectbackground=sel_bg, selectforeground=fg,
                    arrowsize=14)
        st.map("App.TCombobox",
               fieldbackground=[("readonly", combo_bg), ("!disabled", combo_bg)],
               foreground=[("readonly", fg), ("!disabled", fg)],
               selectbackground=[("!disabled", sel_bg)],
               selectforeground=[("!disabled", fg)],
               arrowcolor=[("readonly", arrow_fg), ("!disabled", arrow_fg), ("active", arrow_fg)])

        # Scrollbars
        st.configure("Vertical.TScrollbar", background=sel_bg, troughcolor=bg, bordercolor=bg, lightcolor=sel_bg, darkcolor=sel_bg, arrowcolor=arrow_fg)
        st.configure("Horizontal.TScrollbar", background=sel_bg, troughcolor=bg, bordercolor=bg, lightcolor=sel_bg, darkcolor=sel_bg, arrowcolor=arrow_fg)

        # **CHECKBUTTONS** (fix hover/active blanco)
        st.configure("App.TCheckbutton", background=panel, foreground=fg)
        st.map("App.TCheckbutton",
               background=[("active", panel), ("selected", panel), ("pressed", panel)],
               foreground=[("active", fg), ("selected", fg), ("pressed", fg)])

        self._palette = {"bg":bg,"fg":fg,"panel":panel,"preview_bg":preview_bg,
                         "entry_bg":entry_bg,"combo_bg":combo_bg,"ph_fg":ph_fg}

        if hasattr(self, "dorks_canvas"): self._style_canvas(self.dorks_canvas)
        if hasattr(self, "cards_canvas"): self._style_canvas(self.cards_canvas)

        if hasattr(self, "_ph_active") and hasattr(self, "ent_rol"):
            if self._ph_active:
                try: self.ent_rol.configure(foreground=ph_fg)
                except Exception: pass

    def _style_canvas(self, canvas: tk.Canvas):
        canvas.configure(background=self._palette["bg"], highlightthickness=0, borderwidth=0)

    def _set_initial_geometry(self):
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        w = min(max(int(sw*0.78), 1020), int(sw*0.90))
        h = min(max(int(sh*0.84), 740), int(sh*0.88))
        x = (sw - w)//2; y = (sh - h)//2
        self.geometry(f"{w}x{h}+{x}+{y}"); self.minsize(920, 720)

    # ----- config JSON -----
    def _load_config(self):
        try:
            if os.path.exists(CONFIG_PATH):
                with open(CONFIG_PATH, "r", encoding="utf-8") as f: data = json.load(f)
                self._custom_boards = data.get("custom_boards", [])
                self._accent_name = data.get("accent","Azul")
                if data.get("theme","dark") != self._theme_name: self._setup_theme(data.get("theme"))
                if hasattr(self, "cmb_accent"):
                    try: self.cmb_accent.set(self._accent_name)
                    except Exception: pass
                self.lst_boards.delete(0,"end")
                for lbl, filt in self._custom_boards: self.lst_boards.insert("end", f"{lbl}  —  {filt}")
        except Exception: pass

    def _save_config(self):
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump({"custom_boards": self._custom_boards, "theme": self._theme_name, "accent": self._accent_name}, f, ensure_ascii=False, indent=2)
        except Exception: pass

    # ----- UI -----
    def _build_ui(self):
        pad = {"padx": 10, "pady": 6}

        # Header
        header = ttk.Frame(self, style="Panel.TFrame"); header.pack(fill="x")

        # LOGO a la izquierda
        logo_path = _find_logo_path()
        self._logo_image = _load_logo_image(logo_path, target_h=28)
        if self._logo_image:
            tk.Label(header, image=self._logo_image, bg=self._palette["bg"]).pack(side="left", padx=(10,6), pady=8)

        ttk.Label(header, text="JobDorker", style="Title.TLabel").pack(side="left", padx=(2,0), pady=10)
        ttk.Label(header, text="by Garbox0", style="Muted.TLabel").pack(side="left", padx=(8,0), pady=10)

        right = ttk.Frame(header, style="Panel.TFrame"); right.pack(side="right", padx=12)
        ttk.Label(right, text="Tema").pack(side="left", padx=(0,6))
        self.theme_var = tk.StringVar(value="Oscuro")
        theme_box = ttk.Combobox(right, state="readonly", values=["Oscuro","Claro"], textvariable=self.theme_var, width=8, style="App.TCombobox")
        theme_box.pack(side="left", padx=(0,12)); theme_box.bind("<<ComboboxSelected>>", self._on_theme_change)
        ttk.Label(right, text="Acento").pack(side="left", padx=(0,6))
        self.cmb_accent = ttk.Combobox(right, state="readonly", values=list(self._accent_options.keys()), width=9, style="App.TCombobox")
        self.cmb_accent.set(self._accent_name)
        self.cmb_accent.pack(side="left"); self.cmb_accent.bind("<<ComboboxSelected>>", self._on_accent_change)

        frm = ttk.Frame(self); frm.pack(fill="both", expand=True)

        # ---- FILTROS ----
        r = 0
        ttk.Label(frm, text="FILTROS BÁSICOS", style="Muted.TLabel").grid(row=r, column=0, columnspan=4, sticky="w", padx=10, pady=(8,0)); r+=1

        ttk.Label(frm, text="Rol (obligatorio)").grid(row=r, column=0, sticky="w", **pad)
        self.ent_rol = ttk.Entry(frm, style="App.TEntry", width=36)
        self.ent_rol.grid(row=r, column=1, sticky="we", **pad)
        self._install_placeholder(self.ent_rol, "Ej.: \"soporte técnico\" OR \"help desk\" OR \"service desk\"", color=self._palette["ph_fg"])
        ttk.Label(frm, text="Preset de rol").grid(row=r, column=2, sticky="w", **pad)
        self.cmb_preset = ttk.Combobox(frm, state="readonly", values=list(ROLE_PRESETS.keys()), style="App.TCombobox")
        self.cmb_preset.current(0); self.cmb_preset.grid(row=r, column=3, sticky="we", **pad)
        self.cmb_preset.bind("<<ComboboxSelected>>", self._apply_preset); r+=1

        ttk.Label(frm, text="Área / Industria").grid(row=r, column=0, sticky="w", **pad)
        self.cmb_area = AutoCompleteCombobox(frm, state="normal", values=INDUSTRIES, style="App.TCombobox")
        self.cmb_area.grid(row=r, column=1, sticky="we", **pad)
        ttk.Label(frm, text="Seniority").grid(row=r, column=2, sticky="w", **pad)
        self.cmb_seniority = ttk.Combobox(frm, state="readonly", values=list(SENIORITY_MAP.keys()), style="App.TCombobox")
        self.cmb_seniority.current(0); self.cmb_seniority.grid(row=r, column=3, sticky="we", **pad); r+=1

        ttk.Label(frm, text="Idioma").grid(row=r, column=0, sticky="w", **pad)
        self.cmb_idioma = ttk.Combobox(frm, state="readonly", values=list(LANGUAGE_MAP.keys()), style="App.TCombobox")
        self.cmb_idioma.current(1); self.cmb_idioma.grid(row=r, column=1, sticky="we", **pad)
        ttk.Label(frm, text="Ubicación (país)").grid(row=r, column=2, sticky="w", **pad)
        self.cmb_ubic = AutoCompleteCombobox(frm, state="normal", values=LOCATIONS, style="App.TCombobox")
        self.cmb_ubic.set("Argentina"); self.cmb_ubic.grid(row=r, column=3, sticky="we", **pad); r+=1

        sep1 = ttk.Separator(frm, orient="horizontal"); sep1.grid(row=r, column=0, columnspan=4, sticky="we", padx=10, pady=(0,4)); r+=1

        # Subfiltros
        filtros2 = ttk.Frame(frm, style="Panel.TFrame")
        filtros2.grid(row=r, column=0, columnspan=4, sticky="we", padx=10, pady=(2,6))
        ttk.Label(filtros2, text="Modalidad").grid(row=0, column=0, sticky="w", padx=(0,6))
        self.cmb_modalidad = ttk.Combobox(filtros2, state="readonly", values=list(MODALITY_MAP.keys()), width=18, style="App.TCombobox")
        self.cmb_modalidad.current(0); self.cmb_modalidad.grid(row=0, column=1, sticky="w", padx=(0,18))
        ttk.Label(filtros2, text="Publicado en").grid(row=0, column=2, sticky="w", padx=(0,6))
        self.cmb_published = ttk.Combobox(filtros2, state="readonly", values=PUBLISHED_LABELS, width=18, style="App.TCombobox")
        self.cmb_published.current(0); self.cmb_published.grid(row=0, column=3, sticky="w")

        r+=1
        opt = ttk.Frame(frm, style="Panel.TFrame")
        opt.grid(row=r, column=0, columnspan=4, sticky="we", padx=10, pady=(2,6))

        self.var_excluir = tk.BooleanVar(value=True)
        chk_ex = ttk.Checkbutton(opt, text="Excluir prácticas / pasantías", variable=self.var_excluir, style="App.TCheckbutton")
        chk_ex.grid(row=0, column=0, sticky="w", padx=(0,10))

        self.var_salario = tk.BooleanVar(value=False)
        chk_sal = ttk.Checkbutton(opt, text="Incluir pistas de salario", variable=self.var_salario, command=self._toggle_currency, style="App.TCheckbutton")
        chk_sal.grid(row=0, column=2, sticky="w", padx=(10,4))

        self.lbl_moneda = ttk.Label(opt, text="Moneda")
        self.cmb_moneda = AutoCompleteCombobox(opt, state="readonly", values=CURRENCIES, style="App.TCombobox"); self.cmb_moneda.set("USD")

        self.var_explore = tk.BooleanVar(value=True)
        chk_explore = ttk.Checkbutton(opt, text="Modo exploración (menos estricto)", variable=self.var_explore, style="App.TCheckbutton")
        chk_explore.grid(row=0, column=6, sticky="e", padx=(10,0))

        r+=1
        sep2 = ttk.Separator(frm, orient="horizontal"); sep2.grid(row=r, column=0, columnspan=4, sticky="we", padx=10, pady=(2,8)); r+=1
        ttk.Label(frm, text="ACCIONES", style="Muted.TLabel").grid(row=r, column=0, columnspan=4, sticky="w", padx=10, pady=(0,0)); r+=1

        # Acciones
        btns = ttk.Frame(frm, style="Panel.TFrame")
        btns.grid(row=r, column=0, columnspan=4, sticky="we", padx=10, pady=(0,8))
        for c in range(3): btns.columnconfigure(c, weight=1)
        b1 = ttk.Button(btns, text="🧠  Generar dorks", style="Primary.TButton", command=self.on_generar)
        b2 = ttk.Button(btns, text="🧭  Búsqueda web (mosaicos)", style="Primary.TButton", command=self.on_buscar)
        b3 = ttk.Button(btns, text="🧽  Limpiar formulario", style="Secondary.TButton", command=self.on_clear)
        b1.grid(row=0, column=0, sticky="we", padx=8, pady=8); b2.grid(row=0, column=1, sticky="we", padx=8, pady=8); b3.grid(row=0, column=2, sticky="we", padx=8, pady=8)
        for btn in (b1,b2,b3):
            btn.bind("<Enter>", lambda e, w=btn: w.configure(cursor="hand2"))
            btn.bind("<Leave>", lambda e, w=btn: w.configure(cursor=""))

        r+=1

        # Resumen chips
        self.summary = ttk.Frame(frm, style="Panel.TFrame")
        self.summary.grid(row=r, column=0, columnspan=4, sticky="we", padx=10, pady=(0,6))
        self._render_summary()
        r+=1

        # Acordeón portales personalizados
        toggle = ttk.Frame(frm, style="Panel.TFrame")
        toggle.grid(row=r, column=0, columnspan=4, sticky="we", padx=10, pady=(2,4))
        self.btn_custom_toggle = ttk.Button(toggle, text="▸ Portales personalizados", style="Secondary.TButton", command=self._toggle_custom)
        self.btn_custom_toggle.pack(side="left")
        r+=1

        self.custom = ttk.Frame(frm, style="Panel.TFrame")
        for c in range(6): self.custom.columnconfigure(c, weight=(0 if c<4 else 1))
        ttk.Label(self.custom, text="Nombre").grid(row=0, column=0, sticky="w", padx=(6,4), pady=(2,0))
        self.ent_board_name = ttk.Entry(self.custom, style="App.TEntry", width=24); self.ent_board_name.grid(row=0, column=1, sticky="w", padx=(0,14), pady=(2,0))
        ttk.Label(self.custom, text="Filtro / URL").grid(row=0, column=2, sticky="w", pady=(2,0))
        self.cmb_board_filter = AutoCompleteCombobox(self.custom, state="normal", values=PREDICTIVE_FILTERS, style="App.TCombobox")
        self.cmb_board_filter.grid(row=0, column=3, columnspan=2, sticky="we", padx=(0,14), pady=(2,0))
        addb = ttk.Button(self.custom, text="Agregar", style="Secondary.TButton", command=self.on_add_board)
        addb.grid(row=0, column=5, sticky="e", pady=(2,0))
        addb.bind("<Enter>", lambda e, w=addb: w.configure(cursor="hand2")); addb.bind("<Leave>", lambda e, w=addb: w.configure(cursor=""))
        self.lbl_preview = ttk.Label(self.custom, text="", style="Muted.TLabel"); self.lbl_preview.grid(row=1, column=0, columnspan=6, sticky="w", padx=(6,14), pady=(2,2))
        self.lst_boards = tk.Listbox(self.custom, height=3, bg=self._palette["entry_bg"], fg=self._palette["fg"], selectbackground="#1f2937", relief="flat")
        self.lst_boards.grid(row=2, column=0, columnspan=5, sticky="we", padx=(6,14), pady=(8,4))
        delb = ttk.Button(self.custom, text="Quitar seleccionado", style="Secondary.TButton", command=self.on_remove_board)
        delb.grid(row=2, column=5, sticky="e")
        delb.bind("<Enter>", lambda e, w=delb: w.configure(cursor="hand2")); delb.bind("<Leave>", lambda e, w=delb: w.configure(cursor=""))

        def on_filter_change(*_):
            self.lbl_preview.configure(text=self._preview_board(self.cmb_board_filter.get().strip(), self.ent_board_name.get().strip()))
        self.cmb_board_filter.bind("<<ComboboxSelected>>", on_filter_change)
        self.cmb_board_filter.bind("<KeyRelease>", on_filter_change)
        self.ent_board_name.bind("<KeyRelease>", on_filter_change)

        # Panel Dorks
        self.dorks_row = r+1
        self.panel_dorks = ttk.Frame(frm, style="Panel.TFrame")
        self.panel_dorks.grid(row=self.dorks_row, column=0, columnspan=4, sticky="nsew", padx=10, pady=(0,10))
        self.dorks_bar = ttk.Frame(self.panel_dorks, style="Panel.TFrame")
        self.dorks_bar.grid(row=0, column=0, columnspan=2, sticky="we")
        self.lbl_count_dorks = ttk.Label(self.dorks_bar, text="Fuentes: 0", style="Muted.TLabel")
        self.lbl_count_dorks.pack(side="left", padx=(4,0), pady=(4,0))
        self.dorks_canvas = tk.Canvas(self.panel_dorks, height=360, background=self._palette["bg"], highlightthickness=0, borderwidth=0)
        self.dorks_frame = ttk.Frame(self.dorks_canvas, style="Panel.TFrame")
        self.dorks_scroll_y = ttk.Scrollbar(self.panel_dorks, orient="vertical", command=self.dorks_canvas.yview)
        self.dorks_canvas.configure(yscrollcommand=self.dorks_scroll_y.set)
        self.dorks_canvas.grid(row=1, column=0, sticky="nsew"); self.dorks_scroll_y.grid(row=1, column=1, sticky="ns")
        self.panel_dorks.columnconfigure(0, weight=1); self.panel_dorks.rowconfigure(1, weight=1)
        self.dorks_window = self.dorks_canvas.create_window((0,0), window=self.dorks_frame, anchor="nw")
        self.empty_dorks = ttk.Label(self.panel_dorks, text="💡 Generá dorks para ver resultados aquí.", style="Muted.TLabel")
        self.empty_dorks.place(relx=0.5, rely=0.5, anchor="center")

        # Panel Web
        self.web_row = self.dorks_row + 1
        self.panel_web = ttk.Frame(frm, style="Panel.TFrame")
        self.panel_web.grid(row=self.web_row, column=0, columnspan=4, sticky="nsew", padx=10, pady=(0,10))
        self.web_bar = ttk.Frame(self.panel_web, style="Panel.TFrame")
        self.web_bar.grid(row=0, column=0, columnspan=2, sticky="we")
        self.lbl_count_web = ttk.Label(self.web_bar, text="Fuentes: 0", style="Muted.TLabel")
        self.lbl_count_web.pack(side="left", padx=(4,0), pady=(4,0))
        self.cards_canvas = tk.Canvas(self.panel_web, height=340, background=self._palette["bg"], highlightthickness=0, borderwidth=0)
        self.cards_frame = ttk.Frame(self.cards_canvas, style="Panel.TFrame")
        self.scroll_y = ttk.Scrollbar(self.panel_web, orient="vertical", command=self.cards_canvas.yview)
        self.cards_canvas.configure(yscrollcommand=self.scroll_y.set)
        self.cards_canvas.grid(row=1, column=0, sticky="nsew"); self.scroll_y.grid(row=1, column=1, sticky="ns")
        self.panel_web.columnconfigure(0, weight=1); self.panel_web.rowconfigure(1, weight=1)
        self.cards_window = self.cards_canvas.create_window((0,0), window=self.cards_frame, anchor="nw")
        self.empty_web = ttk.Label(self.panel_web, text="🔎 Ejecutá 'Búsqueda web (mosaicos)'.", style="Muted.TLabel")
        self.empty_web.place(relx=0.5, rely=0.5, anchor="center")

        # scroll contextual
        self._install_wheel_context(self.cards_canvas, self.cards_frame)
        self._install_wheel_context(self.dorks_canvas, self.dorks_frame)
        self.cards_frame.bind("<Configure>", lambda e: self.cards_canvas.configure(scrollregion=self.cards_canvas.bbox("all")))
        self.dorks_frame.bind("<Configure>", lambda e: self.dorks_canvas.configure(scrollregion=self.dorks_canvas.bbox("all")))

        frm.rowconfigure(self.dorks_row, weight=2)
        frm.rowconfigure(self.web_row, weight=3)
        for c in range(4): frm.columnconfigure(c, weight=1)

        self.custom.grid_remove()
        self._toggle_currency()
        self._show_dorks()

        # Barra de estado
        status = ttk.Frame(self, style="Panel.TFrame"); status.pack(fill="x", side="bottom")
        self.status_left = ttk.Label(status, text="Listo", style="Muted.TLabel"); self.status_left.pack(side="left", padx=10, pady=4)
        ttk.Label(status, text="·", style="Muted.TLabel").pack(side="left", padx=4)
        ttk.Label(status, text="v4.19 · by Garbox0", style="Muted.TLabel").pack(side="left")
        self.status_right = ttk.Label(status, text="", style="Muted.TLabel"); self.status_right.pack(side="right", padx=10)

    # ----- placeholder -----
    def _install_placeholder(self, entry: ttk.Entry, text: str, color="#94a3b8"):
        self._ph_text = text
        self._ph_color = color
        self._ph_normal = self._palette["fg"]
        self._ph_active = True
        def put():
            try:
                entry.delete(0, "end"); entry.insert(0, self._ph_text)
                entry.configure(foreground=self._ph_color); self._ph_active = True
            except Exception: pass
        def focus_in(_):
            if self._ph_active:
                try:
                    entry.delete(0, "end"); entry.configure(foreground=self._ph_normal); self._ph_active=False
                except Exception: pass
        def focus_out(_):
            if not entry.get().strip(): put()
        entry.bind("<FocusIn>", focus_in); entry.bind("<FocusOut>", focus_out); put()

    # ----- wheel contextual -----
    def _install_wheel_context(self, canvas: tk.Canvas, content: ttk.Frame):
        def bind_all_for(cnv):
            self._wheel_target = cnv
            self.bind_all("<MouseWheel>", self._on_global_wheel)
            self.bind_all("<Button-4>", self._on_global_wheel)
            self.bind_all("<Button-5>", self._on_global_wheel)
        def unbind_all():
            self.unbind_all("<MouseWheel>"); self.unbind_all("<Button-4>"); self.unbind_all("<Button-5>")
            self._wheel_target = None
        for w in (canvas, content):
            w.bind("<Enter>", lambda e, c=canvas: bind_all_for(c))
            w.bind("<Leave>", lambda e: unbind_all())

    def _on_global_wheel(self, event):
        cnv = self._wheel_target
        if not cnv: return
        delta = (-1*(event.delta//120)) if getattr(event, "delta", 0) else (1 if getattr(event,"num",0)==5 else -1)
        cnv.yview_scroll(delta, "units")

    # ----- mostrar/ocultar moneda -----
    def _toggle_currency(self):
        if self.var_salario.get():
            self.lbl_moneda.grid(row=0, column=3, sticky="e", padx=(6,6))
            self.cmb_moneda.grid(row=0, column=4, sticky="we"); self.cmb_moneda.configure(state="readonly")
        else:
            try: self.lbl_moneda.grid_remove(); self.cmb_moneda.grid_remove()
            except Exception: pass

    # ----- toggle portales personalizados -----
    def _toggle_custom(self):
        self._custom_expanded = not self._custom_expanded
        if self._custom_expanded:
            self.btn_custom_toggle.configure(text="▾ Portales personalizados")
            self.custom.grid(row=self.dorks_row-1, column=0, columnspan=4, sticky="we", padx=10, pady=(0,8))
        else:
            self.btn_custom_toggle.configure(text="▸ Portales personalizados")
            self.custom.grid_remove()

    # ----- tema/acento -----
    def _on_theme_change(self, event=None):
        self._setup_theme("light" if self.theme_var.get()=="Claro" else "dark")
        self._save_config()

    def _on_accent_change(self, event=None):
        self._accent_name = self.cmb_accent.get() or "Azul"
        self._setup_theme(self._theme_name)
        self._save_config()

    # ----- helpers portales personalizados -----
    def _normalize_board(self, name: str, filt: str):
        f = (filt or "").strip()
        if not f: return None
        if f.startswith("site:") or f.startswith("inurl:") or " " in f:
            label = (name or f.split()[0]).strip(); return (label, f)
        try:
            p = urlparse(f); host = (p.netloc or p.path).strip()
            if host: return (name or host, f"site:{host}")
        except Exception: pass
        return (name or f, f"site:{f}")

    def _preview_board(self, filt: str, name: str):
        norm = self._normalize_board(name, filt); return f"Preview → {norm[0]} — {norm[1]}" if norm else ""

    def get_boards(self):
        return JOB_BOARDS + self._custom_boards

    def on_add_board(self):
        item = self._normalize_board(self.ent_board_name.get().strip(), self.cmb_board_filter.get().strip())
        if not item: messagebox.showwarning("Portal personalizado","Ingresá un filtro o URL válido."); return
        if any(b[1]==item[1] for b in self._custom_boards):
            messagebox.showinfo("Portal personalizado","Ese filtro ya fue agregado."); return
        self._custom_boards.append(item); self.lst_boards.insert("end", f"{item[0]}  —  {item[1]}")
        self.cmb_board_filter.set(""); self.ent_board_name.delete(0,"end"); self.lbl_preview.configure(text="")
        self._save_config()
        data = self._collect(silent=True); 
        if data: self._build_and_render(data)

    def on_remove_board(self):
        sel = list(self.lst_boards.curselection())
        if not sel: return
        idx = sel[0]
        try:
            self._custom_boards.pop(idx); self.lst_boards.delete(idx); self._save_config()
            data = self._collect(silent=True); 
            if data: self._build_and_render(data)
        except Exception: pass

    # ----- preset de rol -----
    def _apply_preset(self, event=None):
        text = ROLE_PRESETS.get(self.cmb_preset.get(), "")
        if text:
            if getattr(self, "_ph_active", False):
                self.ent_rol.delete(0,"end"); self.ent_rol.configure(foreground=self._palette["fg"]); self._ph_active=False
            self.ent_rol.delete(0,"end"); self.ent_rol.insert(0, text)

    # ----- resumen chips -----
    def _render_summary(self):
        for w in self.summary.winfo_children(): w.destroy()
        chips = []
        rol = self.ent_rol.get().strip()
        if getattr(self, "_ph_active", False) and rol == getattr(self, "_ph_text",""): rol=""

        # No mostrar nada hasta que el usuario escriba rol o ejecute una acción
        if not self._has_run and not rol:
            ttk.Label(self.summary, text="", style="Muted.TLabel").pack(side="left", padx=6)
            return

        if rol: chips.append(("🎯", (rol[:40]+"…") if len(rol)>40 else rol))
        area = self.cmb_area.get().strip()
        if area: chips.append(("🏢", area))
        lang = self.cmb_idioma.get()
        if lang != "Cualquiera": chips.append(("🌐", lang))
        ubic = self.cmb_ubic.get()
        if ubic: chips.append(("📍", ubic))
        modalidad = self.cmb_modalidad.get()
        if modalidad != "Cualquiera": chips.append(("🏷", modalidad))
        pub = self.cmb_published.get()
        if pub != "Cualquiera": chips.append(("⏱", pub))
        if self.var_salario.get():
            chips.append(("💰", f"Moneda {self.cmb_moneda.get()}"))
        for icon, text in chips:
            ttk.Label(self.summary, text=f"{icon} {text}", style="Chip.TLabel").pack(side="left", padx=4, pady=(0,4))

    # ----- colectar -----
    def _collect(self, silent=False):
        rol = self.ent_rol.get().strip()
        if getattr(self, "_ph_active", False) and rol == getattr(self, "_ph_text",""):
            rol = ""
        if not rol:
            if not silent: messagebox.showwarning("Falta rol","Ingresá al menos el Rol.")
            return None
        return (
            rol,
            self.cmb_area.get(), self.cmb_seniority.get(),
            self.cmb_idioma.get(), self.cmb_ubic.get(),
            self.cmb_modalidad.get(), self.cmb_published.get(),
            self.var_excluir.get(), self.var_salario.get(),
            self.cmb_moneda.get().strip(), self.var_explore.get()
        )

    # ----- construir y renderizar -----
    def _build_and_render(self, data):
        rol, area, seniority, idioma, ubic, modalidad, published, excluir, inc_salario, moneda, explore = data
        dorks = build_dorks(rol, area, seniority, idioma, ubic, modalidad, published, excluir, inc_salario, moneda, explore, self.get_boards())
        self._current_dorks = dorks
        self._render_summary()
        self._render_dorks_cards(dorks); self._render_cards(dorks, idioma, published, ubic, modalidad)
        self._update_counts(len(dorks))
        return dorks

    def _update_counts(self, n:int):
        self.lbl_count_dorks.configure(text=f"Fuentes: {n}")
        self.lbl_count_web.configure(text=f"Fuentes: {n}")
        self.status_left.configure(text=f"Fuentes: {n}")

    # ----- vistas -----
    def _show_dorks(self):
        self._active_view = "dorks"; self.panel_web.grid_remove(); self.panel_dorks.grid()
        self.empty_web.place_forget()
        if not self._current_dorks: self.empty_dorks.place(relx=0.5, rely=0.5, anchor="center")

    def _show_web(self):
        self._active_view = "web"; self.panel_dorks.grid_remove(); self.panel_web.grid()
        self.empty_dorks.place_forget()
        if not self._current_dorks: self.empty_web.place(relx=0.5, rely=0.5, anchor="center")
        self.after(60, self._render_cards_deferred)

    def _render_cards_deferred(self):
        if not self._current_dorks:
            data = self._collect(silent=True)
            if data: self._build_and_render(data); return
        self._render_cards(self._current_dorks, self.cmb_idioma.get(), self.cmb_published.get(),
                           self.cmb_ubic.get(), self.cmb_modalidad.get(), force=True)

    # ----- render Dorks -----
    def _render_dorks_cards(self, dorks):
        for w in self.dorks_frame.winfo_children(): w.destroy()
        self.update_idletasks()
        width = self.panel_dorks.winfo_width() or self.winfo_width()
        usable = max(360, width - 60); wrap = max(320, usable - 40)
        if not dorks:
            self.empty_dorks.place(relx=0.5, rely=0.5, anchor="center")
        else:
            self.empty_dorks.place_forget()
        for idx, (label, q, url) in enumerate(dorks):
            card = ttk.Frame(self.dorks_frame, style="Card.TFrame"); card.grid(row=idx, column=0, padx=14, pady=10, sticky="we")
            head = ttk.Frame(card, style="Panel.TFrame"); head.grid(row=0, column=0, columnspan=2, sticky="we")
            ttk.Label(head, text=f"💡 {label}", style="Badge.TLabel").pack(side="left")
            ttk.Label(card, text=q, style="Code.TLabel", wraplength=wrap, anchor="w", justify="left").grid(row=1, column=0, columnspan=2, sticky="we", pady=(8,8))
            ttk.Label(card, text=(url if len(url)<=120 else url[:120]+"…"), style="Preview.TLabel", wraplength=wrap, anchor="w", justify="left").grid(row=2, column=0, columnspan=2, sticky="we")
            bcopyq = ttk.Button(card, text="📋 Copiar dork", style="Secondary.TButton", command=lambda text=q: self._copy(text))
            bcopyu = ttk.Button(card, text="📋 Copiar URL", style="Secondary.TButton", command=lambda u=url: self._copy(u))
            bcopyq.grid(row=3, column=0, sticky="w", pady=(10,0)); bcopyu.grid(row=3, column=1, sticky="e", pady=(10,0))
            for b in (bcopyq,bcopyu):
                b.bind("<Enter>", lambda e, w=b: w.configure(cursor="hand2"))
                b.bind("<Leave>", lambda e, w=b: w.configure(cursor=""))
            card.columnconfigure(0, weight=1); card.columnconfigure(1, weight=1)
            card.bind("<Enter>", lambda e, w=card: (w.configure(style="CardHover.TFrame"), w.configure(cursor="hand2")))
            card.bind("<Leave>", lambda e, w=card: (w.configure(style="Card.TFrame"), w.configure(cursor="")))

        self.dorks_frame.columnconfigure(0, weight=1)
        self.dorks_canvas.configure(scrollregion=self.dorks_canvas.bbox("all")); self.dorks_canvas.yview_moveto(0.0)

    # ----- render Web -----
    def _compute_columns(self, width: int) -> int:
        usable = max(320, width - 80); min_card = 380
        return max(1, min(4, usable // min_card))

    def _render_cards(self, dorks, idioma, published, ubic, modalidad, force=False):
        self.update_idletasks(); width = self.panel_web.winfo_width() or self.winfo_width()
        if width < 400:
            if not force: self.after(80, lambda: self._render_cards(dorks, idioma, published, ubic, modalidad, True))
            return
        cols = self._compute_columns(width)
        if not force and hasattr(self, "_cards_cols") and cols == self._cards_cols and getattr(self, "_cards_rendered", False): return
        self._cards_cols = cols
        for w in self.cards_frame.winfo_children(): w.destroy()

        if not dorks:
            self.empty_web.place(relx=0.5, rely=0.5, anchor="center")
        else:
            self.empty_web.place_forget()

        usable = max(320, width - 80); card_w = int(usable / cols) - 40; wrap = max(260, card_w - 40)
        for idx, (label, q, url) in enumerate(dorks):
            r, c = divmod(idx, cols)
            card = ttk.Frame(self.cards_frame, style="Card.TFrame"); card.grid(row=r, column=c, padx=14, pady=14, sticky="nsew")
            head = ttk.Frame(card, style="Panel.TFrame"); head.grid(row=0, column=0, columnspan=2, sticky="we")
            ttk.Label(head, text=f"🔎 {label}", style="Badge.TLabel").pack(side="left")
            chips = ttk.Frame(head, style="Panel.TFrame"); chips.pack(side="right")
            if idioma != "Cualquiera": ttk.Label(chips, text=f"🌐 {idioma}", style="Chip.TLabel").pack(side="left", padx=4)
            if published != "Cualquiera": ttk.Label(chips, text=f"⏱ {published}", style="Chip.TLabel").pack(side="left", padx=4)
            if ubic and ubic != "Remoto": ttk.Label(chips, text=f"📍 {ubic}", style="Chip.TLabel").pack(side="left", padx=4)
            if modalidad != "Cualquiera": ttk.Label(chips, text=f"🏷 {modalidad}", style="Chip.TLabel").pack(side="left", padx=4)
            ttk.Label(card, text=(q[:200] + "…") if len(q) > 200 else q, style="Preview.TLabel", wraplength=wrap).grid(row=1, column=0, columnspan=2, sticky="we", pady=(8,12))
            openb = ttk.Button(card, text="🌐 Abrir en visor", style="Primary.TButton", command=lambda u=url: self._open_in_viewer(u))
            copyb = ttk.Button(card, text="📋 Copiar URL", style="Secondary.TButton", command=lambda u=url: self._copy(u))
            openb.grid(row=2, column=0, sticky="we", padx=(0,8)); copyb.grid(row=2, column=1, sticky="we")
            for b in (openb, copyb):
                b.bind("<Enter>", lambda e, w=b: w.configure(cursor="hand2"))
                b.bind("<Leave>", lambda e, w=b: w.configure(cursor=""))
            card.columnconfigure(0, weight=1); card.columnconfigure(1, weight=1)
            card.bind("<Enter>", lambda e, w=card: (w.configure(style="CardHover.TFrame"), w.configure(cursor="hand2")))
            card.bind("<Leave>", lambda e, w=card: (w.configure(style="Card.TFrame"), w.configure(cursor="")))

        for c in range(cols): self.cards_frame.columnconfigure(c, weight=1)
        self._cards_rendered = True
        self.cards_canvas.configure(scrollregion=self.cards_canvas.bbox("all")); self.cards_canvas.yview_moveto(0.0)

    # ----- resize -----
    def _on_resize(self, event):
        if event.widget != self: return
        if self._active_view == "web":
            self._render_cards(self._current_dorks, self.cmb_idioma.get(), self.cmb_published.get(), self.cmb_ubic.get(), self.cmb_modalidad.get(), force=True)
        else:
            self._render_dorks_cards(self._current_dorks)

    # ----- util -----
    def _copy(self, text):
        self.clipboard_clear(); self.clipboard_append(text); self.update_idletasks()
        self.status_right.configure(text="Copiado ✔")

    def _open_in_viewer(self, url):
        try:
            import webview  # noqa: F401
            have_webview = True
        except Exception:
            have_webview = False
        if not have_webview:
            webbrowser.open_new_tab(url); return
        try:
            if getattr(sys, 'frozen', False):
                cmd = [sys.executable, "--viewer", url]
            else:
                cmd = [sys.executable, os.path.abspath(__file__), "--viewer", url]
            subprocess.Popen(cmd)
        except Exception as ex:
            messagebox.showerror("Visor", f"No pude abrir el visor embebido:\n{ex}")
            webbrowser.open_new_tab(url)

    # ----- acciones -----
    def on_generar(self):
        data = self._collect()
        if not data: return
        self._has_run = True
        self._show_dorks(); self._build_and_render(data)

    def on_buscar(self):
        data = self._collect()
        if not data: return
        self._has_run = True
        self._show_web(); self._build_and_render(data)

    def on_clear(self):
        self.ent_rol.delete(0,"end")
        self._install_placeholder(self.ent_rol, getattr(self, "_ph_text","Ej.: \"soporte técnico\" OR \"help desk\" OR \"service desk\""), self._palette["ph_fg"])
        self.cmb_preset.current(0)
        self.cmb_area.set("")
        self.cmb_seniority.current(0)
        self.cmb_idioma.current(1)
        self.cmb_ubic.set("Argentina")
        self.cmb_modalidad.current(0)
        self.cmb_published.current(0)
        self.var_excluir.set(True)
        self.var_salario.set(False)
        self.cmb_moneda.set("USD")
        self._toggle_currency()
        self.var_explore.set(True)
        self._has_run = False

        for w in self.dorks_frame.winfo_children(): w.destroy()
        for w in self.cards_frame.winfo_children(): w.destroy()
        self._current_dorks = []
        self._render_summary()
        self._update_counts(0)
        self.cards_canvas.configure(scrollregion=(0,0,0,0)); self.dorks_canvas.configure(scrollregion=(0,0,0,0))
        self.cards_canvas.yview_moveto(0.0); self.dorks_canvas.yview_moveto(0.0)
        self.empty_dorks.place(relx=0.5, rely=0.5, anchor="center")
        self.empty_web.place(relx=0.5, rely=0.5, anchor="center")
        self.status_right.configure(text="Formulario limpio")

def main(): App().mainloop()
if __name__ == "__main__": main()
