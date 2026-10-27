# telerehabilitation_admin

Panel web del terapeuta de la plataforma de telefisioterapia (Vue 3, Vue CLI).
Esta versión es una copia propia del panel original, integrada con el Servicio
de Procesamiento del trabajo de grado (Universidad Antonio Nariño, grupo
LACSER/Bioingeniería): las gráficas, exportaciones y el visor 3D muestran el
movimiento medido por el servicio; el análisis en el navegador es solo
previsualización.

- Decisiones de diseño, reglas y contrato con el servicio:
  [`docs/DECISIONES_TECNICAS.md`](docs/DECISIONES_TECNICAS.md).
- Planes de trabajo, hallazgos de la plataforma original y significado de
  los códigos que citan los comentarios: también en `docs/DECISIONES_TECNICAS.md`.
- Manuales: [`docs/MANUAL_USUARIO.md`](docs/MANUAL_USUARIO.md) y
  [`docs/MANUAL_TECNICO.md`](docs/MANUAL_TECNICO.md).

**Repositorios relacionados:**

| Repositorio | Qué es |
|---|---|
| [`telefisioterapia-backend`](https://github.com/davidgarcia05042-netizen/telefisioterapia-backend) | Backend de la plataforma (Django + DRF) |
| [`telefisioterapia-app`](https://github.com/davidgarcia05042-netizen/telefisioterapia-app) | App Android del paciente |
| [`servicio-procesamiento-pose`](https://github.com/davidgarcia05042-netizen/servicio-procesamiento-pose) | Servicio de Procesamiento (FastAPI + Celery, MediaPipe) |
| [`entorno-pruebas`](https://github.com/davidgarcia05042-netizen/entorno-pruebas) | Comparación de modelos de pose contra gold standard de laboratorio |
| [`pose-benchmark`](https://github.com/davidgarcia05042-netizen/pose-benchmark) | Tiempo, CPU y memoria de cada modelo |

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
