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

const BOARDS = [
  { name: "Google", short: "GO", icon: "https://www.google.com/favicon.ico", note: "Web de la empresa", group: "general", filter: "inurl:careers OR inurl:jobs" },
  { name: "LinkedIn", short: "in", icon: "https://www.linkedin.com/favicon.ico", note: "Puede pedir cuenta gratis", group: "general", filter: "site:linkedin.com/jobs" },
  { name: "Greenhouse", short: "GH", icon: "https://www.greenhouse.io/favicon.ico", note: "Postulación en la empresa", group: "tech", filter: "site:boards.greenhouse.io OR site:job-boards.greenhouse.io" },
  { name: "Lever", short: "LV", icon: "https://www.lever.co/favicon.ico", note: "Postulación en la empresa", group: "tech", filter: "site:jobs.lever.co" },
  { name: "Ashby", short: "A", icon: "https://www.ashbyhq.com/favicon.ico", note: "Postulación en la empresa", group: "tech", filter: "site:jobs.ashbyhq.com" },
  { name: "Get on Board", short: "GB", icon: "https://www.getonbrd.com/favicon.ico", note: "Cuenta gratis para postular", group: "tech", filter: "site:getonbrd.com" },
  { name: "Wellfound", short: "WF", icon: "https://wellfound.com/favicon.ico", note: "Cuenta gratis para postular", group: "tech", filter: "site:wellfound.com/jobs" },
  { name: "We Work Remotely", short: "WW", icon: "https://weworkremotely.com/favicon.ico", note: "Enlace de la empresa", group: "remote", filter: "site:weworkremotely.com" },
  { name: "Remote OK", short: "RO", icon: "https://remoteok.com/favicon.ico", note: "Cuenta gratis para postular", group: "remote", filter: "site:remoteok.com" },
];

