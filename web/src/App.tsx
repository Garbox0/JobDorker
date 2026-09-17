import { FormEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";

type Filters = {
  role: string;
  location: string;
  modality: string;
  seniority: string;
  language: string;
  recent: string;
};

type SavedSearch = Filters & { id: string; createdAt: string };

type ApplicationStatus = "Para revisar" | "Postulé" | "Entrevista" | "Oferta" | "Cerrada";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "Para revisar",
  "Postulé",
  "Entrevista",
  "Oferta",
  "Cerrada",
];

type Application = {
  id: string;
  company: string;
  role: string;
  source: string;
  url: string;
  status: ApplicationStatus;
  date: string;
};

type ApplicationDraft = Omit<Application, "id">;

type TourStep = {
  badge: string;
  title: string;
  description: string;
  tips: string[];
  targetId: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    badge: "Paso 1 de 5",
    title: "¿Cómo funciona JobDorker?",
    description: "Las empresas gestionan sus vacantes en sistemas ATS directos (Greenhouse, Lever, Ashby, etc.). JobDorker crea consultas de Google avanzadas para indexar esas ofertas oficiales sin intermediarios ni bolsas masivas.",
    tips: [
      "Sin intermediarios: postulás en el formulario real de la empresa.",
      "Sin cuentas: no requiere registro ni almacena datos en la nube.",
      "Menos competencia: vacantes directas no republicadas.",
    ],
    targetId: "hero-intro",
  },
  {
    badge: "Paso 2 de 5",
    title: "Definir el rol y sinónimos",
    description: "Ingresá el título del puesto. Agrupá sinónimos en inglés y español con OR y usá comillas dobles para frases compuestas.",
    tips: [
      'Ejemplo: "soporte técnico" OR "help desk"',
      'Ejemplo: "frontend" OR "react developer"',
      "No uses palabras como 'urgente' o 'busco'.",
    ],
    targetId: "search-input-row",
  },
  {
    badge: "Paso 3 de 5",
    title: "Filtros de consulta",
    description: "Acotá por país y modalidad (Remoto, Híbrido, Presencial). En opciones avanzadas podés elegir seniority, idioma y fecha de publicación.",
    tips: [
      "Para vacantes frescas, elegí 'Última semana' o 'Últimas 24 h'.",
      "Para remoto global, combiná 'Remoto' con idioma 'Inglés'.",
    ],
    targetId: "filters-box",
  },
  {
    badge: "Paso 4 de 5",
    title: "Portales ATS y acciones",
    description: "Las fuentes se organizan por categoría. Cada tarjeta incluye el logo del portal y cuatro acciones directas:",
    tips: [
      "Ver ofertas: ejecuta la consulta completa en Google.",
      "Ver más: relaja los filtros si hay pocos resultados.",
      "Copiar dork: copia el texto de la consulta al portapapeles.",
      "+ Postulación: guarda la vacante en tu tablero.",
    ],
    targetId: "results-container",
  },
  {
    badge: "Paso 5 de 5",
    title: "Tablero local y CSV",
    description: "Llevá el control de tus aplicaciones laborales en un solo lugar. Cambiá el estado de cada vacante y descargá la planilla cuando la necesites.",
    tips: [
      "Estados: Para revisar, Postulé, Entrevista, Oferta, Cerrada.",
      "Exportar CSV: descarga una planilla compatible con Excel.",
      "100% privado: los registros se guardan solo en tu dispositivo.",
    ],
    targetId: "tablero",
  },
];

