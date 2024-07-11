//---- CALIBRACION----
let AMP_MIN = 0.01;
let AMP_MAX = 0.3;
let FREC_MIN = 125;
let FREC_MAX = 270;
let volumen;

//----AUDIO----
let manchas = [];
let layer = [];
let anchoImagen, altoImagen;

let moveManchas = false; // Variable para controlar el movimiento de las manchas
let yOffsets = [100, 100, 100, 100]; // Desplazamientos verticales iniciales para cada capa
let mostrarCapas = false; // Variable para controlar si se deben mostrar las capas
let backgrounds = [];
let timers = []; // Array para almacenar los temporizadores de las capas
let mic, fft; // Agregar FFT
let mostrarTexto = true;
let textoMostrado = false;
let fondoCargado = false; // Variable para controlar si se ha cargado el fondo
let numeroDeSilbido = 0;
let silbidoDetectado = false; // Bandera para registrar la detección de "silbido" en el ciclo actual

let amp;
let ampCruda;
let frec;

let gestorAmp;
let gestorFrec;
let audioContext;
const pichModel = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';

let classifier;
const options = { probabilityThreshold: 0.9 };
let label;
// Teachable Machine model URL:
let soundModel = 'https://teachablemachine.withgoogle.com/models/YoxZR5sR31/';
let miWidth;
let miHeight;

function preload() {
  for (let i = 0; i < 39; i++) {
    let nombre = "imagenes/" + nf(i, 2) + ".png";
    manchas[i] = loadImage(nombre);
  }

  for (let i = 1; i < 13; i++) {
    backgrounds.push(loadImage("imagenes/fondo" + nf(i, 2) + ".png"));
  }

  // Load SpeechCommands18w sound classifier model
  classifier = ml5.soundClassifier(soundModel + 'model.json', options);
}

function setup() {
  createCanvas(1150, 2045);
  miHeight = width;
  miWidth = height;
  colorMode(HSB, 360, 100, 100, 255);

  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);

  userStartAudio(); // forzar el inicio del audio en el navegador
  
  classifier.classify(gotResult);

  gestorAmp = new GestorSenial(AMP_MIN, AMP_MAX);
  gestorFrec = new GestorSenial(FREC_MIN, FREC_MAX);

  fft = new p5.FFT();
  fft.setInput(mic);
  
  // Crear las capas de gráficos
  for (let i = 0; i < 4; i++) {
    layer[i] = createGraphics(miWidth, miHeight);
  }

  // Redimensionar todas las imágenes
  anchoImagen = miWidth / 5;
  altoImagen = miHeight;
}

