const express = require('express');
const path = require('path');
const app = express();

// Configura o Express para servir os arquivos estáticos do front-end
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para processar JSON nas requisições (se precisar de POST)
app.use(express.json());

// Exemplo de rota do back-end
app.post('/api/solve', (req, res) => {
  const { problem } = req.body; // Exemplo: recebe um problema do front-end
  const result = `Solução para: ${problem}`; // Lógica fictícia
  res.json({ result });
});

// Redireciona todas as outras requisições para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
