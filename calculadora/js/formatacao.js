const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarBRL(valor) {
  return formatadorBRL.format(valor);
}

// Lê um valor digitado em reais. Aceita "1250", "1250,5", "1.250,50" e "1250.50".
// Campo vazio é válido e equivale a zero. Retorna { valor, erro }.
function lerValorBRL(texto) {
  const limpo = texto.trim().replace(/^R\$\s*/, '').replace(/\s/g, '');

  if (limpo === '') return { valor: 0, erro: null };

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;

  if (!/^\d+(\.\d*)?$/.test(normalizado)) {
    return { valor: null, erro: 'Use apenas números, com vírgula para os centavos.' };
  }

  const decimais = normalizado.split('.')[1];
  if (decimais && decimais.length > 2) {
    return { valor: null, erro: 'Use no máximo duas casas decimais.' };
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor)) {
    return { valor: null, erro: 'Valor inválido.' };
  }

  return { valor, erro: null };
}

// Texto do orçamento pronto para colar em mensagens ou e-mails.
function gerarTextoResumo(resultado) {
  const linhas = resultado.linhas.map(function (linha) {
    const prefixo = linha.tipo === 'desconto' && linha.valor > 0 ? '− ' : '';
    return linha.rotulo + ': ' + prefixo + formatarBRL(linha.valor);
  });

  return [
    'Calculadora de Frete para Móveis',
    'RESUMO DO FRETE',
    '',
    ...linhas,
    '',
    'TOTAL FINAL: ' + formatarBRL(resultado.total),
  ].join('\n');
}

const WHATSAPP_URL = 'https://wa.me/5549991568404';

// Mensagem do orçamento para o WhatsApp. Campos sem valor ficam de fora.
function gerarMensagemWhatsApp(resultado) {
  const porId = {};
  resultado.linhas.forEach(function (linha) {
    porId[linha.id] = linha;
  });

  const detalhes = ['- Serviço: Frete de móveis'];
  if (porId.base.valor > 0) detalhes.push('- Valor-base: ' + formatarBRL(porId.base.valor));
  if (porId.comodos.valor > 0) {
    detalhes.push('- ' + porId.comodos.rotulo + ': ' + formatarBRL(porId.comodos.valor));
  }
  detalhes.push('- Valor calculado: ' + formatarBRL(resultado.total));
  if (porId.distancia.valor > 0) {
    detalhes.push('- ' + porId.distancia.rotulo + ': ' + formatarBRL(porId.distancia.valor));
  }

  const extras = ['desmontagem', 'embalagem', 'montagem', 'cidadeVizinha', 'fimDeSemana']
    .map(function (id) {
      return porId[id];
    })
    .filter(function (linha) {
      return linha.valor > 0;
    })
    .map(function (linha) {
      return linha.rotulo + ' (' + formatarBRL(linha.valor) + ')';
    });
  if (extras.length > 0) detalhes.push('- Extras: ' + extras.join(', '));

  if (porId.desconto.valor > 0) detalhes.push('- Desconto: − ' + formatarBRL(porId.desconto.valor));

  return [
    'Olá! Gostaria de solicitar um orçamento.',
    '',
    '*Dados do orçamento:*',
    ...detalhes,
    '',
    'Poderiam confirmar o orçamento, por favor?',
  ].join('\n');
}

function gerarLinkWhatsApp(resultado) {
  return WHATSAPP_URL + '?text=' + encodeURIComponent(gerarMensagemWhatsApp(resultado));
}

if (typeof module === 'object' && module.exports) {
  module.exports = { formatarBRL, lerValorBRL, gerarTextoResumo, gerarMensagemWhatsApp, gerarLinkWhatsApp };
}
