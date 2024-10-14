const express = require('express');
const router = express.Router();
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

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
                console.log('Caminho do arquivo de áudio:', audioPath); // Imprime o caminho do arquivo
        
                // Verificando se o arquivo de áudio existe
                if (!fs.existsSync(audioPath)) {
                    console.error('Arquivo de áudio não encontrado:', audioPath);
                    return;
                }
        
                // Cria a mídia a partir do arquivo de áudio
                const audio = await MessageMedia.fromFilePath(audioPath);
                console.log('audio:', audio);
                console.log('Tentando enviar áudio...');
                
                // Envia a mensagem de áudio
                await client.sendMessage(chatId, audio, { sendAudioAsVoice: true});
                console.log("chat id:", chatId);
                console.log('Áudio enviado com sucesso!');
            } catch (error) {
                console.error('Erro ao enviar o áudio:', error.message);
                console.error(error);
            }
        };
        const conversation = conversations[from];

        switch (conversation.step) {
            case 0:
                await sendMessage("Olá, tudo bem? Somos a Nonato Imóveis, especialistas em imóveis de leilão. Qual é o seu nome?");
                conversation.step = 1;
                break;

            case 1:
                conversation.name = messageBody;
                await sendMessage(`Olá, ${conversation.name}. Tudo bem? Você já adquiriu um imóvel de leilão antes?`);
                conversation.step = 2;
                break;

            case 2:
                if (messageBody.includes('sim') || messageBody === 's') {
                    await sendMessage('Ótimo, foi conosco?');
                    conversation.step = 3;
                } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                    await sendMessage("Ótimo, vou te dar algumas instruções sobre como funciona o processo com a nossa equipe. Nossa equipe realiza arrematações diariamente e oferece consultoria completa. E o melhor de tudo: nossa consultoria é paga pela Caixa Econômica Federal, sem custo adicional para você. Posso te enviar um audio explicativo com mais detalhes?");
                    conversation.step = 4;
                } else {
                    await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                }
                break;

            case 3:
                if (messageBody.includes('sim') || messageBody === 's') {
                    await sendMessage("Perfeito! Como posso te ajudar hoje?");
                    conversation.step = 5;
                } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                    await sendMessage("Bacana, temos diversas opções de imóveis no estado de Goiás. Quais dessas regiões é do seu interesse? Entorno do DF, Interior de Goiás ou Grande Goiânia?");
                    conversation.step = 6;
                } else {
                    await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                }
                break;

                case 4:
                    if (messageBody.includes('sim') || messageBody === 's') {
                        await sendAudio('audioExplicativo', from); // Passando 'from' como ID do chat
                        await sendMessage("Agora que você tem uma ideia de como funciona, quais dessas regiões é do seu interesse? Entorno do DF, Interior de Goiás ou Grande Goiânia?");
                        conversation.step = 6;
                    } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                        await sendMessage("Ok, vou te enviar o link do nosso portal onde você encontrará mais informações: https://leilaoimoveisgoiania.com.br/.");
                        delete conversations[from];
                    } else {
                        await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                    }
                    break;

            case 5:
                await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}. Não esqueça que nossa consultoria é paga pela Caixa Econômica Federal, então estamos aqui para te ajudar em cada passo, sem custo adicional para você. Tenha um ótimo dia!`);
                delete conversations[from];
                break;

            case 6:
                if (messageBody.includes('df')) {
                    await sendMessage("Ah, que bom! Nossos corretores de DF vão entrar em contato.");
                    delete conversations[from];
                } else if (messageBody.includes('goiás') || messageBody.includes('goiânia')) {
                    await sendMessage("Seu interesse é de moradia ou para investimento?");
                    conversation.step = 7;
                } else {
                    await sendMessage("Por favor, responda com 'DF', 'interior de Goiás' ou 'Grande Goiânia'.");
                }
                break;

            case 7:
                if (messageBody.includes('moradia') || messageBody.includes('investimento') || messageBody.includes('vender') || messageBody.includes('comprar')) {
                    await sendMessage("Dá uma olhada no nosso site para ver se algum imóvel te interessa: https://leilaoimoveisgoiania.com.br/");
                    delete conversations[from];
                } else {
                    await sendMessage("Não entendi, pode falar de outra forma?");
                }
                break;

            default:
                await sendMessage("Olá, tudo bem? Somos a Nonato Imóveis, especialistas em imóveis de leilão. Qual é o seu nome?");
                conversation.step = 1;
                break;
        }
    });

    return router;
};

module.exports = setupRoutes;
