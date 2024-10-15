const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Client, Label, MessageMedia } = require('whatsapp-web.js');
const client = new Client(); // Cria uma instância do cliente

// Objeto para armazenar os caminhos de mídia
const mediaFiles = {
    audioExplicativo: path.join(__dirname, 'audio_empresa.ogg'), // Manter o áudio, se necessário
    caneca: path.join(__dirname, 'media', 'caneca.jpg'), // Adicionando a imagem
};

let conversations = {}; // Objeto para armazenar o estado das conversas

// Função para calcular a diferença de tempo entre agora e o timestamp da mensagem
const isRecentMessage = (messageTimestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const messageAge = now - messageTimestamp;
    const maxAge = 1 * 10; // Aceita mensagens de até 10 segundos de idade
    
    return messageAge <= maxAge; // Retorna true se a mensagem for recente
};

// Função para configurar rotas, que aceita o cliente como parâmetro
const setupRoutes = (client) => {
    client.on('message', async (message) => {
        const from = message.from; // ID do remetente
        const messageBody = message.body.trim().toLowerCase();
        const messageTimestamp = message.timestamp;
        const isGroup = message.from.endsWith('@g.us');

        if (isGroup || message.fromMe || !isRecentMessage(messageTimestamp)) {
            console.log('Ignoring message from group, self, or old message.');
            return;
        }

        if (!conversations[from]) {
            conversations[from] = { step: 0 };
        }

        const sendMessage = async (msg) => {
            await client.sendMessage(from, msg);
        };

        const sendAudio = async (audioKey, chatId) => {
            try {
                const audioPath = mediaFiles[audioKey];

                // Verificando se o arquivo de áudio existe
                if (!fs.existsSync(audioPath)) {
                    console.error('Arquivo de áudio não encontrado:', audioPath);
                    return;
                }

                // Cria a mídia a partir do arquivo de áudio
                const audio = await MessageMedia.fromFilePath(audioPath);

                // Envia a mensagem de áudio
                await client.sendMessage(chatId, audio, { sendAudioAsVoice: true });

            } catch (error) {
                console.error('Erro ao enviar o áudio:', error.message);
                console.error(error);
            }
        };

        const conversation = conversations[from];

        switch (conversation.step) {
            case 0:
                setTimeout(async () => {
                    await sendMessage("Olá, tudo bem? Somos a Nonato Imóveis, especialistas em imóveis de leilão. Qual é o seu nome?");
                    conversation.step = 1;
                }, 1000); // 1 segundo de delay
                break;

            case 1:
                setTimeout(async () => {
                    conversation.name = messageBody;
                    await sendMessage(`Olá, ${conversation.name}. Tudo bem? Você já adquiriu um imóvel de leilão antes?`);
                    conversation.step = 2;
                }, 1000); // 1 segundo de delay
                break;

            case 2:
                setTimeout(async () => {
                    if (messageBody.includes('sim') || messageBody === 's' || messageBody.includes('já') ||
                        messageBody.includes('yes') || messageBody.includes('claro')) {
                        await sendMessage("Ótimo, foi conosco?");
                        conversation.step = 3;
                    } else if (messageBody === 'não' || messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                        await sendMessage('Posso enviar um audio explicando sobre o processo e a empresa?');
                        conversation.step = 8;
                    } else {
                        await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                    }
                }, 1000);
                break;

            case 3:
                if (messageBody.includes('sim')) {
                    await sendMessage("Perfeito! Me fala o nome do seu corretor pra eu poder te encaminhar pra ele?");
                    conversation.step = 3;

                    client.once('message', async (response) => {
                        const nomeCorretor = response.body;
                        conversation.corretor = nomeCorretor;

                        const mensagem = `Olá, meu corretor é o ${nomeCorretor}. Estou interessado em mais informações.`;
                        const whatsappLink = `https://wa.me/5562981790169?text=${encodeURIComponent(mensagem)}`;

                        await sendMessage(`Ei ${conversation.name}, aqui está o link para falar com seu corretor: ${whatsappLink}.`);
                        await sendMessage('espero ter ajudado :)');
                        delete conversations[from];
                    });
                } else if (messageBody.includes('não')) {
                    await sendMessage("Ótimo, vou te dar algumas instruções sobre como funciona o processo.");
                    conversation.step = 5;
                }
                break;

            case 4:
                setTimeout(async () => {
                    const regions = [
                        'goiania', 'df', 'brasilia', 'bsb', 'federal', 'distrito federal',
                        'distrito', 'entorno', 'aparecida', 'goiânia', 'go', 'goias',
                        'goiás', 'gyn', 'interior'
                    ];

                    const normalizedMessage = messageBody.trim().toLowerCase();

                    if (regions.includes(normalizedMessage)) {
                        setTimeout(async () => {
                            await sendMessage("Seu interesse é de moradia ou para investimento?");
                            conversation.step = 10;
                        }, 1000);
                    } else if (normalizedMessage.includes('não') || normalizedMessage.includes('nao') || normalizedMessage === 'n') {
                        await sendMessage("Ok, vou te enviar o link do nosso portal onde você encontrará mais informações: https://leilaoimoveisgoiania.com.br/");
                        await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}.`);
                        delete conversations[from];
                    } else {
                        await sendMessage("Não temos essa região na nossa base de dados");
                    }
                }, 1000);
                break;

            case 5:
                setTimeout(async () => {
                    await sendMessage('Posso te encaminhar um audio explicando o processo?');
                    conversation.step = 8;
                }, 1000);
                break;

            case 6:
                setTimeout(async () => {
                    if (messageBody.includes('moradia') || messageBody.includes('investimento') || messageBody.includes('comprar') ||
                        messageBody.includes('vender') || messageBody.includes('os dois')) {
                        await sendMessage("Seu interesse é de moradia ou para investimento?");
                        conversation.step = 7;
                    } else {
                        await sendMessage("Por favor, responda com 'Moradia' ou 'Investimento'.");
                    }
                }, 1000);
                break;

            case 7:
                setTimeout(async () => {
                    if (messageBody.includes('a vista') || messageBody.includes('financiado')) {
                        await sendMessage("https://xn--nonatoimoveisleilo-itb.com.br/");
                        await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}.`);
                        delete conversations[from];
                    }
                }, 1000);
                break;

            case 8:
                setTimeout(async () => {
                    if (messageBody.includes('sim') || messageBody === 's' || messageBody.includes('já') || 
                        messageBody.includes('pode') || messageBody.includes('yes') || messageBody.includes('claro')) {
                        await sendAudio('audioExplicativo', from);
                        await sendMessage("Agora que você tem uma ideia de como funciona, quais dessas regiões é do seu interesse? Entorno do DF, Interior de Goiás ou Grande Goiânia?");
                        conversation.step = 4;
                    } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                        await sendMessage("Ok, vou te enviar o link do nosso portal: https://leilaoimoveisgoiania.com.br/");
                        await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}.`);
                        delete conversations[from];
                    } else {
                        await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                    }
                }, 1000);
                break;

            case 9:
                setTimeout(async () => {
                    await sendMessage("Ok, vou te enviar o link do nosso portal: https://leilaoimoveisgoiania.com.br/");
                    await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}.`);
                    delete conversations[from];
                }, 1000);
                break;

            case 10:
                setTimeout(async () => {
                    if (messageBody.includes('moradia') || messageBody.includes('investimento')) {
                        await sendMessage("Qual sua preferência de pagamento? A vista ou Financiado?");
                        conversation.step = 7;
                    }
                }, 1000);
                break;

            default:
                await sendMessage("Por favor aguarde enquanto um dos nossos corretores vem te atender.");
                break;
        }
    });

    return router;
}

module.exports = setupRoutes;
