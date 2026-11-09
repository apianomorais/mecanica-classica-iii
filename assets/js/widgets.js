/* ===================================================================
   widgets.js: simuladores e calculadoras interativas
   Uso nas páginas: <div data-widget="nome"></div>
   Mecânica Clássica III / LFCA–URCA
   =================================================================== */

(function () {
  'use strict';

  /* ---------- utilitários de DOM ---------- */
  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'texto') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  function moldura(raiz, titulo) {
    raiz.classList.add('widget');
    raiz.appendChild(el('div', { class: 'widget-cabeca', texto: titulo }));
    var corpo = el('div', { class: 'widget-corpo' });
    raiz.appendChild(corpo);
    return corpo;
  }

  /* Devolve o <input type=range>, para que o chamador possa movê-lo por código. */
  function deslizante(pai, rot, min, max, passo, inicial, aoMudar, formata) {
    var campo = el('div', { class: 'campo' });
    var lab = el('label');
    var val = el('span', { class: 'valor' });
    var inp = el('input', { type: 'range', min: min, max: max, step: passo, value: inicial });
    function mostrar() {
      val.innerHTML = formata ? formata(Number(inp.value)) : String(inp.value).replace('.', ',');
    }
    lab.innerHTML = rot + ' ';
    lab.appendChild(val);
    campo.appendChild(lab);
    campo.appendChild(inp);
    pai.appendChild(campo);
    inp.addEventListener('input', function () { mostrar(); aoMudar(Number(inp.value)); });
    mostrar();
    return inp;
  }

  /* Botões mutuamente exclusivos. Devolve uma função que troca a seleção. */
  function opcoes(pai, lista, inicial, aoMudar) {
    var cx = el('div', { class: 'botoes' });
    var bs = lista.map(function (o, i) {
      var b = el('button', { type: 'button', texto: o.rot });
      if (i !== inicial) b.classList.add('sec');
      b.addEventListener('click', function () {
        bs.forEach(function (x) { x.classList.add('sec'); });
        b.classList.remove('sec');
        aoMudar(o.v, o);
      });
      cx.appendChild(b);
      return b;
    });
    pai.appendChild(cx);
    return function (i) { bs[i].click(); };
  }

  function cartoes(pai, lista) {
    var g = el('div', { class: 'grade-num' });
    lista.forEach(function (c) {
      g.appendChild(el('div', { class: 'cartao-num', html:
        '<span class="rot">' + c.rot + '</span><span class="val" data-k="' + c.k + '">·</span>' }));
    });
    pai.appendChild(g);
    return function (vals) {
      Object.keys(vals).forEach(function (k) {
        var n = g.querySelector('[data-k="' + k + '"]');
        if (n) n.innerHTML = vals[k];
      });
    };
  }

  function tipografar(no) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([no]).catch(function () {});
    }
  }

  var REGISTRO = {};


  /* Seta com ponta, usada por quase todo widget de cinemática. */
  function seta(ct, xa, ya, xb, yb, cor, esp, tracejado) {
    var dx = xb - xa, dy = yb - ya, r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1.5) return;
    var ux = dx / r, uy = dy / r, p = Math.min(8, r * 0.42);
    ct.save();
    ct.strokeStyle = cor; ct.fillStyle = cor;
    ct.lineWidth = esp || 2; ct.lineCap = 'round'; ct.lineJoin = 'round';
    if (tracejado) ct.setLineDash(tracejado);
    ct.beginPath(); ct.moveTo(xa, ya); ct.lineTo(xb - ux * p * 0.8, yb - uy * p * 0.8);
    ct.stroke();
    ct.setLineDash([]);
    ct.beginPath();
    ct.moveTo(xb, yb);
    ct.lineTo(xb - ux * p - uy * p * 0.46, yb - uy * p + ux * p * 0.46);
    ct.lineTo(xb - ux * p + uy * p * 0.46, yb - uy * p - ux * p * 0.46);
    ct.closePath(); ct.fill();
    ct.restore();
  }

  /* Rótulo com halo branco, legível por cima de qualquer desenho. */
  function rotulo(ct, texto, x, y, cor, al, bl, fonte, corHalo) {
    ct.save();
    ct.font = fonte || '600 11px system-ui, sans-serif';
    ct.textAlign = al || 'center'; ct.textBaseline = bl || 'middle';
    ct.lineJoin = 'round'; ct.lineWidth = 3.5; ct.strokeStyle = corHalo || '#fff';
    ct.strokeText(texto, x, y);
    ct.fillStyle = cor; ct.fillText(texto, x, y);
    ct.restore();
  }

  /* =================================================================
     1. Campo de velocidades de um corpo rígido
     Três coisas que o texto afirma e que só convencem desenhadas: que
     a velocidade varia de ponto para ponto enquanto ω não varia; que a
     separação em translação mais rotação depende do ponto escolhido
     mas a soma não; e que a aceleração tem uma parte tangencial e uma
     centrípeta mesmo quando o ponto de apoio não acelera.
     ================================================================= */


  /* =================================================================
     1. Como as componentes de um tensor mudam com a base
     O texto afirma que um tensor é um objeto geométrico e que as nove
     componentes são apenas a sua descrição numa base. Três coisas só
     convencem desenhadas: que a elipse não gira quando a base gira;
     que existe um ângulo em que a componente fora da diagonal zera; e
     que o traço e o determinante não se mexem enquanto todo o resto
     muda.
     ================================================================= */
  REGISTRO.tensorgira = function (raiz) {
    var corpo = moldura(raiz, 'As componentes mudam, o tensor não');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var TENSORES = [
      { rot: 'Genérico', T: [[3, 1], [1, 2]] },
      { rot: 'Já diagonal', T: [[3, 0], [0, 1]] },
      { rot: 'Isotrópico', T: [[2, 0], [0, 2]] },
      { rot: 'Cisalhante', T: [[2, 1.6], [1.6, 2]] }
    ];
    var atual = 0, grau = 0;

    opcoes(corpo, TENSORES.map(function (o, i) { return { rot: o.rot, v: i }; }), 0,
      function (v) { atual = v; desenhar(); });

    var desl = deslizante(corpo, 'Ângulo da base \\(\\theta\\):', 0, 90, 1, 0,
      function (v) { grau = v; desenhar(); },
      function (v) { return v.toFixed(0) + '°'; });

    var bot = el('div', { class: 'botoes' });
    var bDiag = el('button', { type: 'button', class: 'sec', texto: 'Levar à diagonal' });
    bot.appendChild(bDiag);
    corpo.appendChild(bot);

    var mostrar = cartoes(corpo, [
      { rot: "\\(T'_{11}\\)", k: 't11' }, { rot: "\\(T'_{12}\\)", k: 't12' },
      { rot: "\\(T'_{22}\\)", k: 't22' }, { rot: 'Traço', k: 'tr' },
      { rot: 'Determinante', k: 'det' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    /* componentes na base girada de θ: T' = R T Rᵀ, com R de linha i o
       versor e'_i escrito na base velha */
    function gira(T, th) {
      var c = Math.cos(th), s = Math.sin(th);
      var R = [[c, s], [-s, c]];
      var out = [[0, 0], [0, 0]];
      for (var i = 0; i < 2; i++)
        for (var j = 0; j < 2; j++)
          for (var a = 0; a < 2; a++)
            for (var b = 0; b < 2; b++)
              out[i][j] += R[i][a] * T[a][b] * R[j][b];
      return out;
    }

    function anguloPrincipal(T) {
      if (Math.abs(T[0][1]) < 1e-12) return 0;
      return 0.5 * Math.atan2(2 * T[0][1], T[0][0] - T[1][1]);
    }

    bDiag.addEventListener('click', function () {
      var th = anguloPrincipal(TENSORES[atual].T) * 180 / Math.PI;
      while (th < 0) th += 180;
      if (th > 90) th -= 180;
      desl.value = String(Math.round(th));
      desl.dispatchEvent(new Event('input'));
    });

    function desenhar() {
      var p = G.preparar(cv, Math.min(330, Math.max(250, cv.clientWidth * 0.54)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2;
      var esc = Math.min(p.L, p.A) * 0.33;
      var T = TENSORES[atual].T, th = grau * Math.PI / 180;

      /* a elipse xᵀTx = 1 desenhada a partir dos autovetores de T */
      var tr = T[0][0] + T[1][1], det = T[0][0] * T[1][1] - T[0][1] * T[1][0];
      var disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      var l1 = tr / 2 + disc, l2 = tr / 2 - disc;
      var a1 = anguloPrincipal(T);

      ct.save();
      ct.translate(cx, cy);

      /* eixos antigos, sempre no lugar */
      ct.strokeStyle = '#cfd6dc'; ct.lineWidth = 1;
      ct.beginPath(); ct.moveTo(-esc * 1.5, 0); ct.lineTo(esc * 1.5, 0);
      ct.moveTo(0, -esc * 1.5); ct.lineTo(0, esc * 1.5); ct.stroke();

      /* elipse: no eixo principal i o semieixo vale 1/√λᵢ */
      ct.save();
      ct.rotate(-a1);
      ct.beginPath();
      ct.ellipse(0, 0, esc / Math.sqrt(Math.abs(l1)), esc / Math.sqrt(Math.abs(l2)),
                 0, 0, 2 * Math.PI);
      ct.fillStyle = 'rgba(122,58,107,.12)';
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2;
      ct.fill(); ct.stroke();
      ct.restore();

      ct.restore();

      /* versores da base nova */
      var c = Math.cos(th), s = Math.sin(th);
      seta(ct, cx, cy, cx + esc * 1.25 * c, cy - esc * 1.25 * s, G.COR.vinho, 2.4);
      seta(ct, cx, cy, cx - esc * 1.25 * s, cy - esc * 1.25 * c, G.COR.azul, 2.4);
      rotulo(ct, "e'₁", cx + esc * 1.25 * c + 12 * c, cy - esc * 1.25 * s - 12 * s,
             G.COR.vinho);
      rotulo(ct, "e'₂", cx - esc * 1.25 * s - 12 * s, cy - esc * 1.25 * c - 12 * c,
             G.COR.azul);
      rotulo(ct, 'e₁', cx + esc * 1.5 + 10, cy + 14, '#9aa6b1');
      rotulo(ct, 'e₂', cx + 16, cy - esc * 1.5 - 8, '#9aa6b1');

      var L = gira(T, th);
      mostrar({
        t11: F.fmt(L[0][0], 3), t12: F.fmt(L[0][1], 3), t22: F.fmt(L[1][1], 3),
        tr: F.fmt(L[0][0] + L[1][1], 3),
        det: F.fmt(L[0][0] * L[1][1] - L[0][1] * L[1][0], 3)
      });

      var thP = anguloPrincipal(T) * 180 / Math.PI;
      while (thP < 0) thP += 180;
      if (thP > 90) thP -= 180;
      saida.innerHTML = Math.abs(L[0][1]) < 5e-3
        ? 'A componente fora da diagonal zerou: esta base é a dos <strong>eixos '
          + 'principais</strong>, e os versores vermelhos e azuis apontam ao longo dos '
          + 'eixos da elipse. Os autovalores são \\(' + F.fmt(l1, 3) + '\\) e \\('
          + F.fmt(l2, 3) + '\\).'
        : 'A elipse está parada: girar a base não mexe no tensor, só na maneira de '
          + 'escrevê-lo. O ângulo que anula \\(T\'_{12}\\) é \\(' + F.fmt(thP, 1)
          + '^\\circ\\).';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     2. Decomposição em parte simétrica e parte antissimétrica
     A conta é de uma linha e o significado geométrico não é óbvio: a
     parte simétrica estica ao longo de duas direções perpendiculares e
     a antissimétrica apenas gira, porque é um produto vetorial escrito
     em forma de matriz.
     ================================================================= */
  REGISTRO.decompor = function (raiz) {
    var corpo = moldura(raiz, 'Simétrica estica, antissimétrica gira');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var a = 1.4, b = 1.1, c = -0.5, d = 0.9, parte = 0;

    opcoes(corpo, [{ rot: 'Tensor inteiro', v: 0 }, { rot: 'Só a simétrica', v: 1 },
                   { rot: 'Só a antissimétrica', v: 2 }], 0,
      function (v) { parte = v; desenhar(); });

    deslizante(corpo, '\\(M_{11}\\):', -2, 2, 0.1, a, function (v) { a = v; desenhar(); }, fm);
    deslizante(corpo, '\\(M_{12}\\):', -2, 2, 0.1, b, function (v) { b = v; desenhar(); }, fm);
    deslizante(corpo, '\\(M_{21}\\):', -2, 2, 0.1, c, function (v) { c = v; desenhar(); }, fm);
    deslizante(corpo, '\\(M_{22}\\):', -2, 2, 0.1, d, function (v) { d = v; desenhar(); }, fm);

    function fm(v) { return F.fmt(v, 2); }

    var mostrar = cartoes(corpo, [
      { rot: 'Parte antissim.', k: 'w' },
      { rot: 'Autovalor \\(\\lambda_1\\)', k: 'l1' },
      { rot: 'Autovalor \\(\\lambda_2\\)', k: 'l2' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      var p = G.preparar(cv, Math.min(320, Math.max(240, cv.clientWidth * 0.52)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2, esc = Math.min(p.L, p.A) * 0.3;

      var S = [[a, (b + c) / 2], [(b + c) / 2, d]];
      var A = [[0, (b - c) / 2], [(c - b) / 2, 0]];
      var M = parte === 1 ? S : parte === 2 ? A : [[a, b], [c, d]];

      ct.save(); ct.translate(cx, cy);
      ct.strokeStyle = '#cfd6dc'; ct.lineWidth = 1;
      ct.beginPath(); ct.moveTo(-esc * 1.6, 0); ct.lineTo(esc * 1.6, 0);
      ct.moveTo(0, -esc * 1.6); ct.lineTo(0, esc * 1.6); ct.stroke();

      /* círculo de vetores unitários e a sua imagem */
      ct.beginPath();
      for (var i = 0; i <= 90; i++) {
        var t = i / 90 * 2 * Math.PI;
        var x = Math.cos(t), y = Math.sin(t);
        if (i === 0) ct.moveTo(esc * x, -esc * y); else ct.lineTo(esc * x, -esc * y);
      }
      ct.strokeStyle = '#b9c3cc'; ct.setLineDash([4, 4]); ct.stroke(); ct.setLineDash([]);

      ct.beginPath();
      for (i = 0; i <= 180; i++) {
        t = i / 180 * 2 * Math.PI;
        x = Math.cos(t); y = Math.sin(t);
        var u = M[0][0] * x + M[0][1] * y, w = M[1][0] * x + M[1][1] * y;
        if (i === 0) ct.moveTo(esc * u, -esc * w); else ct.lineTo(esc * u, -esc * w);
      }
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2; ct.stroke();
      ct.restore();

      /* um vetor de prova e a sua imagem */
      var vx = Math.cos(Math.PI / 6), vy = Math.sin(Math.PI / 6);
      var ix = M[0][0] * vx + M[0][1] * vy, iy = M[1][0] * vx + M[1][1] * vy;
      seta(ct, cx, cy, cx + esc * vx, cy - esc * vy, '#9aa6b1', 2);
      seta(ct, cx, cy, cx + esc * ix, cy - esc * iy, G.COR.vinho, 2.4);
      rotulo(ct, 'v', cx + esc * vx + 12, cy - esc * vy - 8, '#6b7682');
      rotulo(ct, 'Mv', cx + esc * ix + 14, cy - esc * iy - 10, G.COR.vinho);

      var trS = S[0][0] + S[1][1];
      var detS = S[0][0] * S[1][1] - S[0][1] * S[1][0];
      var disc = Math.sqrt(Math.max(0, trS * trS / 4 - detS));
      mostrar({
        w: F.fmt((c - b) / 2, 2), l1: F.fmt(trS / 2 + disc, 3),
        l2: F.fmt(trS / 2 - disc, 3)
      });

      saida.innerHTML = parte === 2
        ? 'Sozinha, a parte antissimétrica leva todo vetor a um vetor perpendicular a ele: '
          + 'o círculo vira círculo e nada estica. Em três dimensões essa parte é '
          + '\\(\\vet{\\omega}\\cruz\\vet{v}\\), e em duas o número \\(\\omega\\) do cartão '
          + 'é a única componente que ela tem.'
        : parte === 1
          ? 'A parte simétrica estica ao longo de dois eixos perpendiculares, os seus '
            + 'autovetores, e os fatores de esticamento são os autovalores dos cartões. '
            + 'O círculo vira elipse sem girar de lado nenhum.'
          : 'A imagem do círculo é uma elipse girada. Separe as duas parcelas nos botões '
            + 'acima para ver de onde vem cada efeito: o esticamento é da parte simétrica, '
            + 'a torção é da antissimétrica.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* ---------- inicialização ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-widget]'), function (n) {
      var f = REGISTRO[n.getAttribute('data-widget')];
      if (f) {
        try { f(n); }
        catch (e) {
          n.innerHTML = '<div class="saida">Não foi possível carregar este componente.</div>';
          if (window.console) console.error(e);
        }
      }
    });
  });
})();
