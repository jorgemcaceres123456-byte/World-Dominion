# Aethoria — World Sandbox

Sandbox de fantasía pixel art en español. Puedes explorar un atlas poblado, dibujar tu propio mundo desde cero o tomar la corona de un reino. Todo se ejecuta en el navegador, sin cuentas, servicios externos ni claves API.

## Empezar

Con Node.js 22 o superior:

```sh
npm ci
npm run dev
```

Abre la dirección que muestra Vite. La **portada** recorre el Valle de Valdoria, los Jardines de Akitsune y el oasis de Azharim. Puedes cambiar de paisaje, pausar la cinemática o silenciarla. Se respeta la preferencia del sistema de movimiento reducido.

| Entrada del menú            | Qué abre                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Entrar al mundo** (`J`)   | Aethoria en modo creador, con la cámara sobre Eldoria.                                                                            |
| **Crear un mundo** (`N`)    | Una partida independiente: elige nombre, semilla, tamaño, materiales, reloj y terreno inicial.                                    |
| **Gobernar un reino** (`R`) | Elige un mundo y busca un reino habitado por nombre o continente para entrar directamente como gobernante.                        |
| **Mis mundos** (`M`)        | Continúa una partida con su cámara, su reloj y su modo de juego. Solo los mundos personales se pueden eliminar, con confirmación. |

### Aethoria y las escalas

El atlas predeterminado (semilla **7319**) conserva los **63 países**, nueve por continente, sus biomas, culturas y religiones: **Eldoria, Kaizhan, Solandria, Varkhonia, Ambaria, Zarynth y Thalassia**. El códice de la portada enumera los países y biomas; el atlas del juego refleja la población y las fronteras actuales.

| Tamaño                 |            Terreno local | Zoom máximo |
| ---------------------- | -----------------------: | ----------: |
| Grande                 |     2.120 × 1.200 celdas |         64× |
| Gigante                |     4.240 × 2.400 celdas |        128× |
| **Colosal** (Aethoria) | **8.480 × 4.800 celdas** |    **256×** |

Colosal tiene **40.704.000 celdas**. El atlas regional de 1.060 × 600 sirve de índice: cada celda regional abarca 8 × 8 locales. Al acercarte se generan distritos, aldeas, cultivos y vegetación por sectores; el juego no carga todo el paisaje detallado en memoria. Un trazo local puede modificar solo una parte de una celda regional. Con el zoom máximo solo caben unas **33 celdas** a lo ancho de la pantalla. Pulsa el **minimapa** para viajar sin recorrer toda esa distancia, o el **globo** para volver a la vista global.

### Fundar tu primer reino

1. En **Crear un mundo**, elige **Tierra virgen** (continentes sin países) u **Océano vacío**. Para el océano, usa **Terreno → Pradera** y pinta una isla.
2. En **Criaturas → Humano**, toca tierra libre. El colono funda una aldea justo donde lo colocaste. Aparecen su estandarte y un **nombre medieval generado** según la región. Puedes verlo en el mapa, el inspector, las crónicas y el selector de corona.
3. Coloca más habitantes dentro de sus fronteras para poblarlo, o coloca otro colono lejos para fundar otro reino. Los límites crecen con los años sin reclamar por sí solos las aldeas vecinas. Cada partida admite hasta 63 reinos activos.
4. Para pasar al gobierno, elige **Modo reino**, o vuelve a la portada con el botón de la casa y entra por **Gobernar un reino**.

### Construir, gobernar y simular

- **Modo creador:** pinta terreno y biomas; coloca minerales, recursos, criaturas y **42 objetos**: 18 edificios, 9 plantas, 5 minerales, 6 animales y 4 reliquias. Filtra **Objetos** por familia. El botón de papelera permite retirar un objeto del catálogo sin borrar el terreno.
- **Materiales:** elige sandbox ilimitado o un kit de **240 madera, 180 piedra, 90 hierro y 60 esencia**. Consulta o repón el kit en **Materiales**. Los pinceles de terreno y los primeros pobladores son gratuitos. Molinos y trigales producen alimentos; aserraderos, madera; canteras, piedra; forjas, hierro; santuarios, maná. La producción se acredita por estación al reino que ocupa el lugar. Los objetos en tierra libre esperan a los primeros colonos.
- **Modo reino:** cultiva, edifica, abre minas, celebra festivales y forma magos. En **Obras**, elige un edificio y colócalo en tus dominios. Se usan las reservas del **reino**, no el kit del creador; el maná sustituye a la esencia. La ficha muestra existencias, superficie, producción de objetos, aliados y enemigos.
- **Fronteras:** en **Ficha del reino → Dibujar fronteras**, pinta sobre tierra. Si se inunda la capital, se traslada a un punto habitable mientras quede territorio.
- **Historia viva:** las estaciones traen cosechas, nacimientos, alianzas, guerras y desastres naturales. Los ataques de magos oscuros y las incursiones del inframundo son menos frecuentes. También puedes provocar sucesos con **Poderes**. Las crónicas los registran y se pueden filtrar.
- **Magia:** hay **20 razas**. En una invocación o nacimiento al azar, dioses y demonios tienen **5% cada uno**; también se pueden colocar expresamente. Ambos tienen rangos bajo, medio, alto y supremo. Hay **11 identidades supremas únicas por orden**; la undécima, Aethor o Vaelkor, domina **Todo**. Magos, portadores de espíritus y poseídos tienen hechizos que consumen maná. Los portales producen incursiones temporales y los guardianes pueden repelerlas.