function draw() {
  // Actualizar el nivel de amplitud del micrófono
  gestorAmp.actualizar(mic.getLevel());
  ampCruda = mic.getLevel();
  amp = gestorAmp.filtrada;
  volumen = mic.getLevel();

  // Mostrar mensaje inicial y cargar fondo aleatorio
  if (!textoMostrado && mostrarTexto) {
    textSize(40);
    textAlign(CENTER);
    fill(0);
    text("Di mmm... para comenzar", miWidth / 4, miHeight);
    textoMostrado = true;
  }
  translate(width, 0);
  rotate(HALF_PI);
  if (!fondoCargado && !mostrarTexto) {
    push();
    background(255);
    let randomIndex = floor(random(backgrounds.length));
    background(backgrounds[randomIndex]);
    tint(255, 17);
    pop();
    fondoCargado = true;
  }

  // Obtener el espectro de frecuencias
  let spectrum = fft.analyze();
  let bass = fft.getEnergy("bass");
  let treble = fft.getEnergy("treble");
  let freqValue = map(bass, 0, 255, 0, 1);
  let freqValueTreble = map(treble, 0, 255, 0, 1);

  // Clasificar el sonido y actuar en consecuencia
  if (label === "mmm") {
    if (!mic.started) {
      mic.start();
    }
    mostrarTexto = false;
  }

  // Mostrar las capas gradualmente si se detecta "ahhh"
  if (label === "ahhh") {
    mostrarCapas = true;
    mostrarCapasGraduadas();
  }

  // Mostrar las manchas en movimiento si se detecta "silbido"
  if (label === "silbido") {
    if (!silbidoDetectado) {
      numeroDeSilbido++;
      silbidoDetectado = true;
      moveManchas = true; // Activar el movimiento de las manchas cuando se hace clic
    }
  } else {
    silbidoDetectado = false;
  }

  // Dibujar las capas en el lienzo principal si se deben mostrar
  if (mostrarCapas) {
    for (let i = 0; i < 4; i++) {
      if (yOffsets[i] === 0) {
        layer[i].clear();
        let x = 0;
        let y = yOffsets[i];
        for (let j = 0; j < 5; j++) {
          let imagen;
          if (i < 2) {
            imagen = manchas[i * 10 + j];
          } else {
            imagen = manchas[20 + (i - 2) * 10 + j];
          }

          if (moveManchas && volumen > 0.3) {
            // Añadimos una variable aleatoria para cada mancha
            let noiseFactor = map(noise(frameCount * 0.01), 0, 1, -1, 1);
            
            let yMovement = map(mic.getLevel(), 0.1, 28, 2, 5) * sin(frameCount / 20 * map(freqValue, 0, 1, 0.01, 0.3)) + noiseFactor;
            let xMovement = map(mic.getLevel(), 0.1, 28, 2, 5) * cos(frameCount / 20 * map(freqValueTreble, 0, 1, 0.01, 0.3)) + noiseFactor;
            
            if (i % 2 === 0) {
              y += yMovement;
              x -= xMovement;
            } else {
              y -= yMovement;
              x += xMovement;
            }
          }

          if (i === 1) {
            if (numeroDeSilbido % 2 === 0) {
              layer[i].tint(color(45, 200, 205, 255));
            } else {
              layer[i].tint(color(45, 110, 230, 255));
            }
          } else if (i === 2) {
            if (numeroDeSilbido % 2 === 0) {
              let valorCapa4 = map(mic.getLevel(), 0.01, 7.40, 71, 75);
              layer[i].tint(color(221, 58, valorCapa4, 255));
            } else {
              let aclararCapa2 = map(mic.getLevel(), 0.01, 8.40, 33, 37);
              layer[i].tint(color(15, 51, aclararCapa2, 255));
            }
          } else if (i === 3) {
            if (numeroDeSilbido % 2 === 0) {
              let valueCapa2 = map(mic.getLevel(), 0.01, 26.60, 10, 50);
              layer[i].tint(valueCapa2, 255);
            } else {
              let aclararCapa2 = map(mic.getLevel(), 0.01, 8.40, 75, 80);
              layer[i].tint(color(223, aclararCapa2, 42, 255));
            }
          }

          layer[i].image(imagen, x + 60, y + 60, anchoImagen - 120, altoImagen - 120);
          x += anchoImagen;
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      if (yOffsets[i] === 0) {
        image(layer[i], 0, 0);
      }
    }

    if (yOffsets[0] === 0) {
      let mouseGray = map(freqValue, 0, 1, 70, 150);
      for (let j = 0; j < 5; j++) {
        let imagen = manchas[j];
        layer[0].tint(mouseGray);
        layer[0].image(imagen, j * anchoImagen + 60, 30);
      }
    }
  }

  if (label === "aplauso" && volumen > 1) {
    ReiniciarLienzo();
    moveManchas = false;
  }
}

//----- DETECCION DE FRECUENCIA-----
function startPitch() {
  pitch = ml5.pitchDetection(pichModel, audioContext , mic.stream, modelLoaded);
}

function modelLoaded() {
  getPitch();
}

function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency) {
      gestorFrec.actualizar(frequency);
      frec = gestorFrec.filtrada;
    }
    getPitch();
  });
}

// Función para mezclar las imágenes aleatoriamente
function mezclarImages() {
  for (let i = manchas.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [manchas[i], manchas[j]] = [manchas[j], manchas[i]];
  }
}

// Función para mostrar las capas gradualmente
function mostrarCapasGraduadas() {
  const delayInSeconds = 10; // Retardo de 10 segundos entre cada capa
  const delayInMilliseconds = delayInSeconds * 100; // Convertir segundos a milisegundos

  for (let i = 0; i < layer.length; i++) {
    // Guardar los temporizadores para poder cancelarlos si es necesario
    timers[i] = setTimeout(() => {
      yOffsets[i] = 0; // Ajustar el desplazamiento vertical de la capa
    }, i * delayInMilliseconds); // Aumentar el retardo para cada capa
  }
}

function ReiniciarLienzo() {
  mostrarCapas = false; // Ocultar las capas
  numeroDeSilbido = 0;
  moveManchas = false;
  yOffsets = [100, 100, 100, 100]; // Restablecer los desplazamientos verticales
  mezclarImages(); // Volver a mezclar las imágenes

  // Cancelar cualquier temporizador en progreso para mostrar las capas
  for (let i = 0; i < timers.length; i++) {
    clearTimeout(timers[i]); // Detener el temporizador
  }
  timers = []; // Reiniciar la lista de temporizadores

  // Ocultar las capas estableciendo los yOffsets a valores distintos de 0
  for (let i = 0; i < layer.length; i++) {
    yOffsets[i] = 100; // Restablecer el desplazamiento para cada capa
  }
  push();
  // Seleccionar un fondo aleatorio y aplicarle el tint con opacidad del 50%
  background(255, 83);

  let randomIndex = floor(random(backgrounds.length));
  tint(255, 17);
  background(backgrounds[randomIndex]);
  pop();
}

function limpiarVolumenTexto() {
  // Limpiar el área donde se muestra el valor del volumen
  fill(255); // Rellenar con blanco
  noStroke();
  rect(0, 0, miWidth, 40); // Rectángulo para el fondo del número
}

//-------- CLASIFICADOR------
function gotResult(error, results) {
  // Display error in the console
  if (error) {
    console.error(error);
    return;
  }

  // Loop through all results
  for (let i = 0; i < results.length; i++) {
    const label = results[i].label;
  }
  
  // Log the results for debugging purposes
  console.log(results);
  label = results[0].label;
  console.log(label);
  console.log("Número de silbidos:", numeroDeSilbido);
}