const BOARDS = [
  { name: "Google", short: "GO", icon: "https://www.google.com/favicon.ico", note: "Web de la empresa", group: "general", filter: "inurl:careers OR inurl:jobs" },
  { name: "LinkedIn", short: "in", icon: "https://www.linkedin.com/favicon.ico", note: "Portal de empleo", group: "general", filter: "site:linkedin.com/jobs" },
  { name: "Greenhouse", short: "GH", icon: "https://boards.greenhouse.io/favicon.ico", note: "ATS de empresa", group: "tech", filter: "site:boards.greenhouse.io OR site:job-boards.greenhouse.io" },
  { name: "Lever", short: "LV", icon: "https://jobs.lever.co/favicon.ico", note: "ATS de empresa", group: "tech", filter: "site:jobs.lever.co" },
  { name: "Ashby", short: "A", icon: "https://jobs.ashbyhq.com/favicon.ico", note: "ATS de empresa", group: "tech", filter: "site:jobs.ashbyhq.com" },
  { name: "Get on Board", short: "GB", icon: "https://www.getonbrd.com/favicon.ico", note: "Portal tech LatAm", group: "tech", filter: "site:getonbrd.com" },
  { name: "Wellfound", short: "WF", icon: "https://wellfound.com/favicon.ico", note: "Startups & tech", group: "tech", filter: "site:wellfound.com/jobs" },
  { name: "We Work Remotely", short: "WW", icon: "https://weworkremotely.com/favicon.ico", note: "Trabajo remoto global", group: "remote", filter: "site:weworkremotely.com" },
  { name: "Remote OK", short: "RO", icon: "https://remoteok.com/favicon.ico", note: "Trabajo remoto tech", group: "remote", filter: "site:remoteok.com" },
];

const SOURCE_GROUPS = [
  { id: "general", title: "General y empresas directas", description: "Búsquedas amplias en sitios corporativos y portales abiertos." },
  { id: "tech", title: "Sistemas ATS y startups", description: "Greenhouse, Lever, Ashby, Get on Board y Wellfound." },
  { id: "remote", title: "Portales de trabajo remoto", description: "Puestos remotos internacionales sin restricción geográfica." },
];

const SUPPORT_URL = "https://ko-fi.com/cyberquest50";
const KOFI_BADGE_URL = "https://storage.ko-fi.com/cdn/kofi5.png?v=6";

const defaults: Filters = {
  role: "",
  location: "Cualquiera",
  modality: "Cualquiera",
  seniority: "Cualquiera",
  language: "Cualquiera",
  recent: "Cualquiera",
};

const locationTokens: Record<string, string> = {
  Argentina: '"Argentina"',
  Chile: '"Chile"',
  Colombia: '"Colombia"',
  México: '"México"',
  Uruguay: '"Uruguay"',
};

const seniorityTokens: Record<string, string> = {
  Junior: '"junior" OR "jr" OR "entry level"',
  "Semi Senior": '"semi senior" OR "ssr" OR "mid level"',
  Senior: '"senior" OR "sr"',
  Lead: '"lead" OR "staff" OR "principal"',
};

const languageTokens: Record<string, string> = {
  Español: '"español" OR "spanish"',
  Inglés: '"inglés" OR "english"',
  Portugués: '"portugués" OR "portuguese"',
};

const recencyParams: Record<string, string> = {
  "Últimas 24 h": "qdr:d",
  "Última semana": "qdr:w",
  "Último mes": "qdr:m",
};

function buildQuery(filters: Filters, boardFilter: string) {
  const parts = [`(${boardFilter})`, filters.role.trim()];
  if (locationTokens[filters.location]) parts.push(locationTokens[filters.location]);
  if (filters.modality === "Remoto") parts.push('("remoto" OR "remote")');
  if (filters.modality === "Híbrido") parts.push('("híbrido" OR "hybrid")');
  if (filters.modality === "Presencial") parts.push('("presencial" OR "onsite")');
  if (seniorityTokens[filters.seniority]) parts.push(`(${seniorityTokens[filters.seniority]})`);
  if (languageTokens[filters.language]) parts.push(`(${languageTokens[filters.language]})`);
  return parts.join(" ");
}

function buildBroadQuery(filters: Filters, boardFilter: string) {
  return `(${boardFilter}) ${filters.role.trim()}`;
}

function buildGoogleUrl(query: string, recent: string) {
  const params = new URLSearchParams({ q: query });
  if (recencyParams[recent]) params.set("tbs", recencyParams[recent]);
  return `https://www.google.com/search?${params.toString()}`;
}

function loadSavedSearches(): SavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem("jobdorker:saved-searches") ?? "[]") as SavedSearch[];
  } catch {
    return [];
  }
}

function loadApplications(): Application[] {
  try {
    return JSON.parse(localStorage.getItem("jobdorker:applications") ?? "[]") as Application[];
  } catch {
    return [];
  }
}

function createApplicationDraft(role = ""): ApplicationDraft {
  return {
    company: "",
    role,
    source: "Google",
    url: "",
    status: "Para revisar",
    date: new Date().toISOString().slice(0, 10),
  };
}