### Controles y reloj

| Control                    | Acción                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Clic / toque               | Inspeccionar o usar la herramienta elegida.                                                        |
| Arrastrar con Inspeccionar | Mover la cámara. Con una herramienta activa, usa Mayús + arrastre o arrastra con el botón derecho. |
| Rueda, pinza, `+` / `−`    | Acercarse o alejarse. A gran aumento, el pincel mínimo edita una sola celda local.                 |
| `0` / flechas              | Vista global / mover cámara.                                                                       |
| `1`–`9` / `B`              | Herramienta de la categoría actual / tamaño de pincel.                                             |
| `Espacio` / `F`            | Pausa / pantalla completa.                                                                         |
| `Esc`                      | Cerrar un diálogo o cancelar una herramienta u obra.                                               |

Pulsa el **reloj junto a la pausa** para elegir **cualquier velocidad entera de 1× a 10×**, tantas veces como quieras. Cambiarla no quita la pausa. A 1× un año de cuatro estaciones dura aproximadamente 72 segundos; a 10×, 7,2 segundos. Abrir una ficha u ocultar la pestaña detiene el avance. **Ajustes → Ritmo de los sucesos** cambia la frecuencia de los acontecimientos, no la duración del año.

## Guardado

Cada partida usa su propia clave `aethoria.world.v2:<id>` en `localStorage`. Se conservan terreno, objetos, nombres, censos, fronteras, pactos, magia, reloj y reino gobernado. Crear otro mundo **no reemplaza** el anterior. **Guardar** confirma el guardado manual. Las partidas V1 de `aethoria.atlas.v1` se migran una vez y se deja intacta la clave antigua.

Las partidas pertenecen **al navegador y al dominio**: un enlace `?mundo=…` no envía la partida a otro equipo. Borrar datos del sitio elimina los guardados. No hay sincronización en la nube ni simulación mientras el juego está cerrado.

## Desplegar en Vercel

1. Importa en Vercel el repositorio y la rama que contiene esta versión (directorio raíz `.`).
2. `vercel.json` ya configura **Vite**, instalación `npm ci`, compilación `npm run build` y salida **`dist`**. No hay variables de entorno que configurar.
3. Pulsa **Deploy**. La raíz abre la portada; `/?mundo=aethoria` abre el atlas. Las rutas de mundos usan parámetros de consulta, sin servidor de API ni reglas de reescritura. También puedes desplegar desde una copia local con la CLI de Vercel.

Para comprobar el mismo artefacto localmente:

```sh
npm run build
npm run preview
```

## Pruebas

```sh
npm test                       # Geografía, simulación, fundación, objetos, migración y archivos
npx playwright install chromium # Solo la primera vez, para las pruebas de interfaz
npm run test:e2e               # Compila y prueba la versión estática con Chromium, escritorio y táctil
```

`CHROMIUM_PATH` permite indicar un Chromium ya instalado. Las pruebas de interfaz no necesitan una cuenta en Vercel ni una base de datos.

## Código y recursos

- `src/boot.js`, `menu.js`, `cinema.js`, `worlds.js`: portada y cinemática, creación y biblioteca de partidas.
- `src/data.js`, `geography.js`, `frontier.js`, `territory.js`: atlas, pinceles, fundaciones, fronteras y nombres.
- `src/sim.js`, `objects.js`: estaciones, economía, catálogo, diplomacia, magia y sucesos.
- `src/art.js`, `prop-art.js`, `map.js`, `local-map.js`: sprites, cámara, minimapa y sectores con caché acotada.
- `src/main.js`, `windows.js`: juego, controles, inspector, atlas y gobierno.

El arte y los paisajes se incluyen localmente; no se usan recursos de WorldBox. Fuentes Cinzel, Pixelify Sans, Silkscreen y DM Sans bajo SIL Open Font License (licencias en `public/fonts/`). Iconos Lucide bajo ISC.
