Sí. Tu idea ya está bastante buena, solo necesita **ordenarse como experiencia** para que se sienta clara, adictiva y con intención.

Te la organizo como una **estructura de juego/producto**, para que luego puedas pasarla a diseño o a código.

---

# Concepto general

La experiencia es una **invitación interactiva en forma de juego de ruleta**.

La usuaria entra, entiende rápidamente las reglas, compromete una cantidad inicial de “besos”, firma simbólicamente ese compromiso y luego empieza a jugar.
Durante el juego, los resultados de la ruleta se traducen en dos consecuencias reales:

- si gana, acumula monedas para canjear premios en la tienda
- si pierde, aumenta la cantidad de besos que te debe

La tienda muestra premios atractivos, pero deja claro que **solo podrá reclamarlos si acepta la invitación**.

---

# Objetivo del juego

Hay dos objetivos simultáneos:

**Para ella**

- ganar monedas
- desbloquear premios que le gusten
- seguir jugando para conseguir algo mejor

**Para ti**

- hacer que invierta más besos
- descubrir qué premios le atraen más
- llevarla al momento final de aceptar la invitación

---

# Flujo completo de pantallas

## 1. Pantalla de entrada

Debe sentirse elegante, ligera y misteriosa.

Contenido:

- nombre del juego
- frase corta intrigante
- botón para comenzar

Ejemplo de tono:

- “Tienes una invitación secreta… pero primero debes jugar”
- “Pon a prueba tu suerte y descubre lo que te espera”

Botón:

- **Comenzar**

---

## 2. Modal de instrucciones

Este modal debe ser simple, visual y rápido de entender.
No mucho texto. Todo debe explicarse en 15–20 segundos.

Debe incluir:

### Qué significan los contadores

- **Besos invertidos**: los tokens que usa para girar
- **Besos perdidos**: los besos que te deberá si pierde
- **Monedas ganadas**: las que podrá usar en la tienda

### Cómo funciona la ruleta

- cada giro consume besos invertidos
- algunas casillas hacen ganar monedas
- algunas casillas hacen perder y aumentan los besos que te debe
- cuando se terminan los besos invertidos, puede comprometer más para seguir

### Cómo se gana realmente

- acumulando monedas para comprar premios en la tienda
- pero los premios solo pueden reclamarse si acepta la invitación

### Significado de íconos

Por ejemplo:

- 💋 = beso/token
- 💸 o 🪙 = moneda ganada
- 💔 o 😏 = beso que te debe
- 🎁 = premio / tienda
- 🎡 = suerte / ruleta
- 🔒 = requiere aceptar la invitación

Botón:

- **Entendido, quiero jugar**

---

## 3. Pantalla de compromiso inicial

Aquí empieza la parte divertida y psicológica.

La usuaria define cuántos besos compromete para iniciar.
Esto debe sentirse casi como una apuesta romántica.

### Elementos

- título tipo: **Compromete tus besos**
- selector fácil:
  - botones rápidos: 5, 10, 15, 20
  - o un slider

- texto de ayuda:
  - “Estos besos serán tu saldo para jugar”
  - “Si ganas, podrás convertir tu suerte en premios”
  - “Si pierdes, me los deberás 😏”

### Firma del compromiso

Esto le da peso simbólico y hace el juego más memorable.

Opciones:

- escribir su nombre
- dibujar una firma con el dedo/mouse
- marcar checkbox tipo:
  - “Acepto comprometer estos besos para jugar”

Ideal:

- nombre + firma simple

Botón:

- **Firmar y jugar**

---

# Pantalla principal del juego

Esta es la pantalla más importante. Debe estar muy limpia.

---

## Estructura de UI

## Parte superior: contadores

Aquí van los 3 indicadores principales:

### 1. Besos invertidos

Los tokens disponibles para girar.

Ejemplo:
**💋 Besos invertidos: 12**

### 2. Besos perdidos

Los besos que te debe por haber perdido.

Ejemplo:
**😏 Besos que me debes: 8**

### 3. Monedas ganadas

