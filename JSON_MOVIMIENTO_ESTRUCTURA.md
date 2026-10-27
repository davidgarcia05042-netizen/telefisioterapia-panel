# Estructura del JSON de Movimiento

Este documento describe la estructura del archivo JSON generado por la funcionalidad **"Descargar JSON de Movimiento"** en la vista de ejercicio del panel de administración de telerehabilitación.

El archivo contiene los datos de análisis de pose obtenidos mediante **MediaPipe Pose Landmarker** al reproducir el video del ejercicio en el navegador.

---

## Estructura General

```json
{
  "exercise_id": 123,
  "exercise_name": "Flexión de codo",
  "duration": 30.5,
  "frames": [ ... ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `exercise_id` | `number` | Identificador único del ejercicio en la API. |
| `exercise_name` | `string` | Nombre descriptivo del ejercicio. |
| `duration` | `number` | Duración total del video en segundos. |
| `frames` | `array` | Array de objetos frame, ordenados cronológicamente por tiempo ascendente. |

---

## Estructura de cada Frame

Cada elemento del array `frames` tiene la siguiente estructura:

```json
{
  "t": 0.0333,
  "points": [
    [0.5412, 0.3201, -0.1234, 0.9987],
    [0.5100, 0.4502, -0.0981, 0.9954],
    ...
  ],
  "angles": {
    "left_elbow": 145.23,
    "right_shoulder": 89.67
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `t` | `number` | Marca de tiempo del frame en el video, expresada en **segundos** con hasta 4 decimales de precisión. |
| `points` | `array` | Array de los **33 landmarks** del esqueleto detectados por MediaPipe. Cada landmark es un sub-array de 4 valores numéricos. |
| `angles` | `object` | Objeto clave-valor con los ángulos articulares calculados. Solo incluye los puntos que están configurados como "puntos rastreados" en el ejercicio. |

---

## Estructura de cada Point (Landmark)

Cada elemento del array `points` es un sub-array con 4 valores:

```json
[x, y, z, visibility]
```

| Índice | Nombre | Tipo | Rango | Descripción |
|--------|--------|------|-------|-------------|
| 0 | `x` | `number` | 0.0 – 1.0 | Coordenada horizontal normalizada. 0 = borde izquierdo de la imagen, 1 = borde derecho. |
| 1 | `y` | `number` | 0.0 – 1.0 | Coordenada vertical normalizada. 0 = borde superior de la imagen, 1 = borde inferior. |
| 2 | `z` | `number` | (negativo a positivo) | Profundidad relativa. Valores más negativos indican que el punto está más cerca de la cámara. |
| 3 | `visibility` | `number` | 0.0 – 1.0 | Confianza de la detección. Valores cercanos a 1.0 indican que el punto es claramente visible; valores cercanos a 0.0 indican que está ocluido o fuera de cámara. |

Todos los valores se redondean a **4 decimales**.

---

## Mapa de Índices de Landmarks (MediaPipe Pose)

El array `points` contiene **33 landmarks** ordenados según el estándar de MediaPipe Pose Landmarker:

| Índice | Landmark | Descripción |
|--------|----------|-------------|
| 0 | `NOSE` | Nariz |
| 1 | `LEFT_EYE_INNER` | Ojo izquierdo (esquina interna) |
| 2 | `LEFT_EYE` | Ojo izquierdo (centro) |
| 3 | `LEFT_EYE_OUTER` | Ojo izquierdo (esquina externa) |
| 4 | `RIGHT_EYE_INNER` | Ojo derecho (esquina interna) |
| 5 | `RIGHT_EYE` | Ojo derecho (centro) |
| 6 | `RIGHT_EYE_OUTER` | Ojo derecho (esquina externa) |
| 7 | `LEFT_EAR` | Oreja izquierda |
| 8 | `RIGHT_EAR` | Oreja derecha |
| 9 | `MOUTH_LEFT` | Comisura izquierda de la boca |
| 10 | `MOUTH_RIGHT` | Comisura derecha de la boca |
| 11 | `LEFT_SHOULDER` | Hombro izquierdo |
| 12 | `RIGHT_SHOULDER` | Hombro derecho |
| 13 | `LEFT_ELBOW` | Codo izquierdo |
| 14 | `RIGHT_ELBOW` | Codo derecho |
| 15 | `LEFT_WRIST` | Muñeca izquierda |
| 16 | `RIGHT_WRIST` | Muñeca derecha |
| 17 | `LEFT_PINKY` | Meñique izquierdo |
| 18 | `RIGHT_PINKY` | Meñique derecho |
| 19 | `LEFT_INDEX` | Índice izquierdo (mano) |
| 20 | `RIGHT_INDEX` | Índice derecho (mano) |
| 21 | `LEFT_THUMB` | Pulgar izquierdo |
| 22 | `RIGHT_THUMB` | Pulgar derecho |
| 23 | `LEFT_HIP` | Cadera izquierda |
| 24 | `RIGHT_HIP` | Cadera derecha |
| 25 | `LEFT_KNEE` | Rodilla izquierda |
| 26 | `RIGHT_KNEE` | Rodilla derecha |
| 27 | `LEFT_ANKLE` | Tobillo izquierdo |
| 28 | `RIGHT_ANKLE` | Tobillo derecho |
| 29 | `LEFT_HEEL` | Talón izquierdo |
| 30 | `RIGHT_HEEL` | Talón derecho |
| 31 | `LEFT_FOOT_INDEX` | Índice del pie izquierdo |
| 32 | `RIGHT_FOOT_INDEX` | Índice del pie derecho |

---

## Estructura del campo `angles`

El objeto `angles` contiene únicamente los ángulos de los puntos que están configurados como **"puntos rastreados"** (`tracked_points`) en el ejercicio. Las claves son los `codename` de cada punto rastreado.

```json
{
  "left_elbow": 145.23,
  "right_knee": 89.67
}
```

- Los **valores** representan el ángulo en **grados (°)**, calculado entre el punto rastreado y sus dos puntos adyacentes (`left_point` y `right_point` configurados en la API).
- Si un ejercicio no tiene puntos rastreados configurados, este objeto estará vacío (`{}`).

---

## Frecuencia de Muestreo

La frecuencia de muestreo **no es fija** y depende de las condiciones de ejecución:

- Si el navegador soporta `requestVideoFrameCallback`: se captura **un frame por cada frame del video** (típicamente ~24-30 fps según el video).
- Si no, usa `requestAnimationFrame`: se captura a la tasa de refresco del monitor (~60 fps), aunque muchos frames pueden ser redundantes.
- La resolución temporal mínima es de **0.01 segundos** ya que internamente los frames se indexan con el `currentTime` del video redondeado a 2 decimales. Si dos detecciones caen en el mismo intervalo de 0.01s, la segunda sobrescribe a la primera.

### Número aproximado de frames

Para estimar el número de filas en el JSON:

```
Frames ≈ Duración del video (s) × Framerate efectivo del video (~24-30 fps)
```

**Ejemplo**: Un video de 30 segundos a 30 fps generaría aproximadamente **~900 frames**.

---

## Ejemplo Completo

```json
{
  "exercise_id": 42,
  "exercise_name": "Flexión de codo izquierdo",
  "duration": 15.234,
  "frames": [
    {
      "t": 0.0,
      "points": [
        [0.4821, 0.1523, -0.0312, 0.9991],
        [0.4712, 0.1401, -0.0289, 0.9985],
        [0.4698, 0.1398, -0.0291, 0.9982],
        [0.4680, 0.1405, -0.0295, 0.9978],
        [0.4935, 0.1389, -0.0278, 0.9989],
        [0.4951, 0.1385, -0.0275, 0.9986],
        [0.4968, 0.1392, -0.0280, 0.9981],
        [0.4590, 0.1512, -0.0201, 0.9945],
        [0.5045, 0.1498, -0.0195, 0.9950],
        [0.4750, 0.1698, -0.0310, 0.9970],
        [0.4890, 0.1695, -0.0305, 0.9968],
        [0.4210, 0.2850, -0.0150, 0.9990],
        [0.5430, 0.2830, -0.0145, 0.9988],
        [0.3890, 0.4120, -0.0280, 0.9975],
        [0.5780, 0.4100, -0.0270, 0.9972],
        [0.3650, 0.5200, -0.0350, 0.9960],
        [0.6010, 0.5180, -0.0340, 0.9958],
        [0.3580, 0.5380, -0.0410, 0.9940],
        [0.6080, 0.5360, -0.0400, 0.9938],
        [0.3550, 0.5350, -0.0390, 0.9942],
        [0.6110, 0.5330, -0.0380, 0.9940],
        [0.3600, 0.5300, -0.0370, 0.9945],
        [0.6060, 0.5280, -0.0360, 0.9943],
        [0.4350, 0.6500, -0.0100, 0.9995],
        [0.5290, 0.6480, -0.0095, 0.9993],
        [0.4400, 0.8200, -0.0050, 0.9990],
        [0.5240, 0.8180, -0.0045, 0.9988],
        [0.4450, 0.9500, -0.0020, 0.9985],
        [0.5190, 0.9480, -0.0015, 0.9983],
        [0.4480, 0.9650, 0.0010, 0.9980],
        [0.5160, 0.9630, 0.0015, 0.9978],
        [0.4420, 0.9700, -0.0005, 0.9975],
        [0.5200, 0.9680, 0.0000, 0.9973]
      ],
      "angles": {
        "left_elbow": 162.45
      }
    },
    {
      "t": 0.0333,
      "points": [ "... (33 landmarks)" ],
      "angles": {
        "left_elbow": 158.12
      }
    }
  ]
}
```
