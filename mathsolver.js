const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const math = require('mathjs');
const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Usar memória em vez de disco

// Configuração do servidor para front-end inline
app.use(express.json());

// HTML, CSS e JS embutidos como string
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
      font-family: Arial, sans-serif;
      text-align: center;
      margin: 0;
      padding: 20px;
      background-color: #f0f0f0;
    }
    #container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    #video, #canvas, #croppedImage, #history {
      display: none;
      margin: 20px auto;
    }
    #cropperContainer {
      margin: 20px auto;
      max-width: 100%;
    }
    button {
      margin: 10px;
      padding: 10px 20px;
      font-size: 16px;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.05);
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    .fade-in {
      animation: fadeIn 0.5s ease-in;
    }
    #historyList {
      list-style-type: none;
      padding: 0;
    }
    #historyList li {
      padding: 5px;
      border-bottom: 1px solid #ccc;
    }
  </style>
</head>
<body>
  <div id="container" class="fade-in">
    <h1 id="title">Math Solver</h1>
    <select id="languageSelector">
      <option value="en">English</option>
      <option value="pt-PT">Português (Portugal)</option>
      <option value="pt-BR">Português (Brasil)</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <option value="de">Deutsch</option>
      <option value="it">Italiano</option>
      <option value="ja">日本語</option>
      <option value="zh-CN">中文 (简体)</option>
      <option value="ru">Русский</option>
      <option value="ar">العربية</option>
      <option value="ko">한국어</option>
      <option value="nl">Nederlands</option>
      <option value="sv">Svenska</option>
      <option value="no">Norsk</option>
      <option value="da">Dansk</option>
      <option value="fi">Suomi</option>
      <option value="pl">Polski</option>
      <option value="cs">Čeština</option>
      <option value="hu">Magyar</option>
      <option value="tr">Türkçe</option>
      <option value="el">Ελληνικά</option>
      <option value="th">ไทย</option>
      <option value="vi">Tiếng Việt</option>
      <option value="id">Bahasa Indonesia</option>
      <option value="ms">Bahasa Melayu</option>
      <option value="hi">हिन्दी</option>
      <option value="bn">বাংলা</option>
      <option value="ta">தமிழ்</option>
      <option value="te">తెలుగు</option>
      <option value="ml">മലയാളം</option>
      <option value="uk">Українська</option>
      <!-- Total: 32 línguas -->
    </select>
    <button id="startCamera">Start Camera</button>
    <video id="video" width="640" height="480" autoplay></video>
    <button id="takePhoto" style="display:none;">Take Photo</button>
    <canvas id="canvas" width="640" height="480"></canvas>
    <div id="cropperContainer"><img id="image" style="max-width:100%;"></div>
    <button id="cropImage" style="display:none;">Crop Image</button>
    <img id="croppedImage" style="max-width:100%;">
    <button id="solve" style="display:none;">Solve</button>
    <p id="solution"></p>
    <div id="history"><h2>History</h2><ul id="historyList"></ul></div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
  <script>
    const translations = {
      'en': { title: 'Math Solver', startCamera: 'Start Camera', takePhoto: 'Take Photo', cropImage: 'Crop Image', solve: 'Solve', history: 'History', error: 'Invalid or unrecognized expression' },
      'pt-PT': { title: 'Resolvedor de Matemática', startCamera: 'Iniciar Câmara', takePhoto: 'Tirar Fotografia', cropImage: 'Cortar Imagem', solve: 'Resolver', history: 'Histórico', error: 'Expressão inválida ou não reconhecida' },
      'pt-BR': { title: 'Resolvedor de Matemática', startCamera: 'Iniciar Câmera', takePhoto: 'Tirar Foto', cropImage: 'Cortar Imagem', solve: 'Resolver', history: 'Histórico', error: 'Expressão inválida ou não reconhecida' },
      'es': { title: 'Resolvedor de Matemáticas', startCamera: 'Iniciar Cámara', takePhoto: 'Tomar Foto', cropImage: 'Recortar Imagen', solve: 'Resolver', history: 'Historial', error: 'Expresión inválida o no reconocida' },
      // Adicione outras traduções aqui para as 32 línguas
    };

    let currentLang = 'en';
    document.getElementById('languageSelector').addEventListener('change', (e) => {
      currentLang = e.target.value;
      updateTranslations();
    });

    function updateTranslations() {
      const t = translations[currentLang] || translations['en'];
      document.getElementById('title').textContent = t.title;
      document.getElementById('startCamera').textContent = t.startCamera;
      document.getElementById('takePhoto').textContent = t.takePhoto;
      document.getElementById('cropImage').textContent = t.cropImage;
      document.getElementById('solve').textContent = t.solve;
      document.querySelector('#history h2').textContent = t.history;
    }

    document.addEventListener('DOMContentLoaded', () => {
      updateTranslations();
      const video = document.getElementById('video');
      const canvas = document.getElementById('canvas');
      const image = document.getElementById('image');
      const croppedImage = document.getElementById('croppedImage');
      const solution = document.getElementById('solution');
      let cropper;

      document.getElementById('startCamera').addEventListener('click', async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = 'block';
        document.getElementById('takePhoto').style.display = 'inline';
      });

      document.getElementById('takePhoto').addEventListener('click', () => {
        canvas.getContext('2d').drawImage(video, 0, 0, 640, 480);
        const photo = canvas.toDataURL('image/png');
        image.src = photo;
        image.style.display = 'block';
        video.srcObject.getTracks().forEach(track => track.stop());
        video.style.display = 'none';
        document.getElementById('takePhoto').style.display = 'none';
        document.getElementById('cropImage').style.display = 'inline';
        cropper = new Cropper(image, { aspectRatio: NaN, viewMode: 1 });
        image.classList.add('fade-in');
      });

      document.getElementById('cropImage').addEventListener('click', () => {
        const croppedCanvas = cropper.getCroppedCanvas();
        croppedImage.src = croppedCanvas.toDataURL('image/png');
        croppedImage.style.display = 'block';
        image.style.display = 'none';
        document.getElementById('cropImage').style.display = 'none';
        document.getElementById('solve').style.display = 'inline';
        croppedImage.classList.add('fade-in');
      });

      document.getElementById('solve').addEventListener('click', async () => {
        const blob = await fetch(croppedImage.src).then(res => res.blob());
        const formData = new FormData();
        formData.append('image', blob, 'math-problem.png');
        const response = await fetch('/solve', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.error) {
          solution.textContent = translations[currentLang].error;
        } else {
          solution.textContent = \`Solution: \${data.result} (\${data.steps})\`;
          const history = JSON.parse(localStorage.getItem('scanHistory')) || [];
          history.push({ text: data.text, result: data.result });
          localStorage.setItem('scanHistory', JSON.stringify(history));
          loadHistory();
        }
        solution.classList.add('fade-in');
      });

      function loadHistory() {
        const history = JSON.parse(localStorage.getItem('scanHistory')) || [];
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        history.forEach((item, index) => {
          const li = document.createElement('li');
          li.textContent = \`Scan \${index + 1}: \${item.text} = \${item.result}\`;
          historyList.appendChild(li);
        });
        document.getElementById('history').style.display = 'block';
      }
      loadHistory();
    });
  </script>
</body>
</html>
`;

// Rota para servir o front-end
app.get('/', (req, res) => {
  res.send(htmlContent);
});

// Rota para processar a imagem e resolver o problema matemático
app.post('/solve', upload.single('image'), async (req, res) => {
  try {
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');
    const result = math.evaluate(text.trim());
    res.json({ text, result, steps: `Resolved: ${text.trim()} = ${result}` });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or unrecognized expression' });
  }
});

// Iniciar o servidor
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
