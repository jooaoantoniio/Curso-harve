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

if (typeof module === 'object' && module.exports) {
  module.exports = { formatarBRL, lerValorBRL, gerarTextoResumo };
}
