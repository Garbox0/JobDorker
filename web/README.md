# JobDorker Web

Nueva interfaz local de JobDorker, construida con React y Vite. No necesita backend para generar búsquedas ni guardar favoritos: usa el almacenamiento del navegador.

El proyecto usa pnpm 12.4.2 mediante Corepack.

```powershell
cd E:\JobDorker\web
pnpm install --frozen-lockfile
pnpm run dev
```

Abrí la dirección que indique Vite, normalmente `http://localhost:5173`.

Para crear una versión estática:

```powershell
pnpm run build
```

## Aplicación de Windows

Con Rust instalado, el mismo proyecto se ejecuta como aplicación de escritorio:

```powershell
pnpm run desktop:dev
```

Para crear el instalador de Windows:

```powershell
pnpm run desktop:build
```
