````md
# Política de Seguridad

La seguridad de JobDorker y de sus usuarios es importante.

Si encontrás una vulnerabilidad, agradecemos que la reportes de forma responsable para que pueda ser investigada y corregida antes de hacerla pública.

---

## Versiones soportadas

Actualmente se proporcionan correcciones de seguridad para las siguientes versiones:

| Versión | Soportada|
|  2.0.x  |    ✅   |
|  1.x.x  |    ❌   |
|  < 1.0  |    ❌   |

Se recomienda utilizar siempre la última versión disponible de JobDorker.

👉 https://github.com/Garbox0/JobDorker/releases/latest

---

## Reportar una vulnerabilidad

Por favor, **no abras un Issue público** si encontrás una vulnerabilidad de seguridad.

Si está disponible, utilizá la función de GitHub:

**Security → Report a vulnerability**

para enviar el reporte de manera privada.

Incluí, cuando sea posible:

- Descripción de la vulnerabilidad
- Versión afectada
- Sistema operativo
- Pasos para reproducir el problema
- Impacto potencial
- Logs o capturas relevantes
- Prueba de concepto (PoC), si corresponde
- Sugerencias de mitigación, si las hubiera

No es necesario incluir información personal o sensible innecesaria.

---

## Divulgación responsable

Pedimos que las vulnerabilidades no sean divulgadas públicamente hasta que:

1. El problema haya sido investigado.
2. Se haya desarrollado una corrección o mitigación.
3. Los usuarios hayan tenido tiempo razonable para actualizar.

Una vez solucionado el problema, podremos coordinar la publicación de los detalles técnicos cuando corresponda.

---

## Alcance

Los reportes relacionados con seguridad pueden incluir, entre otros:

- Ejecución de código no deseada
- Inyección de comandos
- Path traversal
- Manipulación insegura de archivos
- Exposición de información sensible
- Problemas en la aplicación Tauri
- Vulnerabilidades relacionadas con dependencias
- XSS u otros problemas relacionados con la versión Web
- Modificación o ejecución no autorizada de datos locales
- Problemas en los mecanismos de exportación o importación
- Vulnerabilidades que permitan alterar el comportamiento de JobDorker

---

## Fuera de alcance

Generalmente no se consideran vulnerabilidades de JobDorker:

- Advertencias de Windows SmartScreen provocadas por la ausencia de una firma digital comercial
- Resultados obtenidos mediante Google Dorks
- Contenido o vulnerabilidades presentes en sitios externos encontrados mediante JobDorker
- Problemas propios de Google, LinkedIn, portales de empleo o ATS externos
- Ingeniería social contra usuarios
- Vulnerabilidades que requieran que el usuario modifique intencionalmente el código fuente antes de compilarlo

---

## Integridad de los releases

Los releases oficiales incluyen hashes **SHA256** para permitir verificar la integridad de los archivos descargados.

Los checksums se encuentran en:

```text
SHA256SUMS.txt
````

Los binarios oficiales deben descargarse exclusivamente desde:

[https://github.com/Garbox0/JobDorker/releases](https://github.com/Garbox0/JobDorker/releases)

Ejemplo de verificación en PowerShell:

```powershell
Get-FileHash .\JobDorker_2.0.0_x64-setup.exe -Algorithm SHA256
```

Compará el resultado con el hash publicado en `SHA256SUMS.txt`.

---

## Dependencias

JobDorker utiliza tecnologías y dependencias de terceros.

Entre ellas:

* React
* TypeScript
* Vite
* Tauri
* Rust
* Python

Las vulnerabilidades conocidas en dependencias pueden ser reportadas si afectan directamente a JobDorker.

---

## Buenas prácticas

Nunca descargues ejecutables de JobDorker desde fuentes no oficiales.

La fuente oficial del proyecto es:

[https://github.com/Garbox0/JobDorker](https://github.com/Garbox0/JobDorker)

---

## Agradecimientos

Agradecemos a investigadores, desarrolladores y usuarios que reporten vulnerabilidades de manera responsable y ayuden a mejorar la seguridad del proyecto.

````
