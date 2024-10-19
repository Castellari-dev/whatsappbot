const qrcode = require('qrcode-terminal');
const express = require("express");
const bodyParser = require("body-parser");
const { Client, LocalAuth } = require('whatsapp-web.js');
const mysql = require("mysql2");
const setupRoutes = require('./routes'); // Atualiza a importação das rotas
const app = express();
const axios = require("axios");
require('dotenv').config();

app.use(bodyParser.json());

// Criar uma nova instância do router
const router = express.Router();

// Configuração do banco de dados
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Conectar ao banco de dados
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database as id ' + db.threadId);
});

// Inicializar o cliente do WhatsApp com persistência de sessão
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-extensions",
            '--disable-gpu', 
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            '--disable-dev-shm-usage'
        ],
    }
});

// Exibir o QR code para autenticação
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code to log in.');
});

// Login após escanear o QR code
client.on('ready', async () => {
    console.log('Cliente pronto!');

    // Enviar mensagem para todos os números
    for (const numero of numeros) {
      // Formate o número se necessário (incluindo o código do país, etc.)
      const formattedNumber = `${numero}@c.us`; // ou `@g.us` para grupos

      try {
        await client.sendMessage(formattedNumber, 'Olá tudo bem? Falamos da Nonato imóveis, gostaríamos de saber se você tem algum imóvel novo ou atualizar o status do seu imóvel!');
        console.log(`Mensagem enviada para ${formattedNumber}`);
      } catch (error) {
        console.error(`Erro ao enviar para ${formattedNumber}:`, error);
      }
    }

    // Fechar a conexão com o banco de dados
    await connection.end();
    client.destroy();
  });

// Evento chamado quando o cliente é autenticado

// Manipular erros de autenticação
client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

// Manipular desconexão
client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
});

// Iniciar o cliente do WhatsApp
client.initialize()
    .then(() => {
        console.log('WhatsApp client initializing...');
        app.use('/api', setupRoutes(client)); // Passa o client para as rotas após inicialização
        app.use('/api', router); // Usar o router para a rota de verificação
    })
    .catch((err) => console.error('Client initialization failed:', err));

// Iniciar o servidor Express na porta desejada
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
