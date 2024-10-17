const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Client, Label, MessageMedia } = require('whatsapp-web.js');
const client = new Client(); // Cria uma instância do cliente
const mysql = require('mysql2/promise')
// Objeto para armazenar os caminhos de mídia

const getCorretorInfo = async (codigoImovel) => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const [rows] = await connection.execute(`
        SELECT corretores.corretor, corretores.numero
        FROM imoveis
        JOIN corretores ON imoveis.corretor = corretores.corretor
        WHERE imoveis.cod_imovel = ?`, [codigoImovel]);

    await connection.end();
    console.log('Resultado da consulta:', rows);
    return rows.length > 0 ? rows[0] : null; // Retorna o corretor se encontrado
};

const addImovel = async (codImovel, corretorId) => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const result = await connection.execute(`
            INSERT INTO imoveis (cod_imovel, corretor)
            VALUES (?, ?)`, [codImovel, corretorId]);

        console.log('Imóvel adicionado com sucesso:', result); // Log do resultado da inserção
    } catch (error) {
        console.error('Erro ao adicionar imóvel:', error.message);
    } finally {
        await connection.end();
    }
};

const addCorretor = async (corretorNome, numero) => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const result = await connection.execute(`
            INSERT INTO corretores (corretor, numero)
            VALUES (?, ?)`, [corretorNome, numero]);

        console.log('Corretor adicionado com sucesso:', result); // Log do resultado da inserção
    } catch (error) {
        console.error('Erro ao adicionar corretor:', error.message);
    } finally {
        await connection.end();
    }
};

const mediaFiles = {
    audioExplicativo: path.join(__dirname, 'audio_empresa.ogg'), // Manter o áudio, se necessário
    imagemCodigo: path.join(__dirname, 'cod_anuncioo.png'),
    imagemCodigo2: path.join(__dirname, 'cod_anuncio2.png'),
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
    "sao joao d'alianca", "abadiânia", "adelândia", "água limpa", "águas lindas de goiás", "alexânia", "americano do brasil", "anápolis", 
    "anicuns", "aparecida de goiânia", "aragarças", "aragoiânia", "arenópolis", "barro alto", "bela vista de goiás", 
    "bom jesus", "brazabrantes", "buriti de goiás", "caldas novas", "campinorte", "campos belos", "catalão", 
    "cidade ocidental", "cocalzinho de goiás", "crixás", "firminópolis", "flores de goiás", "formosa", "goianápolis", 
    "goianésia", "goiânia", "goianira","trindade", "goiatuba", "guapó", "hidrolândia", "iaciara", "inhumas", "ipameri", "itaberaí", 
    "itumbiara", "jaraguá", "jatai", "luziânia", "mineiros", "monte alegre de goiás", "morrinhos", "nazário", "nerópolis", 
    "niquelândia", "novo gama", "padre bernardo", "palmeiras de goiás", "paranaiguara", "planaltina", "pontalina", 
    "porangatu", "Trindade", "professor jamil", "rialma", "rio verde", "santa helena de goiás", "santo antônio do descoberto", 
    "são joão d'aliança", "ABADIÂNIA", "ADELÂNDIA", "ÁGUA LIMPA", "ÁGUAS LINDAS DE GOIÁS", "ALEXÂNIA", "AMERICANO DO BRASIL", "ANÁPOLIS", 
    "ANICUNS", "APARECIDA DE GOIÂNIA", "ARAGARÇAS", "ARAGOIÂNIA", "ARENÓPOLIS", "BARRO ALTO", "BELA VISTA DE GOIÁS", 
    "BOM JESUS", "BRAZABRANTES", "BURITI DE GOIÁS", "CALDAS NOVAS", "CAMPINORTE", "CAMPOS BELOS", "CATALÃO", 
    "CIDADE OCIDENTAL", "COCALZINHO DE GOIÁS", "CRIXÁS", "FIRMINÓPOLIS", "FLORES DE GOIÁS", "FORMOSA", "GOIANÁPOLIS", 
    "GOIANÉSIA", "GOIÂNIA", "GOIANIRA", "GOIATUBA", "GUAPÓ", "HIDROLÂNDIA", "IACIARA", "INHUMAS", "IPAMERI", "ITABERAÍ", 
    "ITUMBIARA", "JARAGUÁ", "JATAÍ", "TRINDADE", "LUZIÂNIA", "MINEIROS", "MONTE ALEGRE DE GOIÁS", "MORRINHOS", "NAZÁRIO", "NERÓPOLIS", 
    "NIQUELÂNDIA", "NOVO GAMA", "PADRE BERNARDO", "PALMEIRAS DE GOIÁS", "PARANAIGUARA", "PLANALTINA", "PONTALINA", 
    "PORANGATU", "PROFESSOR JAMIL", "RIALMA", "RIO VERDE", "SANTA HELENA DE GOIÁS", "SANTO ANTÔNIO DO DESCOBERTO", 
    "SÃO JOÃO D'ALIANÇA", "ABADIANA", "ADELANDIA", "AGUA LIMPA", "AGUAS LINDAS DE GOIAS", "ALEXANIA", "AMERICANO DO BRASIL", "ANAPOLIS", 
    "ANICUNS", "APARECIDA DE GOIANIA", "ARAGARCAS", "ARAGOIANIA", "ARENOPOLIS", "BARRO ALTO", "BELA VISTA DE GOIAS", 
    "BOM JESUS", "BRAZABRANTES", "BURITI DE GOIAS", "CALDAS NOVAS", "CAMPINORTE", "CAMPOS BELOS", "CATALAO", 
    "CIDADE OCIDENTAL", "COCALZINHO DE GOIAS", "CRIXAS", "FIRMINOPOLIS", "FLORES DE GOIAS", "FORMOSA", "GOIANAPOLIS", 
    "GOIANESIA", "GOIANIA", "GOIANIRA", "GOIATUBA", "GUAPO", "HIDROLANDIA", "IACIARA", "INHUMAS", "IPAMERI", "ITABERAI", 
    "ITUMBIARA", "JARAGUA", "JATAI", "LUZIANIA", "MINEIROS", "MONTE ALEGRE DE GOIAS", "MORRINHOS", "NAZARIO", "NEROPOLIS", 
    "NIQUELANDIA", "NOVO GAMA", "PADRE BERNARDO", "PALMEIRAS DE GOIAS", "PARANAIGUARA", "PLANALTINA", "PONTALINA", 
    "PORANGATU", "PROFESSOR JAMIL", "RIALMA", "RIO VERDE", "SANTA HELENA DE GOIAS", "SANTO ANTONIO DO DESCOBERTO", 
    "SAO JOAO D'ALIANCA", "aparecida", "parecida", "Go", "go", "gyn", "ap", "ap de goiania" 
]