Las que podrá gastar en la tienda.

Ejemplo:
**🪙 Monedas ganadas: 45**

Estos 3 contadores deben estar siempre visibles.

---

## Centro: ruleta

La ruleta se muestra **a la mitad**, como tú dices, para optimizar espacio.
Buena decisión.

Puede ser:

- media ruleta en el centro
- aguja fija arriba
- animación de giro amplia y vistosa

Debe sentirse protagonista visual.

---

## Parte inferior: botón principal

Botón grande:
**Girar**

Este botón es el corazón del loop.

Debajo o cerca puedes poner texto contextual dinámico:

- “Un giro puede cambiarlo todo”
- “Tu suerte está en juego”
- “¿Te atreves a seguir?”

---

## Acceso a la tienda

La tienda debe estar visible, pero no robar protagonismo.

Opciones:

- botón flotante
- pestaña lateral
- botón bajo los contadores

Texto ideal:
**Tienda de premios**

Y debajo:
**Solo podrás reclamarlos si aceptas la invitación 🔒**

---

# Mecánica del loop

Aquí te la organizo en pasos claros.

## Estado inicial del loop

La jugadora tiene:

- una cantidad de besos invertidos
- cero o algunos besos perdidos
- cero o algunas monedas

## Acción

Presiona **Girar**

## Resultado

La ruleta cae en una casilla.

## Consecuencia

Dependiendo de la casilla:

- baja su saldo de besos invertidos
- aumenta monedas
- o aumenta los besos que te debe

## Reinicio del loop

Si todavía le quedan besos invertidos:

- puede volver a girar

Si ya no le quedan:

- aparece control para comprometer más besos

---

# Tipos de casillas recomendadas

Te conviene que la ruleta tenga una mezcla clara entre premio, castigo y tensión.

## Casillas positivas

Estas aumentan las monedas.

- **+5 monedas**
- **+10 monedas**
- **x2 monedas del giro**
- **Jackpot pequeño**
- **Premio sorpresa**
  Puede dar monedas extra o desbloquear algo visual

## Casillas negativas

Estas aumentan los besos que te debe.

- **Pierdes 2 besos**
- **Me debes 3 besos**
- **Beso doble para mí**
- **Castigo romántico**
- **Pierdes el giro y sumas deuda**

Aquí es importante que el lenguaje sea juguetón, no agresivo.

## Casillas mixtas

Estas vuelven el loop más interesante.

- **Gira otra vez**
- **Mitad premio / mitad deuda**
- **Premio riesgoso**
- **Todo o nada**
- **Doble apuesta en el siguiente giro**

---

# Regla clave de economía

Conviene separar muy bien los tres conceptos:

## Besos invertidos

Son el combustible para seguir jugando.

## Besos perdidos

No regresan al saldo de juego. Se van al contador de deuda romántica contigo.

## Monedas ganadas

No sirven para seguir jugando. Sirven solo para la tienda.

Eso hace que el sistema sea muy claro:

- los besos son la apuesta
- las monedas son la recompensa
- la deuda es la consecuencia

---

# Cuando se acaban los besos

Esto debe ser muy fácil, muy natural y nada frustrante.

En cuanto los besos invertidos llegan a cero:

Aparece un modal o panel corto:

**Te quedaste sin besos para jugar**
**¿Quieres comprometer más para seguir y ganar mejores premios?**

Opciones rápidas:

- +5 besos
- +10 besos
- +15 besos

Y de nuevo:

- mini confirmación o firma ligera
- o una sola vez basta con la firma inicial y luego solo confirma

Botón:
**Comprometer más besos**

Esto es clave porque mantiene vivo el loop y aumenta tu beneficio.

---

# Tienda de premios

La tienda no solo sirve como recompensa.
También te sirve para entender qué cosas le interesan más.

---

## Cómo debe funcionar

La tienda muestra varios regalos con precio en monedas.

Ejemplo de progresión:

- chocolate
- snack favorito
- café
- postre
- peluche pequeño
- flor
- skincare pequeño
- tarjeta regalo
- vale de supermercado
- vale Dollar City
- vale de Q400

