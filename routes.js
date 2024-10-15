const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Client, Label, MessageMedia } = require('whatsapp-web.js');
const client = new Client(); // Cria uma instância do cliente

// Objeto para armazenar os caminhos de mídia
const mediaFiles = {
    audioExplicativo: path.join(__dirname, 'audio_empresa.ogg'), // Manter o áudio, se necessário
};

const palavrasSim = [
    'sim', 'Sim', 'claro', 'Claro', 'já', 'com certeza', 'sim, senhor', 'certo', 'positivo', 
    's', 'yes', 'yeah', 'yep', 'yeap', 'ok', 'okey', 'beleza', 'pode ser', 'exatamente', 
    'pois é', 'isso aí', 'isso mesmo', 'tá', 'tá bom', 'tá certo', 'bora', 'vambora', 
    'verdade', 'uhum', 'uhuh', 'uhu', 'aham', 'óbvio', 'com certeza', 'de acordo', 'Já', 'ss', 
    'já sim', 'pode', 'pode ser', 'aceito', 'positivo'
];

const palavrasNao = [
    'não', 'Não', 'nao', 'Nao', 'n', 'nunca', 'jamais', 'de jeito nenhum', 'negativo', 
    'nem pensar', 'nem a pau', 'claro que não', 'nem', 'de forma alguma', 'de jeito nenhum', 
    'de maneira nenhuma', 'de forma nenhuma', 'não mesmo', 'necas', 'no', 'nope', 
    'nehum', 'nao quero', 'recuso', 'tô fora', 'não pode ser', 'errado', 'negativo'
];

