const express = require('express');
const router = express.Router();
const { MessageMedia } = require('whatsapp-web.js'); // Importação para enviar mídia
const path = require('path'); // Importa o módulo path para construir caminhos seguros
const fs = require('fs');

// Objeto para armazenar os caminhos de mídia
const mediaFiles = {
    audioExplicativo: path.join(__dirname, 'media', 'audio_empresa.mp3'), // Usando __dirname para garantir o caminho relativo correto
};

let conversations = {}; // Objeto para armazenar o estado das conversas

// Função para calcular a diferença de tempo entre agora e o timestamp da mensagem
const isRecentMessage = (messageTimestamp) => {
    const now = Math.floor(Date.now() / 1000); // Data atual em segundos
    const messageAge = now - messageTimestamp; // Idade da mensagem em segundos
    const maxAge = 1 * 10; // Aceita mensagens de até 10 segundos de idade
    
    return messageAge <= maxAge; // Retorna true se a mensagem for recente
};

// Função para configurar rotas, que aceita o cliente como parâmetro
const setupRoutes = (client) => {
    client.on('message', async (message) => {
        const from = message.from; // ID do remetente
        const messageBody = message.body.trim().toLowerCase(); // Texto da mensagem
        const messageTimestamp = message.timestamp; // Timestamp da mensagem

        // Verifica se a mensagem veio de um grupo pelo ID
        const isGroup = message.from.endsWith('@g.us');

        // Ignora mensagens de grupos, do próprio bot ou mensagens antigas
        if (isGroup || message.fromMe || !isRecentMessage(messageTimestamp)) {
            console.log('Ignoring message from group, self, or old message.');
            return; // Ignora mensagens de grupos, do próprio bot ou antigas
        }

        // Inicializa a conversa se o usuário for novo
        if (!conversations[from]) {
            conversations[from] = { step: 0 };
        }

        // Função para enviar uma mensagem
        const sendMessage = async (msg) => {
            await client.sendMessage(from, msg);
        };

        const path = require('path'); // Importa o módulo path para construir o caminho de forma segura
 
        const sendAudio = async (audioKey) => {
            try {
                const audioPath = mediaFiles[audioKey];
                const audioData = fs.readFileSync(audioPath, { encoding: 'base64' }); // Carrega o arquivo como base64
                const media = new MessageMedia('audio/mp3', audioData, 'audio_empresa.mp3');
                console.log('Media Object:', media);
                
                const chat = await client.getChatById(from); // Obtém o chat pelo ID do remetente
                await chat.sendMessage(media, { sendAudioAsVoice: true }); // Envia o áudio como mensagem de voz
                
                console.log('Áudio enviado com sucesso!');
            } catch (error) {
                console.error('Erro ao enviar o áudio:', error);
            }
        };
        // Verifica o estado atual da conversa
        const conversation = conversations[from];

        switch (conversation.step) {
            case 0:
                // Início do atendimento
                await sendMessage("Olá, tudo bem? Somos a Nonato Imóveis, especialistas em imóveis de leilão. Qual é o seu nome?");
                conversation.step = 1;
                break;

            case 1:
                // Saudação personalizada
                conversation.name = messageBody; // Salva o nome
                await sendMessage(`Olá, ${conversation.name}. Tudo bem? Você já adquiriu um imóvel de leilão antes?`);
                conversation.step = 2;
                break;

            case 2:
                // Verifica se o cliente já adquiriu um imóvel de leilão
                if (messageBody.includes('sim') || messageBody === 's') {
                    await sendMessage('Ótimo, foi conosco?');
                    conversation.step = 3;
                } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                    await sendMessage("Ótimo, vou te dar algumas instruções sobre como funciona o processo com a nossa equipe. Nossa equipe realiza arrematações diariamente e oferece consultoria completa. E o melhor de tudo: nossa consultoria é paga pela Caixa Econômica Federal, sem custo adicional para você. Posso te enviar um áudio explicativo com mais detalhes?");
                    conversation.step = 4;
                } else {
                    await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                }
                break;

            case 3:
                // Se o cliente já comprou com a Nonato Imóveis
                if (messageBody.includes('sim') || messageBody === 's') {
                    await sendMessage("Perfeito! Como posso te ajudar hoje?");
                    conversation.step = 5; // Aqui você pode definir ações dependendo da resposta
                } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                    await sendMessage("Bacana, temos diversas opções de imóveis no estado de Goiás. Quais dessas regiões é do seu interesse? Entorno do DF, Interior de Goiás ou Grande Goiânia?");
                    conversation.step = 6;
                } else {
                    await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                }
                break;

            case 4:
                    // Envia áudio explicativo ou link se o cliente preferir
                    if (messageBody.includes('sim') || messageBody === 's') {
                        await sendMessage("Vou enviar o áudio explicativo para você agora!");
                        await sendAudio('audioExplicativo'); // Chama a função com a chave do objeto de mídia
                        await sendMessage("Agora que você tem uma ideia de como funciona, quais dessas regiões é do seu interesse? Entorno do DF, Interior de Goiás ou Grande Goiânia?");
                        conversation.step = 6;
                    } else if (messageBody.includes('não') || messageBody.includes('nao') || messageBody === 'n') {
                        await sendMessage("Ok, vou te enviar o link do nosso portal onde você encontrará mais informações: https://leilaoimoveisgoiania.com.br/.");
                        delete conversations[from]; // Encerra a conversa
                    } else {
                        await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                }
            break;
                

            case 5:
                // Finalização personalizada (dependendo de qual foi a ajuda solicitada)
                await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}. Não esqueça que nossa consultoria é paga pela Caixa Econômica Federal, então estamos aqui para te ajudar em cada passo, sem custo adicional para você. Tenha um ótimo dia!`);
                delete conversations[from]; // Encerra a conversa
                break;

            case 6:
                // Pergunta de região de interesse
                if (messageBody.includes('df')) {
                    await sendMessage("Ah, que bom! Nossos corretores de DF vão entrar em contato.");
                    delete conversations[from]; // Encerra a conversa
                } else if (messageBody.includes('goiás') || messageBody.includes('goiânia')) {
                    await sendMessage("Seu interesse é de moradia ou para investimento?");
                    conversation.step = 7;
                } else {
                    await sendMessage("Por favor, responda com 'DF', 'interior de Goiás' ou 'Grande Goiânia'.");
                }
                break;

            case 7:
                // Responde sobre moradia ou investimento
                if (messageBody.includes('moradia') || messageBody.includes('investimento') || messageBody.includes('vender') || messageBody.includes('comprar')) {
                    await sendMessage("Dá uma olhada no nosso site para ver se algum imóvel te interessa: https://leilaoimoveisgoiania.com.br/");
                    delete conversations[from]; // Encerra a conversa
                } else {
                    await sendMessage("Não entendi, pode falar de outra forma?.");
                }
                break;

            default:
                // Reinicia a conversa
                await sendMessage("Olá, tudo bem? Somos a Nonato Imóveis, especialistas em imóveis de leilão. Qual é o seu nome?");
                conversation.step = 1;
                break;
        }
    });

    return router; // Retorna o roteador
};

module.exports = setupRoutes;