---

## Estructura de cada item

Cada regalo debe mostrar:

- imagen o ícono
- nombre
- precio en monedas
- estado

Estados:

- **Disponible**
- **Te faltan X monedas**
- **Desbloqueado**
- **Requiere aceptar la invitación**

---

## Mensaje fijo de la tienda

Esto debe repetirse claramente:

**Los premios desbloqueados solo podrán reclamarse si aceptas la invitación 💖**

Incluso cuando intente comprar, si no ha aceptado:

- deja que “reserve” o “desbloquee”
- pero no que “cobre”

Eso genera tensión y expectativa.

---

# Incentivo para aceptar la invitación

Este punto debe estar integrado, no sentirse forzado.

## Forma correcta

No bloquear el juego completo.
Bloquear solo el **canje real** de premios.

Eso hace que ella piense:

- “ya gané esto”
- “ya desbloqueé esto”
- “quiero reclamarlo”

Y la única forma es aceptar.

---

## Mensajes recomendados

- “Premio desbloqueado. Podrás reclamarlo al aceptar la invitación.”
- “Ya tienes suficientes monedas para este regalo.”
- “Aceptar la invitación desbloquea el canje de todos tus premios.”
- “Tu premio te espera. Solo falta una decisión 💖”

---

# Animaciones

Sí, aquí son fundamentales.
Sin esto, el juego pierde muchísimo encanto.

---

## Animación al ganar monedas

Cuando la ruleta cae en una casilla positiva:

- aparecen monedas brillantes desde la casilla
- vuelan hasta el contador de monedas
- el contador hace bounce o pulso

## Animación al perder / deber besos

Cuando cae en una casilla negativa:

- aparecen besos saliendo de la ruleta
- viajan hacia el contador de “besos que me debes”
- ese contador se anima con rebote o glow

## Animación de consumo de besos invertidos

Cada giro debe:

- restar visualmente del contador de besos invertidos
- quizá un pequeño beso baja o se desvanece

## Animación de tienda

Cuando desbloquea un regalo:

- brilla la tarjeta del premio
- aparece una cintita “Desbloqueado”
- o un candado que se convierte en “Reservado”

---

# Sensación emocional que debe tener

No debe sentirse como “te estoy cobrando algo”.

Debe sentirse como:

- coqueteo
- juego
- tensión divertida
- sorpresa
- recompensa

El tono debe ser:

- juguetón
- romántico
- un poco travieso
- nunca pesado

---

# Resumen del sistema

## Entrada

Presentación misteriosa.

## Instrucciones

Modal simple con íconos y reglas.

## Compromiso

Define cuántos besos apostará y firma.

## Juego

Gira la ruleta usando besos invertidos.

## Resultados

- si gana, obtiene monedas
- si pierde, aumenta lo que te debe

## Recompra

Cuando se queda sin besos, compromete más y sigue.

## Tienda

Ve regalos desbloqueables según monedas.

## Cierre

Puede desbloquear premios, pero solo cobrarlos si acepta la invitación.

---

# Recomendación de UX

Para que funcione mejor, yo lo dejaría con esta jerarquía:

1. entender rápido
2. comprometer besos
3. girar varias veces sin fricción
4. ver premios atractivos
5. quedarse sin saldo
6. comprometer más
7. desbloquear premios
8. aceptar invitación para cobrarlos

Ese flujo está muy bien armado.

---

# Versión más limpia de tus ideas, ya organizada

## Pantallas

- Inicio
- Modal de instrucciones
- Compromiso de besos + firma
- Juego principal
- Tienda de premios
- Estado final de aceptación de invitación

## Contadores

- Besos invertidos
- Besos que me debe
- Monedas ganadas

## Loop

- gastar besos para girar
- resultado positivo suma monedas
- resultado negativo suma besos que me debe
- si se queda sin besos, compromete más
- usa monedas en tienda
- solo puede cobrar si acepta la invitación

## Elementos clave

