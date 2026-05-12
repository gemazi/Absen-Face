const video = document.getElementById('video');
const statusText = document.getElementById('status');
const hasil = document.getElementById('hasil');
const btnAbsen = document.getElementById('btnAbsen');

let labeledFaceDescriptors;
let faceMatcher;
let currentUser = null;

const spreadsheetURL = "https://script.google.com/macros/s/AKfycbzRYaU41RDd4xz0LiUBWWwxQNQIoFY7qxcMW1W565Q8MgXj7wvFabUXiuTdSYskVck/exec";

// =========================
// START CAMERA
// =========================
async function startVideo() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true
  });

  video.srcObject = stream;
}

// =========================
// LOAD AI MODELS
// =========================
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('./models');

  statusText.innerText = "Model AI berhasil dimuat";
}

// =========================
// LOAD WAJAH YANG DIKENAL
// =========================
async function loadLabeledImages() {

  const labels = [
    'gema',
    'elisa'
  ];

  return Promise.all(
    labels.map(async label => {

      const descriptions = [];

      for (let i = 1; i <= 1; i++) {
        const img = await faceapi.fetchImage(`faces/${label.toLowerCase()}.jpg`);

        const detections = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        descriptions.push(detections.descriptor);
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

// =========================
// RECOGNITION
// =========================
async function recognizeFace() {

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    statusText.innerText = "Wajah tidak ditemukan";
    return null;
  }

  const match = faceMatcher.findBestMatch(detection.descriptor);

  if (match.label === 'unknown') {
    statusText.innerText = "Wajah tidak dikenali";
    return null;
  }

  statusText.innerText = `Terdeteksi: ${match.label}`;

  return match.label;
}

// =========================
// GET GPS
// =========================
function getLocation() {
  return new Promise((resolve, reject) => {

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      error => reject(error)
    );

  });
}

// =========================
// CAPTURE PHOTO
// =========================
function capturePhoto() {

  const canvas = document.createElement('canvas');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  return canvas.toDataURL('image/jpeg');
}

// =========================
// KIRIM DATA
// =========================
async function kirimData(data) {

  const response = await fetch(spreadsheetURL, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  return await response.text();
}

// =========================
// ABSEN
// =========================
btnAbsen.addEventListener('click', async () => {

  try {

    statusText.innerText = 'Mengenali wajah...';

    const nama = await recognizeFace();

    if (!nama) return;

    statusText.innerText = 'Mengambil lokasi GPS...';

    const lokasi = await getLocation();

    statusText.innerText = 'Mengambil foto...';

    const foto = capturePhoto();

    const now = new Date();

    const data = {
      nama,
      waktu: now.toLocaleString(),
      latitude: lokasi.lat,
      longitude: lokasi.lng,
      foto
    };

    statusText.innerText = 'Mengirim data...';

    const hasilServer = await kirimData(data);

    hasil.innerHTML = `
      <h3>ABSEN BERHASIL</h3>
      <p><b>Nama:</b> ${nama}</p>
      <p><b>Jam:</b> ${data.waktu}</p>
      <p><b>Latitude:</b> ${lokasi.lat}</p>
      <p><b>Longitude:</b> ${lokasi.lng}</p>
    `;

    statusText.innerText = hasilServer;

  } catch (err) {

    console.error(err);
    statusText.innerText = 'Terjadi kesalahan';

  }

});

// =========================
// INIT
// =========================
async function init() {

  await loadModels();

  labeledFaceDescriptors = await loadLabeledImages();

  faceMatcher = new faceapi.FaceMatcher(
    labeledFaceDescriptors,
    0.6
  );

  startVideo();

  statusText.innerText = 'Kamera siap';
}

init();