let conversations = {}; // Objeto para armazenar o estado das conversas

// Função para calcular a diferença de tempo entre agora e o timestamp da mensagem
const isRecentMessage = (messageTimestamp) => {
    const now = Math.floor(Date.now() / 5000);
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

        const sendImage = async (imageKey, chatId) => {
            try {
                const imagePath = mediaFiles[imageKey];
        
                // Verificando se o arquivo de imagem existe
                if (!fs.existsSync(imagePath)) {
                    console.error('Arquivo de imagem não encontrado:', imagePath);
                    return;
                }
        
                // Cria a mídia a partir do arquivo de imagem
                const image = await MessageMedia.fromFilePath(imagePath);
        
                // Envia a mensagem de imagem
                await client.sendMessage(chatId, image);
        
            } catch (error) {
                console.error('Erro ao enviar a imagem:', error.message);
                console.error(error);
            }
        };

        const conversation = conversations[from];

        if (!conversations[from]) {
            conversations[from] = {
                step: 0,
                url: 'https://www.nonatoimoveis.com.br/imoveis', // URL base
                name: '',
                corretor: '' // Inicializa a variável corretor
            };
        } else if (!conversations[from].url) {
            conversations[from].url = 'https://www.nonatoimoveis.com.br/imoveis'; // Se já existe a conversa, mas a url ainda não foi definida
        }
        
        switch (conversation.step) {
            case 0:
                setTimeout(async () => {
                    await sendMessage("Olá, tudo bem? Somos a Nonato Imóveis, especialistas em imóveis particulares e de leilão. Qual é o *seu nome?*");
                      // Resetando a URL para o valor base no início da conversa
                    conversation.url = 'https://www.nonatoimoveis.com.br/imoveis';
                    conversation.step = 1;
                }, 1000); // 1 segundo de delay
                break;

                case 1:
                    setTimeout(async () => {
                        // Expressão regular para capturar o nome, removendo introduções como "meu nome é", "eu me chamo", etc.
                        const mensagemMinuscula = messageBody.toLowerCase().trim();
                        
                        // Expressão para remover frases introdutórias comuns
                        const nomeExtraido = mensagemMinuscula.replace(/(meu nome é|eu me chamo|sou|me chamo|meu nome|eu sou|o meu nome é|chamo)\s*/i, '');
                
                        // Se o nome extraído ainda for vazio, use a mensagem inteira como fallback
                        conversation.name = nomeExtraido.length > 0 ? nomeExtraido : messageBody;
                
                        await sendMessage(`Olá, ${conversation.name}. Tudo bem? Você tem interesse em imóveis de *leilão*, *particulares* ou *já tem um imóvel em mente?*`);
                        conversation.step = 2;
                    }, 5000); // 1 segundo de delay
                    break;

                    case 2:
                        setTimeout(async () => {
                            if (messageBody.includes('leilão') || messageBody.includes('leilao') || messageBody.includes('Leilão') || messageBody.includes('Leilao')) {
                                await sendMessage("Ok só um momento enquanto eu te encaminho para a central de leilão");
                                setTimeout(async () => {
                                    conversation.step = 3;  // Atualiza o passo para 3
                                    client.emit('message', message); // Reenvia a mensagem para iniciar o case 3
                                }, 5000);
                            } else if (messageBody.includes('particulares') || messageBody.includes('particular')) {
                                await sendMessage('Ok, só um momento enquanto eu te encaminho para a central de imóveis particulares');
                                setTimeout(async () => {
                                    conversation.step = 11;  // Atualiza o passo para 10
                                    client.emit('message', message); // Reenvia a mensagem para iniciar o case 10
                                }, 5000);
                            } else if (messageBody.includes('Já') || messageBody.includes('já') || messageBody.includes('já tenho') || messageBody.includes('Já tenho') || messageBody.includes('tenho sim') || messageBody.includes('Tenho sim') || messageBody.includes('aham') || messageBody.includes('uhum')) {
                                await sendMessage('Ok, então vou te ensinar a achar o código do imóvel ok?');
                                setTimeout(async () => {
                                    conversation.step = 17;  // Atualiza o passo para 10
                                    client.emit('message', message); // Reenvia a mensagem para iniciar o case 10
                                }, 1000);
                            } else if (messageBody.toLowerCase() === 'quem bate ao portão do jardim?') {
                                await sendMessage(`Aquele que Comeu da Fruta e Provou de seus Mistérios`);
                                setTimeout(async () => {
                                    conversation.step = 25;  // Atualiza o passo para 25
                                    client.emit('message', message); // Reenvia a mensagem para iniciar o case 25
                                }, 1000);
                            } else {
                                await sendMessage("Por favor, responda com 'leilão' ou 'particular'.");
                            }
                        }, 5000);
                        break;
                                    
                
                    case 3:
                        if (conversation.step === 3) { // Garante que a etapa anterior foi concluída
                            await sendMessage('Olá, meu nome é Sabrina e vou te ajudar com o seu imóvel de leilão hoje');
        
                            setTimeout(async () => {
                                await sendMessage('Você já *adquiriu* um imóvel de leilão antes?');
                                conversation.step = 4; // Atualiza para a próxima etapa
                            }, 5000); // Delay de 1 segundo para enviar a próxima mensagem
                        }
                        break;
            
            case 4:
                if (conversation.step === 4) { // Verifica se estamos na etapa 5
                    setTimeout(async () => {
                        if (palavrasSim.some(palavra => messageBody.includes(palavra))) {
                            await sendMessage('Ótimo, e foi *conosco*?');
                            conversation.step = 5; // Atualiza o passo para 6
                        } else if (palavrasNao.some(palavra => messageBody.includes(palavra))) {
                            await sendMessage(`Então ${conversation.name}, imagino que você tenha algumas dúvidas de como funciona esse processo, *posso te encaminhar um áudio* explicando como funciona?`);
                            conversation.step = 7; // Atualiza o passo para 7
                        } else {
                            await sendMessage("Desculpe, não entendi. Você já adquiriu um imóvel de leilão antes?");
                        }
                    }, 5000);
                }
            break;
            
            case 5:
                setTimeout(async () => {
                    if (palavrasSim.some(palavra => messageBody.includes(palavra))) {
                        await sendMessage('Que bom, pode me falar o *nome do seu corretor* para que eu possa te encaminhar diretamente pra ele?');
                        conversation.step = 6; // Avança para a próxima etapa onde o corretor será capturado
                    } else if (palavrasNao.some(palavra => messageBody.includes(palavra))) {
                        await sendMessage(`Então ${conversation.name} imagino que você tenha algumas dúvidas de como funciona esse processo, *posso te enviar um audio* explicando como funciona?`);
                        conversation.step = 7; // Atualiza o passo para a explicação do áudio
                    }
                }, 5000);
                break;
            
            case 6:
                setTimeout(async () => {
                    // Neste ponto, estamos esperando o nome do corretor
                    const nomeCorretor = messageBody.trim(); // Captura a mensagem completa como nome do corretor
                    conversation.corretor = nomeCorretor; // Armazena o nome do corretor na conversa
            
                    const mensagem = `Olá, meu corretor é o ${nomeCorretor}. Estou interessado em mais informações.`;
                    const whatsappLink = `https://wa.me/5562981790169?text=${encodeURIComponent(mensagem)}`;
            
                    await sendMessage(`Ei ${conversation.name}, aqui está o link para falar com seu corretor: ${whatsappLink}.`);
                    await sendMessage('Espero ter ajudado :)');
                    delete conversations[from]; // Finaliza a conversa
                }, 5000);
                break;
            
            case 7:
                setTimeout(async () => {
                    if (palavrasSim.some(palavra => messageBody.includes(palavra))) {
                        // Envia o áudio após 60 segundos
                        await sendAudio('audioExplicativo', from);
                        
                        // Após 25 segundos do envio do áudio, envia a mensagem
                        setTimeout(async () => {
                            await sendMessage('Agora que você ouviu esse áudio e tem uma noção maior do funcionamento, nós trabalhamos com todas as regiões de Goiás, qual *cidade* você tem interesse?');
                            conversation.step = 8;
                        }, 25000); // 25 segundos de delay após o áudio
                    } else if (palavrasNao.some(palavra => messageBody.includes(palavra))) {
                        // Se a resposta for negativa, envia a mensagem imediatamente sem delay
                        await sendMessage("Ok, vou te enviar o link do nosso portal aonde você pode encontrar os nossos imóveis e ser redirecionado para um de nossos corretores de leilão: https://leilaoimoveisgoiania.com.br/");
                        await sendMessage(`Muito obrigado por entrar em contato com a Nonato Imóveis, ${conversation.name}.`);
                        delete conversations[from];
                    }
                }, 10000); // 60 segundos de delay para enviar o áudio
            break;
            
            case 8:
                setTimeout(async () => {
                    // Converte a mensagem para minúsculas e separa as palavras
                    const mensagemMinuscula = messageBody.toLowerCase();
                    const palavrasMensagem = mensagemMinuscula.split(/\s+/); // Quebra a mensagem em palavras

                    // Verifica se alguma das cidades está na lista de palavras da mensagem
                    const cidadeEncontrada = cidades.some(cidade => 
                        palavrasMensagem.includes(cidade.toLowerCase()) // Verifica se há uma correspondência exata
                    );

                    if (cidadeEncontrada) {
                        // Cidade encontrada na mensagem
                        await sendMessage(`Então ${conversation.name}, nós trabalhamos com imóveis nessa cidade sim, a sua intenção é de *moradia* ou pra *investimento*?`);
                        conversation.step = 9;
                    } else {
                        // Nenhuma cidade encontrada na mensagem
                        await sendMessage(`Infelizmente não estamos trabalhando com essa cidade ainda, ${conversation.name}, mas você pode conferir nossos outros imóveis no nosso site https://leilaoimoveisgoiania.com.br/`);
                        delete conversations[from];
                    }
                }, 5000);
            break;

            case 9:
                setTimeout(async () => {
                    if (
                    messageBody.includes('moradia') ||
                    messageBody.includes('investimento') || 
                    messageBody.includes('compra') || 
                    messageBody.includes('venda') ||
                    messageBody.includes('ambos') ||
                    messageBody.includes('os dois')) 
                    {
                        await sendMessage("Qual sua preferência de pagamento? *A vista* ou *Financiado*?");
                        conversation.step = 10;
                    }
                }, 5000);
            break;

            case 10:
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
                }, 5000);
            break;

            case 11:
                if (conversation.step === 11) { // Garante que a etapa anterior foi concluída
                    await sendMessage('Olá, meu nome é Sabrina e vou te ajudar com o seu imóvel particular hoje');
            
                    // Avança automaticamente para a próxima etapa após 1 segundo
                    setTimeout(async () => {
                        await sendMessage(`Vamos lá ${conversation.name}, a sua pretensão é para *compra* ou *aluguel*?`);
                        conversation.step = 12; // Atualiza para a próxima etapa
                    }, 5000); // Delay de 1 segundo para simular uma resposta automática
                }
                break;

            case 12:
                setTimeout(async () => {
                    if (messageBody.includes('compra') || messageBody.includes('comprar')) {
                        // Atualiza a URL com o segmento para compra
                        conversation.url += '/a-venda/';
                        await sendMessage(`Ok ${conversation.name}, então você está interessado em comprar imóveis, mas que tipo de imóvel? *Escolha um dos abaixo:* Apartamento, Área, Casa, Chácara, Cobertura, Flat, Sobrado, Terreno, Andar corporativo, Galpão, Prédio, Sala, Fazenda. `);
                        conversation.step = 13;
                    } else if (messageBody.includes('venda') || messageBody.includes('alugar')) {
                        // Atualiza a URL com o segmento para aluguel
                        conversation.url += '/para-alugar/';
                        await sendMessage(`Ok ${conversation.name}, então você está interessado em comprar imóveis, mas que tipo de imóvel? *Escolha um dos abaixo:* Apartamento, Área, Casa, Chácara, Cobertura, Flat, Sobrado, Terreno, Andar corporativo, Galpão, Prédio, Sala, Fazenda. `);
                        conversation.step = 13;
                    } else {
                        // Caso a resposta não seja compra ou aluguel
                        await sendMessage("Por favor, diga se você quer 'comprar' ou 'alugar'.");
                    }
                }, 5000);
                break;
            
            case 13:
                setTimeout(async () => {
                    // Lista de tipos de imóveis
                    const tiposImovel = ['apartamento', 'área', 'casa', 'chácara', 'cobertura', 'flat', 'sobrado', 'terreno', 'andar corporativo', 'galpão', 'prédio', 'sala', 'fazenda'];
                        
                    // Verifica se o cliente escolheu um dos tipos de imóvel
                    const tipoEscolhido = tiposImovel.find(tipo => messageBody.includes(tipo));
                
                    if (tipoEscolhido) {
                        // Adiciona o tipo de imóvel à URL
                        conversation.url += `${tipoEscolhido}/goiania/`;
                        await sendMessage(`Entendido, você está interessado em um ${tipoEscolhido}. Mas em qual localização? Por favor, diga o nome completo do setor, *acompanhado sempre de _Setor, Jardim, bairro, parque ou residencial ou Vila_*`);
                        conversation.step = 14;
                    } else {
                        await sendMessage("Por favor, escolha um tipo de imóvel da lista.");
                    }
                }, 5000);
                break;
                
            case 14:
                setTimeout(async () => {
                    // Verifica se o cliente mencionou 'setor', 'jardim' ou 'vila' no nome do local
                    if (messageBody.includes('setor') || messageBody.includes('jardim') || messageBody.includes('vila') || messageBody.includes('residencial') || messageBody.includes('parque') || messageBody.includes('bairro')) {
                        // Armazena o nome completo do local (setor, jardim ou vila)
                        const local = messageBody.trim().toLowerCase().replace(/\s+/g, '-'); // Converte para minúsculas e substitui espaços por hífen
                
                        // Adiciona o local à URL
                        conversation.url += local;
                            
                        // Pergunta sobre a finalidade
                        await sendMessage(`Agora, para finalizar, qual é a finalidade do uso da propriedade? *Escolha entre:* residencial, industrial, comercial ou rural.`);
                        conversation.step = 15;
                    } else {
                        await sendMessage("Por favor, insira um setor, jardim, parque, residencial, bairro ou vila como parte do endereço.");
                    }
                }, 5000);
                break;
                
            case 15:
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
                        await sendMessage('Posso te apresentar mais algum imóvel?')
                        conversation.step = 16;
                    } else {
                        await sendMessage("Por favor, escolha entre as finalidades: residencial, industrial, comercial ou rural.");
                    }
                }, 5000);
                break;

                case 16:
                    setTimeout(async () => {
                        if (palavrasSim.some(palavra => messageBody.includes(palavra))){
                            await sendMessage('Perfeito e pra esse imóvel você quer ele para *compra* ou para *aluguel*?')
                            conversation.url = 'https://www.nonatoimoveis.com.br/imoveis';  // Reinicia a URL
                            conversation.step = 12;
                        } else if (palavrasNao.some(palavra => messageBody.includes(palavra))) {
                            await sendMessage(`Tudo bem então ${conversation.name} Qualquer coisa pode reiniciar essa conversa comigo`)
                            delete conversations[from]; // Finaliza a conversa
                        } 
                    }, 5000);

                    case 17:
                        if (conversation.step === 17) { // Garante que a etapa anterior foi concluída
                            await sendMessage('Olá, meu nome é Sabrina e vou te ajudar a encontrar o código do imóvel que você está interessado pra te encaminhar para o corretor responsável tá bom?');
                            
                            setTimeout(async () => {
                                await sendImage('imagemCodigo', from)
                                await sendImage('imagemCodigo2', from)
                                await sendMessage('O código normalmente está no anuncio confome as imagens tá bom?')
                                conversation.step = 18; // Atualiza para a próxima etapa
                            }, 1000); // Delay de 1 segundo para enviar a próxima mensagem
                        }
                        break;
                    
                        case 18:
                            if (messageBody.length != 6) {
                                await sendMessage('Por favor reescreva a mensagem e mande somente o código, se vocês estiver vindo do Zap imóveis remova o -digito e mande somente o código assim *AA0000* (letra letra número número número número');
                            } else if (messageBody.length === 6) {
                                conversation.codigo = messageBody; // Salva o código
                                await sendMessage(`Certo ${conversation.name}, entendi, agora me dá um segundinho que vou encontrar o corretor no nosso sistema e te enviar o contato dele, ok?`);
                        
                                // Buscando o corretor no banco de dados
                                const corretor = await getCorretorInfo(conversation.codigo);
                                // Para adicionar um imóvel


                                if (corretor) {
                                    const mensagem = `Olá, meu nome é ${conversation.name}. Estou interessado no imóvel ${conversation.codigo}, localizado em ${imoveis.bairro} no valor de .`;
                                    const whatsappLink = `https://wa.me/${corretor.numero}?text=${encodeURIComponent(mensagem)}`;
            
                                    await sendMessage(`Encontrei! O corretor responsável é ${corretor.corretor}, o imóvel que você está interessado fica localizado em ${imoveis.bairro} no valor de ${imoveis.venda}, ele tem uma área total de ${imoveis.areaT}, uma área construída de ${imoveis.areaC} e tem ${imoveis.quartos} dormitórios, sendo ${imoveis.suites} e ${imoveis.vagas}. Você pode entrar em contato com o corretor responsável neste link, já deixei tudo preparado para que você fale com ele, ok? ${whatsappLink}.`);
                                    delete conversations[from]; // Finaliza a conversa
                                } else {
                                    await sendMessage('Desculpe, não encontrei um corretor correspondente ao código informado.');
                                }
                            }
                            break;
                        
                        case 19:
                            //Aqui vai o código para cadastrar um novo imóvel futuramente
                        case 25:
                            if (conversation.step=25){
                            await sendMessage('Olá arquimaga Castellari, o que você vai implementar na minha consciência hoje?')}
                        break;
        }
    });
};
module.exports = setupRoutes;