- media ruleta
- botón girar
- tienda atractiva
- animaciones de transferencia
- mensajes claros de bloqueo por invitación

## Casillas de la ruleta

| #   | Tipo        | Casilla                | Probabilidad | Efecto en juego                                                                                           | Efecto emocional             |
| --- | ----------- | ---------------------- | ------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | 🪙 Ganancia | +5 monedas             | 14%          | +5 monedas                                                                                                | Pequeña recompensa constante |
| 2   | 🪙 Ganancia | +8 monedas             | 12%          | +8 monedas                                                                                                | Progreso visible             |
| 3   | 🪙 Ganancia | +10 monedas            | 10%          | +10 monedas                                                                                               | “Voy bien”                   |
| 4   | 🪙 Ganancia | x2 monedas             | 8%           | Duplica monedas del giro                                                                                  | Sorpresa positiva            |
| 5   | 🪙 Ganancia | +15 monedas            | 5%           | +15 monedas                                                                                               | Mini jackpot                 |
| 6   | 💔 Pérdida  | Debes 2 besos          | 12%          | +2 a deuda                                                                                                | Dolor leve                   |
| 7   | 💔 Pérdida  | Debes 3 besos          | 10%          | +3 a deuda                                                                                                | Tensión                      |
| 8   | 💔 Pérdida  | Debes 5 besos          | 6%           | +5 a deuda                                                                                                | Golpe fuerte                 |
| 9   | 💔 Pérdida  | Pierdes giro + debes 2 | 5%           | +2 deuda + sin reward                                                                                     | Frustración controlada       |
| 10  | 🔥 Riesgo   | TODO o NADA            | 6%           | +20 monedas **o** +5 deuda                                                                                | Adrenalina                   |
| 11  | 🔥 Riesgo   | DOBLE APUESTA          | 6%           | Siguiente giro x2 (ganancia o pérdida)                                                                    | Suspenso                     |
| 12  | 🎁 Especial | Premio sorpresa        | 6%           | se muestran tres regalos y la usuaria elige uno que pueden ser monedas o desbloquear un item de la tienda | Jackpot emocional            |

## Items de la tienda

### Capa 1: Items disponibles y desbloqueados

| Item              | Precio | Tipo        | Notas                    |
| ----------------- | -----: | ----------- | ------------------------ |
| 🍫 Chocolate      |     25 | Dulce       | Compra rápida inicial    |
| ☕ Café especial  |     30 | Experiencia | Relacionado con Atrio 👀 |
| 🍰 Postre         |     35 | Dulce       | Upgrade del chocolate    |
| 🌹 Flor           |     40 | Emocional   | No funcional, puro gesto |
| 🍿 Snack favorito |     45 | Casual      | Ligero, divertido        |

### 🔒 CAPA 2 — ITEMS BLOQUEADOS (CLAVE DEL JUEGO)

| Item                     | Precio | Tipo        | Estado inicial |
| ------------------------ | -----: | ----------- | -------------- |
| 🎁 Caja sorpresa         |     60 | Misterio    | Bloqueado      |
| 🍦 Salida por helado     |     70 | Experiencia | Bloqueado      |
| 🍽 Cena sorpresa ligera  |     90 | Experiencia | Bloqueado      |
| 🎟 Vale Dollar City Q100 |    100 | Real        | Bloqueado      |
| 🎀 Regalo elegido por ti |    110 | Personal    | Bloqueado      |

### Capa 3: Items de alto valor y desbloqueo especial

| Item                      | Precio | Tipo     | Requisitos            |
| ------------------------- | -----: | -------- | --------------------- |
| 🛒 Vale megapaca Q100     |    130 | Real     | Desbloqueo especial   |
| 🛍 Vale Dollar City 160   |    150 | Real     | Desbloqueo especial   |
| 💝 Caja premium sorpresa  |    180 | Misterio | Desbloqueo + monedas  |
| 🛒 Vale supermercado Q200 |    220 | Real     | Desbloqueo + progreso |
| 🛒 Vale supermercado Q400 |    300 | Real     | Máximo nivel          |
