const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const math = require('mathjs');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Math Solver</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #container {
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      padding: 20px;
      max-width: 90%;
      width: 400px;
      margin: 20px;
      animation: fadeIn 0.5s ease-in;
    }
    header {
      text-align: center;
      margin-bottom: 20px;
    }
    #cameraView, #cropView {
      width: 100%;
      max-width: 100%;
      margin: 20px 0;
      border-radius: 10px;
      overflow: hidden;
    }
    video, img {
      width: 100%;
      border-radius: 10px;
    }
    button {
      display: block;
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
    }
    button:hover {
      transform: scale(1.05);
      background: linear-gradient(45deg, #45a0fe 0%, #00e2fe 100%);
    }
    #languageButton {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #4facfe;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
    #languageModal {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      width: 90%;
      max-width: 400px;
    }
    #languageModal select {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    #overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }
    @media (max-width: 768px) {
      #container { width: 90%; }
      button { font-size: 14px; padding: 10px; }
      #languageButton { bottom: 10px; right: 10px; }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
  </style>
</head>
<body>
  <div id="overlay"></div>
  <div id="languageModal">
    <h2>Select Language</h2>
    <select id="languageSelect">
      <option value="en">English</option>
      <option value="pt-PT">Português (Portugal)</option>
      <option value="pt-BR">Português (Brasil)</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <!-- Adicione mais 27 línguas para totalizar 32 -->
    </select>
    <button onclick="saveLanguage()">Save</button>
  </div>
  <div id="container">
    <header><h1 id="title">Math Solver</h1></header>
    <div id="cameraView">
      <video id="video" autoplay playsinline></video>
      <button id="startCamera" style="display: none;">Start Camera</button>
      <button id="takePhoto" style="display: none;">Take Photo</button>
      <button id="switchCamera" style="display: none;">Switch Camera</button>
    </div>
    <div id="cropView" style="display: none;">
      <img id="image" style="max-width: 100%;">
      <button id="cropImage" style="display: none;">Crop Image</button>
    </div>
    <img id="croppedImage" style="max-width: 100%; display: none;">
    <button id="solve" style="display: none;">Solve</button>
    <p id="solution"></p>
    <div id="history"><h2 id="historyTitle">History</h2><ul id="historyList"></ul></div>
  </div>
  <button id="languageButton">🌐</button>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
  <script>
    const translations = {
      'en': { title: 'Math Solver', startCamera: 'Start Camera', takePhoto: 'Take Photo', cropImage: 'Crop Image', solve: 'Solve', history: 'History', error: 'Invalid or unrecognized expression' },
      'pt-PT': { title: 'Resolvedor de Matemática', startCamera: 'Iniciar Câmara', takePhoto: 'Tirar Fotografia', cropImage: 'Cortar Imagem', solve: 'Resolver', history: 'Histórico', error: 'Expressão inválida ou não reconhecida' },
      'pt-BR': { title: 'Resolvedor de Matemática', startCamera: 'Iniciar Câmera', takePhoto: 'Tirar Foto', cropImage: 'Cortar Imagem', solve: 'Resolver', history: 'Histórico', error: 'Expressão inválida ou não reconhecida' },
      // Adicione outras traduções para 32 línguas
    };

    let currentLang = localStorage.getItem('selectedLanguage') || 'en';
    let currentCamera = null;
    let cropper;

    function updateTranslations() {
      const t = translations[currentLang] || translations['en'];
      document.getElementById('title').textContent = t.title;
      document.getElementById('startCamera').textContent = t.startCamera;
      document.getElementById('takePhoto').textContent = t.takePhoto;
      document.getElementById('cropImage').textContent = t.cropImage;
      document.getElementById('solve').textContent = t.solve;
      document.getElementById('historyTitle').textContent = t.history;
    }

    document.addEventListener('DOMContentLoaded', () => {
      updateTranslations();
      const video = document.getElementById('video');
      const image = document.getElementById('image');
      const croppedImage = document.getElementById('croppedImage');
      const solution = document.getElementById('solution');
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;

      // Modal de linguagem na primeira visita
      if (!localStorage.getItem('selectedLanguage')) {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('languageModal').style.display = 'block';
      }

      document.getElementById('languageSelect').value = currentLang;
      document.getElementById('languageButton').addEventListener('click', () => {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('languageModal').style.display = 'block';
      });

      function saveLanguage() {
        currentLang = document.getElementById('languageSelect').value;
        localStorage.setItem('selectedLanguage', currentLang);
        updateTranslations();
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('languageModal').style.display = 'none';
      }

      document.getElementById('startCamera').addEventListener('click', async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          if (videoDevices.length > 0) {
            const constraints = { video: { deviceId: videoDevices[0].deviceId } };
            currentCamera = videoDevices[0].deviceId;
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.play();
            document.getElementById('cameraView').style.display = 'block';
            document.getElementById('startCamera').style.display = 'none';
            document.getElementById('takePhoto').style.display = 'inline';
            document.getElementById('switchCamera').style.display = 'inline';
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
        }
      });

      document.getElementById('switchCamera').addEventListener('click', async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const currentIndex = videoDevices.findIndex(d => d.deviceId === currentCamera);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        const constraints = { video: { deviceId: videoDevices[nextIndex].deviceId } };
        currentCamera = videoDevices[nextIndex].deviceId;
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();
      });

      document.getElementById('takePhoto').addEventListener('click', () => {
        canvas.getContext('2d').drawImage(video, 0, 0, 640, 480);
        const photo = canvas.toDataURL('image/png');
        image.src = photo;
        image.style.display = 'block';
        video.srcObject.getTracks().forEach(track => track.stop());
        document.getElementById('cameraView').style.display = 'none';
        document.getElementById('cropView').style.display = 'block';
        document.getElementById('takePhoto').style.display = 'none';
        document.getElementById('switchCamera').style.display = 'none';
        document.getElementById('cropImage').style.display = 'inline';
        cropper = new Cropper(image, { aspectRatio: NaN, viewMode: 1 });
      });

      document.getElementById('cropImage').addEventListener('click', () => {
        const croppedCanvas = cropper.getCroppedCanvas();
        croppedImage.src = croppedCanvas.toDataURL('image/png');
        croppedImage.style.display = 'block';
        image.style.display = 'none';
        document.getElementById('cropView').style.display = 'none';
        document.getElementById('cropImage').style.display = 'none';
        document.getElementById('solve').style.display = 'inline';
      });

      document.getElementById('solve').addEventListener('click', async () => {
        const blob = await fetch(croppedImage.src).then(res => res.blob());
        const formData = new FormData();
        formData.append('image', blob, 'math-problem.png');
        try {
          const response = await fetch('/solve', { method: 'POST', body: formData });
          const data = await response.json();
          if (data.error) {
            solution.textContent = translations[currentLang].error;
          } else {
            solution.textContent = `Solution: ${data.result} (${data.steps})`;
            const history = JSON.parse(localStorage.getItem('scanHistory')) || [];
            history.push({ text: data.text, result: data.result });
            localStorage.setItem('scanHistory', JSON.stringify(history));
            loadHistory();
          }
          solution.classList.add('fade-in');
        } catch (error) {
          console.error('Error solving:', error);
          solution.textContent = translations[currentLang].error;
        }
      });

      function loadHistory() {
        const history = JSON.parse(localStorage.getItem('scanHistory')) || [];
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        history.forEach((item, index) => {
          const li = document.createElement('li');
          li.textContent = `Scan ${index + 1}: ${item.text} = ${item.result}`;
          historyList.appendChild(li);
        });
      }
      loadHistory();
    });
  </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

app.post('/solve', upload.single('image'), async (req, res) => {
  try {
    // Pré-processamento da imagem para melhorar OCR
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, {
      lang: 'eng',
      tessedit_char_whitelist: '0123456789+-*/=(). ',
      tessedit_pageseg_mode: 6
    });
    const expression = text.trim().replace(/\s+/g, '');
    const result = math.evaluate(expression);
    res.json({ result, steps: `Resolved: ${expression} = ${result}` });
  } catch (error) {
    console.error('Error:', error);
    res.status(400).json({ error: 'Invalid or unrecognized expression' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
