// Execute com: node --test testes/*.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PRECOS_PADRAO, calcularFrete, precoComodos } = require('../js/calculo.js');
const { formatarBRL, lerValorBRL, gerarTextoResumo } = require('../js/formatacao.js');

const SEM_SERVICOS = {
  desmontagem: false,
  embalagem: false,
  montagem: false,
  fimDeSemana: false,
  descontoPacote: false,
};

function entradas(parcial = {}, servicos = {}) {
  return {
    valorBase: 0,
    distanciaKm: 0,
    valorDescontoPacote: 0,
    ...parcial,
    servicos: { ...SEM_SERVICOS, ...servicos },
  };
}

describe('calcularFrete', () => {
  it('reproduz o exemplo do resumo: 150 + 6 km (30) + desmontagem 20 + montagem 60 = 260', () => {
    const r = calcularFrete(
      entradas({ valorBase: 150, distanciaKm: 6 }, { desmontagem: true, montagem: true }),
      PRECOS_PADRAO,
    );
    assert.equal(r.total, 260);
  });

  it('adiciona R$ 60,00 ao marcar montagem e remove ao desmarcar', () => {
    assert.equal(calcularFrete(entradas({ valorBase: 200 }), PRECOS_PADRAO).total, 200);
    assert.equal(calcularFrete(entradas({ valorBase: 200 }, { montagem: true }), PRECOS_PADRAO).total, 260);
    assert.equal(calcularFrete(entradas({ valorBase: 200 }, { montagem: false }), PRECOS_PADRAO).total, 200);
  });

  it('soma desmontagem e embalagem pelos preços configurados, sem duplicar', () => {
    const r = calcularFrete(
      entradas({ valorBase: 100 }, { desmontagem: true, embalagem: true }),
      PRECOS_PADRAO,
    );
    assert.equal(r.total, 150);
  });

  it('não adiciona custos opcionais quando nenhum serviço está marcado', () => {
    const r = calcularFrete(entradas({ valorBase: 120, distanciaKm: 8 }), PRECOS_PADRAO);
    assert.equal(r.total, 160);
    assert.equal(r.taxaFimDeSemana, 0);
    assert.equal(r.desconto, 0);
  });

  it('aplica 15% de taxa de fim de semana sobre o subtotal, incluindo serviços', () => {
    const r = calcularFrete(entradas({ valorBase: 100 }, { fimDeSemana: true, montagem: true }), PRECOS_PADRAO);
    assert.equal(r.subtotal, 160);
    assert.equal(r.taxaFimDeSemana, 24);
    assert.equal(r.total, 184);
  });

  it('aplica o desconto de pacote somente quando marcado', () => {
    const base = { valorBase: 200, valorDescontoPacote: 50 };
    assert.equal(calcularFrete(entradas(base), PRECOS_PADRAO).total, 200);
    assert.equal(calcularFrete(entradas(base, { descontoPacote: true }), PRECOS_PADRAO).total, 150);
  });

  it('combina fim de semana e desconto: subtotal + taxa − desconto', () => {
    const r = calcularFrete(
      entradas({ valorBase: 100, valorDescontoPacote: 10 }, { fimDeSemana: true, descontoPacote: true }),
      PRECOS_PADRAO,
    );
    assert.equal(r.total, 105);
  });

  it('nunca deixa o total negativo e sinaliza quando o desconto excede o valor', () => {
    const r = calcularFrete(
      entradas({ valorBase: 10, valorDescontoPacote: 100 }, { descontoPacote: true }),
      PRECOS_PADRAO,
    );
    assert.equal(r.total, 0);
    assert.equal(r.descontoExcedeuValor, true);
  });

  it('usa preços configuráveis no lugar dos padrões', () => {
    const precos = { ...PRECOS_PADRAO, montagem: 80, taxaFimDeSemana: 0.2 };
    const r = calcularFrete(entradas({ valorBase: 100 }, { montagem: true, fimDeSemana: true }), precos);
    assert.equal(r.total, 216);
  });

  it('mantém centavos corretos com valores decimais', () => {
    assert.equal(calcularFrete(entradas({ valorBase: 0.1, distanciaKm: 0.04 }), PRECOS_PADRAO).total, 0.3);
  });
});