const SOURCE_GROUPS = [
  { id: "general", title: "Para cualquier trabajo", description: "Oficios, salud, comercio, administración y más." },
  { id: "tech", title: "Tecnología y startups", description: "Desarrollo, diseño, datos, soporte, producto y ciberseguridad." },
  { id: "remote", title: "Trabajo remoto", description: "Ofertas para trabajar desde casa o desde cualquier lugar." },
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

  useEffect(() => {
    localStorage.setItem("jobdorker:saved-searches", JSON.stringify(savedSearches));
  }, [savedSearches]);

  useEffect(() => {
    localStorage.setItem("jobdorker:applications", JSON.stringify(applications));
  }, [applications]);

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
      setError("Escribí el puesto o área que estás buscando.");
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
      setTrackerError("Ingresá al menos la empresa o el puesto.");
      return;
    }

    const newApp: Application = {
      ...applicationDraft,
      id: crypto.randomUUID(),
      company: applicationDraft.company.trim() || "Sin especificar",
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
    if (window.confirm("¿Querés quitar esta postulación del tablero?")) {
      setApplications((prev) => prev.filter((app) => app.id !== id));
    }
  }

  function handleQuickTrack(boardName: string, queryUrl: string) {
    setApplicationDraft({
      company: "",
      role: filters.role.trim() || "Nuevo puesto",
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
    const header = ["Empresa", "Puesto", "Portal / Fuente", "Enlace", "Estado", "Fecha"];
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

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="JobDorker, inicio">
          <span className="brand-mark">JD</span>
          <span>JobDorker</span>
        </a>
        <div className="topbar-actions">
          <a className="nav-pill" href="#tablero">
            📋 {applications.length} {applications.length === 1 ? "postulación" : "postulaciones"}
          </a>
          <span className="saved-count">
            🔖 {savedSearches.length} {savedSearches.length === 1 ? "búsqueda guardada" : "búsquedas guardadas"}
          </span>
          <a className="support-link" href={SUPPORT_URL} target="_blank" rel="noreferrer" onClick={(event) => handleExternalLink(event, SUPPORT_URL)}>
            <img src={KOFI_BADGE_URL} alt="Apoyar JobDorker en Ko-fi" />
          </a>
        </div>
      </header>

      <section className="hero" id="inicio">
        <p className="eyebrow">BÚSQUEDA LABORAL INTENCIONAL</p>
        <h1>Encontrá oportunidades<br /><em>mejor enfocadas.</em></h1>
        <p className="hero-copy">Escribí el trabajo que buscás, elegí dónde querés trabajar y revisá ofertas en portales reales.</p>

        <form className="search-card" onSubmit={search}>
          <label htmlFor="role">¿Qué trabajo estás buscando?</label>
          <div className="main-search-row">
            <input id="role" value={filters.role} onChange={(event) => update("role", event.target.value)} placeholder="Ej. soporte técnico, plomero, odontóloga, devops" autoComplete="off" />
            <button className="primary-button" type="submit">Buscar ofertas <span>→</span></button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="quick-filters">
            <label>¿Dónde querés trabajar?
              <select value={filters.location} onChange={(event) => update("location", event.target.value)}>
                <option>Cualquiera</option><option>Argentina</option><option>Chile</option><option>Colombia</option><option>México</option><option>Uruguay</option><option>Remoto</option>
              </select>
            </label>
            <label>¿Cómo querés trabajar?
              <select value={filters.modality} onChange={(event) => update("modality", event.target.value)}>
                <option>Remoto</option><option>Híbrido</option><option>Presencial</option><option>Cualquiera</option>
              </select>
            </label>
            <button className="text-button" type="button" onClick={() => setShowFilters((visible) => !visible)}>{showFilters ? "Ocultar opciones" : "Ver más opciones"}</button>
          </div>
          {showFilters && <div className="advanced-filters">
            <label>Experiencia<select value={filters.seniority} onChange={(event) => update("seniority", event.target.value)}><option>Cualquiera</option><option>Junior</option><option>Semi Senior</option><option>Senior</option><option>Lead</option></select></label>
            <label>Idioma de la oferta<select value={filters.language} onChange={(event) => update("language", event.target.value)}><option>Cualquiera</option><option>Español</option><option>Inglés</option><option>Portugués</option></select></label>
            <label>Fecha de publicación<select value={filters.recent} onChange={(event) => update("recent", event.target.value)}><option>Cualquiera</option><option>Últimas 24 h</option><option>Última semana</option><option>Último mes</option></select></label>
          </div>}
        </form>
      </section>

      <section className="results-section" aria-live="polite">
        {!searched ? <div className="empty-state"><span className="empty-icon">⌁</span><h2>Empezá por el trabajo que buscás.</h2><p>Después te mostramos sitios donde podés encontrar ofertas.</p></div> : <>
          <div className="results-heading">
            <div><p className="eyebrow">SITIOS PARA BUSCAR</p><h2>Elegí dónde ver ofertas de {filters.role}</h2><p className="route-explainer"><strong>Ver ofertas</strong> usa lo que elegiste arriba. Si aparecen pocas, usá <strong>Ver más resultados</strong>.</p></div>
            <button className="secondary-button" type="button" onClick={saveSearch}>Guardar búsqueda</button>
          </div>
          {SOURCE_GROUPS.map((group) => {
            const groupResults = results.filter((result) => result.group === group.id);
            return <section className="source-group" key={group.id}>
              <div className="source-group-heading"><h3>{group.title}</h3><p>{group.description}</p></div>
              <div className="source-grid">
            {groupResults.map((result) => <article className="source-card" key={result.name}>
              <div className="source-card-top"><span className="source-initial">{result.short}</span><div><h3>{result.name}</h3><p>{result.note}</p></div></div>
              <div className="source-actions">
                <a className="source-open" href={result.url} target="_blank" rel="noreferrer" onClick={(event) => handleExternalLink(event, result.url)}>Ver ofertas <span>↗</span></a>
                {result.hasFilters && <button className="source-broaden" type="button" onClick={() => void openExternal(result.broadUrl)}>Ver más</button>}
                <button className="source-copy" type="button" onClick={() => copyQuery(result.name, result.query)}>{copied === result.name ? "Copiado" : "Copiar dork"}</button>
                <button className="source-track" type="button" title="Seguir postulación en mi tablero" onClick={() => handleQuickTrack(result.name, result.url)}>+ Postulación</button>
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
            <p className="eyebrow">SEGUIMIENTO LOCAL Y PRIVADO</p>
            <h2>Mi tablero de postulaciones</h2>
            <p className="tracker-copy">
              Registrá tus ofertas en curso, entrevistas y estados. Los datos quedan únicamente en tu navegador o app.
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
              title={applications.length === 0 ? "No hay postulaciones para exportar" : "Descargar planilla CSV"}
            >
              Exportar CSV <span>↓</span>
            </button>
          </div>
        </div>

        {showApplicationForm && (
          <form className="application-form" onSubmit={handleAddApplication}>
            <div className="application-form-title">
              <h3>Registrar postulación</h3>
              <p>Completá los datos de la vacante para hacerle seguimiento.</p>
            </div>
            <div className="application-form-grid">
              <label>
                Empresa *
                <input
                  type="text"
                  placeholder="Ej. Mercado Libre, Auth0, Estudio Jurídico"
                  value={applicationDraft.company}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, company: e.target.value }))}
                />
              </label>
              <label>
                Puesto / Rol *
                <input
                  type="text"
                  placeholder="Ej. Soporte Técnico L2, Frontend Dev"
                  value={applicationDraft.role}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, role: e.target.value }))}
                />
              </label>
              <label>
                Portal o Fuente
                <input
                  type="text"
                  placeholder="Ej. Greenhouse, LinkedIn, Web directa"
                  value={applicationDraft.source}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, source: e.target.value }))}
                />
              </label>
              <label>
                Enlace a la oferta
                <input
                  type="url"
                  placeholder="https://..."
                  value={applicationDraft.url}
                  onChange={(e) => setApplicationDraft((d) => ({ ...d, url: e.target.value }))}
                />
              </label>
              <label>
                Estado
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
                Guardar en el tablero
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
          <span className="filter-label">Filtrar por estado:</span>
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
            <span className="empty-tracker-icon">📌</span>
            <h3>Tu tablero está vacío</h3>
            <p>
              Agregá postulaciones manualmente con el botón <strong>+ Nueva postulación</strong> o hacé clic en <strong>+ Postulación</strong> desde las tarjetas de búsqueda.
            </p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-tracker">
            <p>No tenés ninguna postulación con el estado <strong>"{statusFilter}"</strong>.</p>
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
                  <span>📍 {app.source}</span>
                  <span>📅 {app.date}</span>
                </div>

                <div className="app-card-footer">
                  <label className="status-change-label">
                    Cambiar estado:
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
                        Abrir oferta ↗
                      </button>
                    )}
                    <button
                      className="text-action-delete"
                      type="button"
                      onClick={() => handleDeleteApplication(app.id)}
                      title="Eliminar del tablero"
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

      {savedSearches.length > 0 && <section className="saved-section"><div><p className="eyebrow">VOLVER MÁS TARDE</p><h2>Búsquedas guardadas</h2><p>Elegí una para volver a usarla.</p></div><div className="saved-list">{savedSearches.slice(0, 4).map((item) => <button key={item.id} onClick={() => { setFilters(item); setSearched(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>{item.role}</span><small>{item.location} · {item.modality}</small></button>)}</div></section>}

      <footer><span>JobDorker</span><span>Hecho para buscar empleo con intención y privacidad.</span></footer>
    </main>
  );
}