const cidades = [
    "abadiania", "adelandia", "agua limpa", "aguas lindas de goias", "alexania", "americano do brasil", "anapolis", 
    "anicuns", "aparecida de goiania", "aragarcas", "aragoiania", "arenopolis", "barro alto", "bela vista de goias", 
    "bom jesus", "brazabrantes", "buriti de goias", "caldas novas", "campinorte", "campos belos", "catalao", 
    "cidade ocidental", "cocalzinho de goias", "crixas", "firminopolis", "flores de goias", "formosa", "goianapolis", 
    "goianesia", "goiania", "goianira", "goiatuba", "guapo", "hidrolandia", "iaciara", "inhumas", "ipameri", "itaberai", 
    "itumbiara", "jaragua", "jatai", "luziania", "mineiros", "monte alegre de goias", "morrinhos", "nazario", "neropolis", 
    "niquelandia", "novo gama", "padre bernardo", "palmeiras de goias", "paranaiguara", "planaltina", "pontalina", 
    "porangatu", "professor jamil", "rialma", "rio verde", "santa helena de goias", "santo antonio do descoberto", 
    "sao joao d'alianca" 
]



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

        if (!conversations[from]) {
            conversations[from] = { step: 0, url: 'https://www.nonatoimoveis.com.br/imoveis' }; // Adiciona a url base
        } else if (!conversations[from].url) {
            conversations[from].url = 'https://www.nonatoimoveis.com.br/imoveis'; // Se já existe a conversa, mas a url ainda não foi definida
        }
        
        switch (conversation.step) {
            case 0:
                setTimeout(async () => {
                    await sendMessage("Olá, tudo bem? Somos a Nonato Imóveis, especialistas em imóveis particulares e de leilão. Qual é o seu nome?");
                    conversation.step = 1;
                }, 1000); // 1 segundo de delay
                break;

            case 1:
                setTimeout(async () => {
                    conversation.name = messageBody;
                    await sendMessage(`Olá, ${conversation.name}. Tudo bem? Você tem interesse em imóveis de leilão ou particulares?`);
                    conversation.step = 2;
                }, 1000); // 1 segundo de delay
                break;

                case 2:
                    setTimeout(async () => {
                        if (messageBody.includes('leilão')) {
                            await sendMessage("Ok só um momento enquanto eu te encaminho para a central de leilão");
                            setTimeout(async () => {
                                conversation.step = 3;  // Atualiza o passo para 3
                                client.emit('message', message); // Reenvia a mensagem para iniciar o case 3
                            }, 1000);
                        } else if (messageBody.includes('particulares')) {
                            await sendMessage('Ok, só um momento enquanto eu te encaminho para a central de imóveis particulares');
                            setTimeout(async () => {
                                conversation.step = 10;  // Atualiza o passo para 10
                                client.emit('message', message); // Reenvia a mensagem para iniciar o case 10
                            }, 1000);
                        } else {
                            await sendMessage("Por favor, responda com 'sim' ou 'não'.");
                        }
                    }, 1000);
                    break;                
                
                    case 3:
                        if (conversation.step === 3) { // Garante que a etapa anterior foi concluída
                            await sendMessage('Olá, meu nome é Sabrina e vou te ajudar com o seu imóvel de leilão hoje');
        
                            setTimeout(async () => {
                                await sendMessage('Você já adquiriu um imóvel de leilão antes?');
                                conversation.step = 4; // Atualiza para a próxima etapa
                            }, 1000); // Delay de 1 segundo para enviar a próxima mensagem
                        }
                        break;
                
                
            case 4:
                if (conversation.step === 5) { // Verifica se estamos na etapa 5
                    setTimeout(async () => {
                        if (palavrasSim.some(palavra => messageBody.includes(palavra))) {
                            await sendMessage('Ótimo, e foi conosco?');
                            conversation.step = 5; // Atualiza o passo para 6
                        } else if (palavrasNao.some(palavra => messageBody.includes(palavra))) {
                            await sendMessage(`Então ${conversation.name}, imagino que você tenha algumas dúvidas de como funciona esse processo, posso te encaminhar um áudio explicando como funciona?`);
                            conversation.step = 6; // Atualiza o passo para 7
                        } else {
                            await sendMessage("Desculpe, não entendi. Você já adquiriu um imóvel de leilão antes?");
                        }
                    }, 1000);
                }
            break;
            
            case 5:
                setTimeout (async () => {
                    if (palavrasSim.some(palavra => messageBody.includes(palavra))) {
                      await sendMessage('Que bom, pode me falar o nome do seu corretor para que eu possa te encaminhar diretamente pra ele?')
                      conversation.step = 5;

                      client.once('message', async (response) => {
                        const nomeCorretor = response.body;
                        conversation.corretor = nomeCorretor;

                        const mensagem = `Olá, meu corretor é o ${nomeCorretor}. Estou interessado em mais informações.`;
                        const whatsappLink = `https://wa.me/5562981790169?text=${encodeURIComponent(mensagem)}`;

                        await sendMessage(`Ei ${conversation.name}, aqui está o link para falar com seu corretor: ${whatsappLink}.`);
                        await sendMessage('espero ter ajudado :)');
                        delete conversations[from];
                    });

                    } else if (palavrasNao.some(palavra => messageBody.includes(palavra))) {
                        await sendMessage(`Então ${conversation.name} imagino que você tenha algumas dúvidas de como funciona esse processo, posso te enviar um audio explicando como funciona?`)
                        conversation.step = 6;
                    }
                }, 1000);
                break;
            
            case 6:
                setTimeout(async () => {
                    if (palavrasSim.some(palavra => messageBody.includes(palavra))){
                        await sendAudio('audioExplicativo', from);
                        await sendMessage('Agora que você ouviu esse audio e tem uma noção maior do funcionamento, nós trabalhos com todas as regiões de Goiás, qual cidade você tem interesse?')
                        conversation.step = 7;
                    } else if (palavrasNao.some(palavra => messageBody.includes(palavra))) {
                        await sendMessage("Ok, vou te enviar o link do nosso portal aonde você pode encontrar os nossos imóveis e ser redirecionado para um de nossos corretores de leilão: https://leilaoimoveisgoiania.com.br/");
                        await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}.`);
                        delete conversations[from];
                    }
                }, 1000);
                break;
            
            case 7:
                setTimeout(async () => {
                    if (cidades.some(palavra => messageBody.includes(palavra))){
                        await sendMessage (`Então ${conversation.name} nós trabalhamos com imóveis nessa cidade sim, a sua intenção é de moradia ou pra investimento?`)
                        conversation.step = 8;
                    } else if (cidades.every(palavra => !messageBody.includes(palavra))) {
                        await sendMessage (`Infelizmente não estamos trabalho com essa cidade ainda ${conversation.name}, mas você pode conferir nossos outros imóveis no nosso site https://leilaoimoveisgoiania.com.br/`)
                        delete conversations[from];
                    }
                }, 1000);
                break;

            case 8:
                setTimeout(async () => {
                    if (
                    messageBody.includes('moradia') ||
                    messageBody.includes('investimento') || 
                    messageBody.includes('compra') || 
                    messageBody.includes('venda') ||
                    messageBody.includes('ambos') ||
                    messageBody.includes('os dois')) 
                    {
                        await sendMessage("Qual sua preferência de pagamento? A vista ou Financiado?");
                        conversation.step = 9;
                    }
                }, 1000);
            break;

            case 9:
                setTimeout(async () => {
                    if (messageBody.includes('a vista') || messageBody.includes ('A vista') || messageBody.includes('avista') || messageBody.includes('Avista')){
                        await sendMessage('Então você tem interesse em nossos imóveis A vista? Vou te enviar o link do nosso portal com nossos imóveis a vista')
                        await sendMessage('https://encurtador.com.br/bpGcZ')
                        delete conversations[from];
                    } else if (messageBody.includes('financiamento') || messageBody.includes('Financiamento') || messageBody.includes('Parcelado') || messageBody.includes('parcelado') || messageBody.includes('financiado') || messageBody.includes('Financiado')){
                        await sendMessage('Então você tem interesse em nosso imóveis financiáveis? Vou te enviar o link do nosso portal com nossos imóveis financiáveis')
                        await sendMessage('https://encurtador.com.br/WULFf');
                        delete conversations[from];
                    }
                }, 1000);
            break;

            case 10:
                if (conversation.step === 10) { // Garante que a etapa anterior foi concluída
                    await sendMessage('Olá, meu nome é Sabrina e vou te ajudar com o seu imóvel particular hoje');
            
                    // Avança automaticamente para a próxima etapa após 1 segundo
                    setTimeout(async () => {
                        await sendMessage(`Vamos lá ${conversation.name}, a sua pretensão é para compra ou aluguel?`);
                        conversation.step = 11; // Atualiza para a próxima etapa
                    }, 1000); // Delay de 1 segundo para simular uma resposta automática
                }
                break;

            case 11:
                setTimeout(async () => {
                    if (messageBody.includes('compra') || messageBody.includes('comprar')) {
                        // Atualiza a URL com o segmento para compra
                        conversation.url += '/a-venda/';
                        await sendMessage(`Ok ${conversation.name}, então você está interessado em comprar imóveis, mas que tipo de imóvel? Escolha um dos abaixo: Apartamento, Área, Casa, Chácara, Cobertura, Flat, Sobrado, Terreno, Andar corporativo, Galpão, Prédio, Sala, Fazenda. `);
                        conversation.step = 12;
                    } else if (messageBody.includes('venda') || messageBody.includes('alugar')) {
                        // Atualiza a URL com o segmento para aluguel
                        conversation.url += '/para-alugar/';
                        await sendMessage(`Ok ${conversation.name}, então você está interessado em comprar imóveis, mas que tipo de imóvel? Escolha um dos abaixo: Apartamento, Área, Casa, Chácara, Cobertura, Flat, Sobrado, Terreno, Andar corporativo, Galpão, Prédio, Sala, Fazenda. `);
                        conversation.step = 12;
                    } else {
                        // Caso a resposta não seja compra ou aluguel
                        await sendMessage("Por favor, diga se você quer 'comprar' ou 'alugar'.");
                    }
                }, 1000);
                break;
            
            case 12:
                setTimeout(async () => {
                    // Lista de tipos de imóveis
                    const tiposImovel = ['apartamento', 'área', 'casa', 'chácara', 'cobertura', 'flat', 'sobrado', 'terreno', 'andar corporativo', 'galpão', 'prédio', 'sala', 'fazenda'];
                        
                    // Verifica se o cliente escolheu um dos tipos de imóvel
                    const tipoEscolhido = tiposImovel.find(tipo => messageBody.includes(tipo));
                
                    if (tipoEscolhido) {
                        // Adiciona o tipo de imóvel à URL
                        conversation.url += `${tipoEscolhido}/goiania/`;
                        await sendMessage(`Entendido, você está interessado em um ${tipoEscolhido}. Mas em qual localização? Por favor, diga o nome completo do setor, *acompanhado sempre de _Setor, Jardim ou Vila_*`);
                        conversation.step = 13;
                    } else {
                        await sendMessage("Por favor, escolha um tipo de imóvel da lista.");
                    }
                }, 1000);
                break;
                
                case 13:
                    setTimeout(async () => {
                        // Verifica se o cliente mencionou 'setor', 'jardim' ou 'vila' no nome do local
                        if (messageBody.includes('setor') || messageBody.includes('jardim') || messageBody.includes('vila')) {
                            // Armazena o nome completo do local (setor, jardim ou vila)
                            const local = messageBody.trim().toLowerCase().replace(/\s+/g, '-'); // Converte para minúsculas e substitui espaços por hífen
                
                            // Adiciona o local à URL
                            conversation.url += local;
                            
                            // Pergunta sobre a finalidade
                            await sendMessage(`Agora, para finalizar, qual é a finalidade do uso da propriedade? Escolha entre: residencial, industrial, comercial ou rural.`);
                            conversation.step = 14;
                        } else {
                            await sendMessage("Por favor, insira um setor, jardim ou vila como parte do endereço.");
                        }
                    }, 1000);
                    break;
                
                case 14:
                    setTimeout(async () => {
                        // Lista de finalidades permitidas
                        const finalidades = ['residencial', 'industrial', 'comercial', 'rural'];
                
                        // Verifica se o cliente mencionou uma das finalidades
                        const finalidadeEscolhida = finalidades.find(finalidade => messageBody.includes(finalidade));
                
                        if (finalidadeEscolhida) {
                            // Adiciona a finalidade à URL como o último parâmetro
                            conversation.url += `?finalidade=${finalidadeEscolhida}`;
                
                            // Envia o link completo para o cliente
                            await sendMessage(`Perfeito! Aqui está o link completo com as opções que você selecionou: ${conversation.url}`);
                            
                            delete conversations[from]; // Finaliza a conversa
                        } else {
                            await sendMessage("Por favor, escolha entre as finalidades: residencial, industrial, comercial ou rural.");
                        }
                    }, 1000);
                    break;
        }
    });
};
module.exports = setupRoutes;