describe('distância por km', () => {
  it('cobra R$ 5,00 a cada 1 km', () => {
    assert.equal(calcularFrete(entradas({ distanciaKm: 1 }), PRECOS_PADRAO).total, 5);
    assert.equal(calcularFrete(entradas({ distanciaKm: 12 }), PRECOS_PADRAO).total, 60);
  });

  it('aceita km com casas decimais', () => {
    assert.equal(calcularFrete(entradas({ distanciaKm: 12.5 }), PRECOS_PADRAO).total, 62.5);
  });

  it('não cobra distância quando é zero', () => {
    assert.equal(calcularFrete(entradas({ valorBase: 100 }), PRECOS_PADRAO).total, 100);
  });

  it('mostra os km no resumo', () => {
    const linha = (km) =>
      calcularFrete(entradas({ distanciaKm: km }), PRECOS_PADRAO).linhas.find((l) => l.id === 'distancia');
    assert.equal(linha(0).rotulo, 'Distância');
    assert.equal(linha(12).rotulo, 'Distância (12 km)');
    assert.equal(linha(12.5).rotulo, 'Distância (12,5 km)');
    assert.equal(linha(12).valor, 60);
  });

  it('entra no subtotal e recebe a taxa de fim de semana', () => {
    // 2 cômodos (700) + 20 km (100) = 800; taxa 15% = 120; total = 920
    const r = calcularFrete(entradas({ comodos: 2, distanciaKm: 20 }, { fimDeSemana: true }), PRECOS_PADRAO);
    assert.equal(r.total, 920);
  });

  it('usa o preço por km configurável', () => {
    const precos = { ...PRECOS_PADRAO, precoPorKm: 7.5 };
    assert.equal(calcularFrete(entradas({ distanciaKm: 10 }), precos).total, 75);
  });

  it('não existe mais linha de extras no resumo', () => {
    const ids = calcularFrete(entradas(), PRECOS_PADRAO).linhas.map((l) => l.id);
    assert.equal(ids.includes('extras'), false);
  });
});

describe('cômodos', () => {
  it('cobra o preço de cada faixa: 1 = 450, 2 = 700, 3 = 980, 4 = 1.300, 5 = 1.650', () => {
    const esperado = { 1: 450, 2: 700, 3: 980, 4: 1300, 5: 1650 };
    for (const [quantidade, preco] of Object.entries(esperado)) {
      assert.equal(calcularFrete(entradas({ comodos: Number(quantidade) }), PRECOS_PADRAO).total, preco);
    }
  });

  it('usa o preço de "5 ou mais" acima de 5 cômodos', () => {
    assert.equal(precoComodos(8, PRECOS_PADRAO.comodos), 1650);
  });

  it('não cobra nada quando nenhum cômodo é escolhido', () => {
    assert.equal(calcularFrete(entradas({ valorBase: 100, comodos: 0 }), PRECOS_PADRAO).total, 100);
    assert.equal(calcularFrete(entradas({ valorBase: 100 }), PRECOS_PADRAO).total, 100);
  });

  it('entra no subtotal e recebe a taxa de fim de semana', () => {
    // 2 cômodos (700) + montagem (60) = 760; taxa 15% = 114; total = 874
    const r = calcularFrete(entradas({ comodos: 2 }, { montagem: true, fimDeSemana: true }), PRECOS_PADRAO);
    assert.equal(r.subtotal, 760);
    assert.equal(r.taxaFimDeSemana, 114);
    assert.equal(r.total, 874);
  });

  it('mostra a faixa no resumo', () => {
    const linha = (q) =>
      calcularFrete(entradas({ comodos: q }), PRECOS_PADRAO).linhas.find((l) => l.id === 'comodos').rotulo;
    assert.equal(linha(0), 'Cômodos');
    assert.equal(linha(3), 'Cômodos (3)');
    assert.equal(linha(5), 'Cômodos (5 ou mais)');
  });

  it('usa preços de cômodos configuráveis', () => {
    const precos = { ...PRECOS_PADRAO, comodos: [500, 800, 1000, 1400, 1800] };
    assert.equal(calcularFrete(entradas({ comodos: 2 }), precos).total, 800);
  });
});

describe('lerValorBRL', () => {
  it('aceita vírgula decimal e ponto de milhar', () => {
    assert.deepEqual(lerValorBRL('1.250,50'), { valor: 1250.5, erro: null });
  });

  it('aceita ponto decimal e inteiros', () => {
    assert.deepEqual(lerValorBRL('1250.5'), { valor: 1250.5, erro: null });
    assert.deepEqual(lerValorBRL('150'), { valor: 150, erro: null });
  });

  it('trata campo vazio como zero', () => {
    assert.deepEqual(lerValorBRL(''), { valor: 0, erro: null });
  });

  it('rejeita letras, negativos e casas decimais demais', () => {
    assert.notEqual(lerValorBRL('abc').erro, null);
    assert.notEqual(lerValorBRL('-10').erro, null);
    assert.notEqual(lerValorBRL('1,234').erro, null);
  });
});

describe('formatação', () => {
  it('formata em reais brasileiros', () => {
    assert.equal(formatarBRL(1250).replace(/\s/g, ' '), 'R$ 1.250,00');
  });

  it('gera o texto do resumo com o total final', () => {
    const r = calcularFrete(entradas({ valorBase: 200 }, { montagem: true }), PRECOS_PADRAO);
    const texto = gerarTextoResumo(r).replace(/ /g, ' ');
    assert.match(texto, /^Calculadora de Frete para Móveis\nRESUMO DO FRETE/);
    assert.match(texto, /Montagem: R\$ 60,00/);
    assert.match(texto, /TOTAL FINAL: R\$ 260,00$/);
  });
});
