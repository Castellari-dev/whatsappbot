const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('wwebjs');
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const setupRoutes = require('./routes'); // Atualiza a importação das rotas
const app = express();
const axios = require("axios");
require('dotenv').config();

app.use(bodyParser.json());

// Criar uma nova instância do router
const router = express.Router();

router.get('/check-browser', (req, res) => {
    const userAgent = req.headers['user-agent'];

    // Check for Chrome
    const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
    // Check for Edge
    const isEdge = userAgent.includes('Edg');

    if (isChrome) {
        console.log("The browser is Chrome.");
    } else if (isEdge) {
        console.log("The browser is Edge.");
    } else {
        console.log("The browser is neither Chrome nor Edge.");
    }

    res.send('User Agent Check Completed');
});

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
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Exibir o QR code para autenticação
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code to log in.');
});

// Login após escanear o QR code
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

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