function csvCell(value: string) {
  return `"${(value || "").replaceAll('"', '""')}"`;
}

// Iconos SVG Minimalistas
function IconHelp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function IconBookmark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconEmptyTarget() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#24583f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#173d2c" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function getCardStyle(rect: { top: number; left: number; width: number; height: number } | null): React.CSSProperties {
  if (!rect) {
    return { bottom: "20px", right: "20px" };
  }

  const cardW = 340;
  const cardH = 200;
  const margin = 14;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // En pantallas móviles
  if (w < 680) {
    const inTopHalf = rect.top + rect.height / 2 < h / 2;
    return inTopHalf
      ? { top: "10px", left: "10px", right: "10px", width: "auto" }
      : { bottom: "10px", left: "10px", right: "10px", width: "auto" };
  }

  // Detector de colisión entre el spotlight y la tarjeta
  const collides = (top: number, left: number) => {
    return !(
      top + cardH < rect.top - 4 ||
      top > rect.top + rect.height + 4 ||
      left + cardW < rect.left - 4 ||
      left > rect.left + rect.width + 4
    );
  };

  // 1. Debajo del elemento destacado
  const belowTop = rect.top + rect.height + margin;
  if (belowTop + cardH <= h - 14) {
    const left = Math.max(16, Math.min(w - cardW - 16, rect.left + (rect.width - cardW) / 2));
    if (!collides(belowTop, left)) {
      return { top: `${belowTop}px`, left: `${left}px` };
    }
  }

  // 2. Encima del elemento destacado
  const aboveTop = rect.top - margin - cardH;
  if (aboveTop >= 14) {
    const left = Math.max(16, Math.min(w - cardW - 16, rect.left + (rect.width - cardW) / 2));
    if (!collides(aboveTop, left)) {
      return { top: `${aboveTop}px`, left: `${left}px` };
    }
  }

  // 3. A la izquierda del elemento
  const leftPos = rect.left - margin - cardW;
  if (leftPos >= 16) {
    const top = Math.max(16, Math.min(h - cardH - 16, rect.top));
    if (!collides(top, leftPos)) {
      return { top: `${top}px`, left: `${leftPos}px` };
    }
  }

  // 4. A la derecha del elemento
  const rightPos = rect.left + rect.width + margin;
  if (rightPos + cardW <= w - 16) {
    const top = Math.max(16, Math.min(h - cardH - 16, rect.top));
    if (!collides(top, rightPos)) {
      return { top: `${top}px`, left: `${rightPos}px` };
    }
  }

  // 5. Esquina opuesta
  if (rect.left > w / 2 - 120) {
    return { bottom: "20px", left: "20px" };
  }
  return { bottom: "20px", right: "20px" };
}

function BoardLogo({ name, icon, short }: { name: string; icon: string; short: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !icon) {
    return <span className="source-initial" aria-hidden="true">{short}</span>;
  }

  return (
    <div className="source-logo-wrap">
      <img
        src={icon}
        alt={`Logo de ${name}`}
        className="source-logo-img"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(defaults);
  const [showFilters, setShowFilters] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(loadSavedSearches);
  const [copied, setCopied] = useState<string | null>(null);

  // Estados del Tablero de Oportunidades
  const [applications, setApplications] = useState<Application[]>(loadApplications);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>(() => createApplicationDraft());
  const [trackerError, setTrackerError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todas");

  // Tutorial guiado dinámico
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("jobdorker:tour-seen");
    if (!seen) {
      setTourOpen(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("jobdorker:saved-searches", JSON.stringify(savedSearches));
  }, [savedSearches]);

  useEffect(() => {
    localStorage.setItem("jobdorker:applications", JSON.stringify(applications));
  }, [applications]);

  // Actualizador dinámico del foco del tutorial (Spotlight)
  useEffect(() => {
    if (!tourOpen) {
      setSpotlightRect(null);
      return;
    }

    const currentStep = TOUR_STEPS[tourStep];

    if (tourStep === 2) {
      setShowFilters(true);
    } else if (tourStep === 3) {
      if (!filters.role.trim()) {
        setFilters((prev) => ({ ...prev, role: "soporte técnico" }));
      }
      setSearched(true);
    }

    function updateSpotlight() {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const rect = el.getBoundingClientRect();
        const padding = 10;
        setSpotlightRect({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      } else {
        setSpotlightRect(null);
      }
    }

    const timer = setTimeout(updateSpotlight, 140);

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [tourOpen, tourStep, searched, filters.role]);

  const results = useMemo(
    () => BOARDS.map((board) => {
      const query = buildQuery(filters, board.filter);
      const broadQuery = buildBroadQuery(filters, board.filter);
      return {
        ...board,
        query,
        url: buildGoogleUrl(query, filters.recent),
        broadUrl: buildGoogleUrl(broadQuery, "Cualquiera"),
        hasFilters: query !== broadQuery || Boolean(recencyParams[filters.recent]),
      };
    }),
    [filters],
  );

  const filteredApplications = useMemo(() => {
    if (statusFilter === "Todas") return applications;
    return applications.filter((app) => app.status === statusFilter);
  }, [applications, statusFilter]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function search(event: FormEvent) {
    event.preventDefault();
    if (!filters.role.trim()) {
      setError("Ingresá el puesto o especialidad que buscás.");
      return;
    }
    setError("");
    setSearched(true);
  }

  function saveSearch() {
    if (!filters.role.trim()) return;
    const record: SavedSearch = { ...filters, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setSavedSearches((current) => [record, ...current.filter((item) => item.role !== filters.role)]);
  }

  function copyQuery(name: string, query: string) {
    navigator.clipboard.writeText(query).then(() => {
      setCopied(name);
      window.setTimeout(() => setCopied(null), 1500);
    });
  }

  async function openExternal(url: string) {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function handleExternalLink(event: MouseEvent<HTMLAnchorElement>, url: string) {
    event.preventDefault();
    void openExternal(url);
  }

  // Métodos del Tablero
  function handleAddApplication(event: FormEvent) {
    event.preventDefault();
    if (!applicationDraft.company.trim() && !applicationDraft.role.trim()) {
      setTrackerError("Completá al menos la empresa o el puesto.");
      return;
    }

    const newApp: Application = {
      ...applicationDraft,
      id: crypto.randomUUID(),
      company: applicationDraft.company.trim() || "Empresa no especificada",
      role: applicationDraft.role.trim() || "Puesto no indicado",
      source: applicationDraft.source.trim() || "Búsqueda directa",
      url: applicationDraft.url.trim(),
      status: applicationDraft.status,
      date: applicationDraft.date || new Date().toISOString().slice(0, 10),
    };

    setApplications((prev) => [newApp, ...prev]);
    setApplicationDraft(createApplicationDraft(filters.role));
    setShowApplicationForm(false);
    setTrackerError("");
  }

  function handleUpdateStatus(id: string, newStatus: ApplicationStatus) {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
  }

  function handleDeleteApplication(id: string) {
    if (window.confirm("¿Eliminar esta postulación del tablero?")) {
      setApplications((prev) => prev.filter((app) => app.id !== id));
    }
  }

  function handleQuickTrack(boardName: string, queryUrl: string) {
    setApplicationDraft({
      company: "",
      role: filters.role.trim() || "Vacante",
      source: boardName,
      url: queryUrl,
      status: "Para revisar",
      date: new Date().toISOString().slice(0, 10),
    });
    setShowApplicationForm(true);
    setTrackerError("");
    const element = document.getElementById("tablero");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function handleExportCsv() {
    if (applications.length === 0) return;
    const header = ["Empresa", "Puesto", "Portal / ATS", "Enlace", "Estado", "Fecha"];
    const rows = applications.map((app) => [
      csvCell(app.company),
      csvCell(app.role),
      csvCell(app.source),
      csvCell(app.url),
      csvCell(app.status),
      csvCell(app.date),
    ]);
    const csvContent = "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const filename = `postulaciones_jobdorker_${new Date().toISOString().slice(0, 10)}.csv`;

    try {
      const filePath = await save({
        filters: [{ name: "Archivo CSV (*.csv)", extensions: ["csv"] }],
        defaultPath: filename,
      });
      if (filePath) {
        await writeTextFile(filePath, csvContent);
        return;
      }
    } catch {
      // Fallback a descarga normal en navegador
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Métodos del Tutorial
  function handleNextTour() {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep((prev) => prev + 1);
    } else {
      handleCloseTour();
    }
  }

  function handlePrevTour() {
    if (tourStep > 0) {
      setTourStep((prev) => prev - 1);
    }
  }

  function handleCloseTour() {
    setTourOpen(false);
    localStorage.setItem("jobdorker:tour-seen", "true");
  }

  function handleOpenTour() {
    setTourStep(0);
    setTourOpen(true);
  }

  const currentTourStep = TOUR_STEPS[tourStep];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="JobDorker, inicio">
          <span className="brand-mark">JD</span>
          <span>JobDorker</span>
        </a>
        <div className="topbar-actions">
          <button className="tour-trigger-btn" type="button" onClick={handleOpenTour} title="Ver tutorial interactivo">
            <IconHelp />
            <span>Tutorial</span>
          </button>
          <a className="nav-pill" href="#tablero">
            <IconClipboard />
            <span>{applications.length} {applications.length === 1 ? "postulación" : "postulaciones"}</span>
          </a>
          <span className="saved-count">
            <IconBookmark />
            <span>{savedSearches.length} {savedSearches.length === 1 ? "guardada" : "guardadas"}</span>
          </span>
          <a className="support-link" href={SUPPORT_URL} target="_blank" rel="noreferrer" onClick={(event) => handleExternalLink(event, SUPPORT_URL)}>
            <img src={KOFI_BADGE_URL} alt="Apoyar JobDorker en Ko-fi" />
          </a>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-intro" id="hero-intro">
          <p className="eyebrow">CONSULTAS GOOGLE EN SISTEMAS ATS</p>
          <h1>Búsquedas directas<br /><em>en las empresas.</em></h1>
          <p className="hero-copy">Generá dorks de Google para indexar vacantes en portales ATS oficiales (Greenhouse, Lever, Ashby y más) sin intermediarios ni publicaciones duplicadas.</p>
        </div>

        <form className="search-card" onSubmit={search}>
          <label htmlFor="role">Puesto o rol a buscar</label>
          <div className="main-search-row" id="search-input-row">
            <input id="role" value={filters.role} onChange={(event) => update("role", event.target.value)} placeholder="Ej. soporte técnico, plomero, qa automation, analista de datos" autoComplete="off" />
            <button className="primary-button" type="submit">Generar búsquedas <span>→</span></button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="filters-box" id="filters-box">
            <div className="quick-filters">
              <label>Ubicación geográfica
                <select value={filters.location} onChange={(event) => update("location", event.target.value)}>
                  <option>Cualquiera</option><option>Argentina</option><option>Chile</option><option>Colombia</option><option>México</option><option>Uruguay</option><option>Remoto</option>
                </select>
              </label>
              <label>Modalidad de trabajo
                <select value={filters.modality} onChange={(event) => update("modality", event.target.value)}>
                  <option>Remoto</option><option>Híbrido</option><option>Presencial</option><option>Cualquiera</option>
                </select>
              </label>
              <button className="text-button" type="button" onClick={() => setShowFilters((visible) => !visible)}>{showFilters ? "Ocultar filtros avanzados" : "Ver más opciones"}</button>
            </div>
            {showFilters && <div className="advanced-filters">
              <label>Nivel de experiencia<select value={filters.seniority} onChange={(event) => update("seniority", event.target.value)}><option>Cualquiera</option><option>Junior</option><option>Semi Senior</option><option>Senior</option><option>Lead</option></select></label>
              <label>Idioma de la publicación<select value={filters.language} onChange={(event) => update("language", event.target.value)}><option>Cualquiera</option><option>Español</option><option>Inglés</option><option>Portugués</option></select></label>
              <label>Fecha de publicación<select value={filters.recent} onChange={(event) => update("recent", event.target.value)}><option>Cualquiera</option><option>Últimas 24 h</option><option>Última semana</option><option>Último mes</option></select></label>
            </div>}
          </div>
        </form>
      </section>

      <section className="results-section" id="results-container" aria-live="polite">
        {!searched ? <div className="empty-state"><span className="empty-icon">⌁</span><h2>Escribí un rol para comenzar</h2><p>Generaremos las consultas de Google adaptadas a cada sistema de empleo.</p></div> : <>
          <div className="results-heading">
            <div><p className="eyebrow">PORTALES ATS Y FUENTES</p><h2>Consultas para {filters.role}</h2><p className="route-explainer">Hacé clic en <strong>Ver ofertas</strong> para abrir los resultados en Google. Si la búsqueda es muy estricta, usá <strong>Ver más</strong>.</p></div>
            <button className="secondary-button" type="button" onClick={saveSearch}>Guardar búsqueda</button>
          </div>
          {SOURCE_GROUPS.map((group) => {
            const groupResults = results.filter((result) => result.group === group.id);
            return <section className="source-group" key={group.id}>
              <div className="source-group-heading"><h3>{group.title}</h3><p>{group.description}</p></div>
              <div className="source-grid">
            {groupResults.map((result) => <article className="source-card" key={result.name}>
              <div className="source-card-top">
                <BoardLogo name={result.name} icon={result.icon} short={result.short} />
                <div><h3>{result.name}</h3><p>{result.note}</p></div>
              </div>
              <div className="source-actions">
                <a className="source-open" href={result.url} target="_blank" rel="noreferrer" onClick={(event) => handleExternalLink(event, result.url)}>Ver ofertas <span>↗</span></a>
                {result.hasFilters && <button className="source-broaden" type="button" onClick={() => void openExternal(result.broadUrl)}>Ver más</button>}
                <button className="source-copy" type="button" onClick={() => copyQuery(result.name, result.query)}>{copied === result.name ? "Copiado" : "Copiar dork"}</button>
                <button className="source-track" type="button" title="Seguir vacante en mi tablero" onClick={() => handleQuickTrack(result.name, result.url)}>+ Postulación</button>
              </div>
            </article>)}
              </div>
            </section>;
          })}
        </>}
      </section>

      {/* Tablero de oportunidades local */}
      <section className="tracker-section" id="tablero">
        <div className="tracker-header">
          <div>
            <p className="eyebrow">REGISTRO LOCAL</p>
            <h2>Tablero de postulaciones</h2>
            <p className="tracker-copy">
              Registrá tus postulaciones, entrevistas y respuestas. Los datos se guardan únicamente en tu navegador o app.
            </p>
          </div>
          <div className="tracker-header-actions">
            <button
              className="primary-button tracker-toggle-btn"
              type="button"
              onClick={() => {
                setShowApplicationForm((prev) => !prev);
                setTrackerError("");
              }}
            >
              {showApplicationForm ? "Cerrar formulario" : "+ Nueva postulación"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleExportCsv}
              disabled={applications.length === 0}
              title={applications.length === 0 ? "No hay registros para exportar" : "Descargar planilla CSV"}
            >
              Exportar CSV <span>↓</span>
            </button>
          </div>
        </div>

        {showApplicationForm && (
          <form className="application-form" onSubmit={handleAddApplication}>
            <div className="application-form-title">
              <h3>Registrar postulación</h3>
              <p>Datos de la oportunidad para hacer seguimiento.</p>
            </div>
            <div className="application-form-grid">
              <label>
                Empresa *
                <input
                  type="text"
                  placeholder="Ej. Mercado Libre, Auth0, Estudio X"
                  value={applicationDraft.company}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, company: e.target.value }))}
                />
              </label>
              <label>
                Puesto o rol *
                <input
                  type="text"
                  placeholder="Ej. Soporte L2, Desarrollador React"
                  value={applicationDraft.role}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, role: e.target.value }))}
                />
              </label>
              <label>
                Portal o ATS
                <input
                  type="text"
                  placeholder="Ej. Greenhouse, Lever, Directo web"
                  value={applicationDraft.source}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, source: e.target.value }))}
                />
              </label>
              <label>
                Enlace de la oferta
                <input
                  type="url"
                  placeholder="https://..."
                  value={applicationDraft.url}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, url: e.target.value }))}
                />
              </label>
              <label>
                Estado actual
                <select
                  value={applicationDraft.status}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, status: e.target.value as ApplicationStatus }))}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  value={applicationDraft.date}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, date: e.target.value }))}
                />
              </label>
            </div>
            {trackerError && <p className="form-error" role="alert">{trackerError}</p>}
            <div className="application-form-actions">
              <button className="primary-button" type="submit">
                Guardar registro
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setShowApplicationForm(false);
                  setTrackerError("");
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="tracker-filter-bar">
          <span className="filter-label">Estado:</span>
          <div className="status-tabs">
            {["Todas", ...STATUS_OPTIONS].map((opt) => {
              const count = opt === "Todas" ? applications.length : applications.filter((a) => a.status === opt).length;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`status-tab ${statusFilter === opt ? "active" : ""}`}
                  onClick={() => setStatusFilter(opt)}
                >
                  {opt} <span className="tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="empty-tracker">
            <div className="empty-tracker-icon-wrap">
              <IconEmptyTarget />
            </div>
            <h3>Sin postulaciones registradas</h3>
            <p>
              Registrá una oportunidad manualmente o hacé clic en <strong>+ Postulación</strong> en cualquiera de las tarjetas de búsqueda.
            </p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-tracker">
            <p>No hay postulaciones con el estado <strong>"{statusFilter}"</strong>.</p>
          </div>
        ) : (
          <div className="application-grid">
            {filteredApplications.map((app) => (
              <article className="application-card" key={app.id}>
                <div className="app-card-header">
                  <div>
                    <h3 className="app-card-title">{app.role}</h3>
                    <p className="app-card-company">{app.company}</p>
                  </div>
                  <span className={`status-badge status-${app.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    {app.status}
                  </span>
                </div>

                <div className="app-card-meta">
                  <span><IconPin /> {app.source}</span>
                  <span><IconCalendar /> {app.date}</span>
                </div>

                <div className="app-card-footer">
                  <label className="status-change-label">
                    Estado:
                    <select
                      value={app.status}
                      onChange={(e) => handleUpdateStatus(app.id, e.target.value as ApplicationStatus)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="app-card-actions">
                    {app.url && (
                      <button
                        className="text-action-link"
                        type="button"
                        onClick={() => void openExternal(app.url)}
                        title={app.url}
                      >
                        Abrir enlace ↗
                      </button>
                    )}
                    <button
                      className="text-action-delete"
                      type="button"
                      onClick={() => handleDeleteApplication(app.id)}
                      title="Eliminar postulación"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {savedSearches.length > 0 && <section className="saved-section"><div><p className="eyebrow">HISTORIAL</p><h2>Búsquedas guardadas</h2><p>Acceso directo para volver a consultar roles frecuentes.</p></div><div className="saved-list">{savedSearches.slice(0, 4).map((item) => <button key={item.id} onClick={() => { setFilters(item); setSearched(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>{item.role}</span><small>{item.location} · {item.modality}</small></button>)}</div></section>}

      {/* Tutorial Guiado Dinámico y Acompañante */}
      {tourOpen && (
        <div className="tour-companion-layer">
          {spotlightRect && (
            <div
              className="tour-spotlight-cutout"
              style={{
                top: `${spotlightRect.top}px`,
                left: `${spotlightRect.left}px`,
                width: `${spotlightRect.width}px`,
                height: `${spotlightRect.height}px`,
              }}
            />
          )}

          <aside
            className="tour-companion-card"
            style={getCardStyle(spotlightRect)}
            role="region"
            aria-label="Tutorial guiado"
          >
            <div className="tour-header">
              <span className="tour-badge">{currentTourStep.badge}</span>
              <button className="tour-close-btn" type="button" onClick={handleCloseTour} title="Cerrar tutorial">
                ✕
              </button>
            </div>

            <h2 className="tour-title">{currentTourStep.title}</h2>
            <p className="tour-desc">{currentTourStep.description}</p>

            <ul className="tour-tips">
              {currentTourStep.tips.map((tip, idx) => (
                <li key={idx}>
                  <span className="tip-bullet"><IconCheck /></span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            <div className="tour-footer">
              <div className="tour-dots">
                {TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`tour-dot ${idx === tourStep ? "active" : ""}`}
                    onClick={() => setTourStep(idx)}
                    title={`Paso ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="tour-nav-buttons">
                <button
                  className="tour-btn tour-skip"
                  type="button"
                  onClick={handleCloseTour}
                >
                  Omitir
                </button>
                <button
                  className="tour-btn tour-prev"
                  type="button"
                  onClick={handlePrevTour}
                  disabled={tourStep === 0}
                >
                  ← Anterior
                </button>
                <button
                  className="tour-btn tour-next"
                  type="button"
                  onClick={handleNextTour}
                >
                  {tourStep === TOUR_STEPS.length - 1 ? "Finalizar" : "Siguiente →"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <footer>
        <span>JobDorker 2.0</span>
        <span>Consultas Google directas en sistemas ATS. Sin cuentas obligatorias ni telemetría.</span>
      </footer>
    </main>
  );
}
