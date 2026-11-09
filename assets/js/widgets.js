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


  /* ---------- projeção ortográfica simples, usada pelos widgets 3D ---------- */
  function projetor(azim, elev, esc, cx, cy) {
    var ca = Math.cos(azim), sa = Math.sin(azim);
    var ce = Math.cos(elev), se = Math.sin(elev);
    return function (p) {
      var x = p[0] * ca + p[1] * sa;
      var y = -p[0] * sa + p[1] * ca;
      return { x: cx + esc * x, y: cy - esc * (y * se + p[2] * ce),
               z: y * ce - p[2] * se };
    };
  }

  /* =================================================================
     3. Por que L deixa de ser paralelo a ω
     O halteres inclinado é o exemplo mínimo em que a conta fecha à
     mão: L sai perpendicular à barra, e portanto só fica paralelo a ω
     quando a barra é perpendicular ao eixo. O widget mostra o cone que
     L varre e o torque que o mancal precisa fazer para manter o eixo
     no lugar.
     ================================================================= */
  REGISTRO.desvioL = function (raiz) {
    var corpo = moldura(raiz, 'O halteres inclinado');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var grau = 60, fase = 0, animando = true;

    deslizante(corpo, 'Inclinação da barra \\(\\theta\\):', 5, 90, 1, grau,
      function (v) { grau = v; desenhar(); },
      function (v) { return v.toFixed(0) + '°'; });

    var bot = el('div', { class: 'botoes' });
    var bAnim = el('button', { type: 'button', texto: 'Parar a rotação' });
    bot.appendChild(bAnim);
    corpo.appendChild(bot);
    bAnim.addEventListener('click', function () {
      animando = !animando;
      bAnim.textContent = animando ? 'Parar a rotação' : 'Girar';
      if (animando) laco();
    });

    var mostrar = cartoes(corpo, [
      { rot: '\\(I_{zz}/mr^2\\)', k: 'izz' },
      { rot: '\\(I_{xz}/mr^2\\)', k: 'ixz' },
      { rot: '\\(\\angle(\\vet{L},\\vet{\\omega})\\)', k: 'ang' },
      { rot: '\\(|\\vet{\\tau}|/mr^2\\omega^2\\)', k: 'tau' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      var p = G.preparar(cv, Math.min(340, Math.max(250, cv.clientWidth * 0.56)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2 + 10;
      var esc = Math.min(p.L, p.A) * 0.3;
      var th = grau * Math.PI / 180;
      var P = projetor(fase, 0.42, esc, cx, cy);

      /* as duas massas em ±r, inclinadas de θ em relação a z */
      var u = [Math.sin(th), 0, Math.cos(th)];
      var A = P(u), B = P([-u[0], -u[1], -u[2]]);
      var O = P([0, 0, 0]);

      /* eixo de rotação */
      ct.strokeStyle = '#c8d0d7'; ct.lineWidth = 1.5;
      var zt = P([0, 0, 1.45]), zb = P([0, 0, -1.45]);
      ct.beginPath(); ct.moveTo(zb.x, zb.y); ct.lineTo(zt.x, zt.y); ct.stroke();

      /* cone varrido por L: L é perpendicular à barra, no plano da barra e de z */
      var Lz = Math.sin(th) * Math.sin(th), Lx = -Math.sin(th) * Math.cos(th);
      var Lm = Math.sqrt(Lx * Lx + Lz * Lz);
      ct.beginPath();
      for (var i = 0; i <= 72; i++) {
        var a = i / 72 * 2 * Math.PI;
        var q = P([1.15 * Lx / Lm * Math.cos(a), 1.15 * Lx / Lm * Math.sin(a),
                   1.15 * Lz / Lm]);
        if (i === 0) ct.moveTo(q.x, q.y); else ct.lineTo(q.x, q.y);
      }
      ct.strokeStyle = '#d9c3d4'; ct.setLineDash([4, 4]); ct.lineWidth = 1.3;
      ct.stroke(); ct.setLineDash([]);

      /* barra e massas */
      ct.strokeStyle = '#6b7682'; ct.lineWidth = 3;
      ct.beginPath(); ct.moveTo(A.x, A.y); ct.lineTo(B.x, B.y); ct.stroke();
      [A, B].forEach(function (q) {
        ct.beginPath(); ct.arc(q.x, q.y, 9, 0, 2 * Math.PI);
        ct.fillStyle = '#4a5560'; ct.fill();
      });

      /* ω e L */
      seta(ct, O.x, O.y, zt.x, zt.y, G.COR.azul, 2.6);
      var Lr = P([1.3 * Lx / Lm, 0, 1.3 * Lz / Lm]);
      seta(ct, O.x, O.y, Lr.x, Lr.y, G.COR.vinho, 2.6);
      rotulo(ct, 'ω', zt.x + 14, zt.y, G.COR.azul);
      rotulo(ct, 'L', Lr.x + 14, Lr.y - 6, G.COR.vinho);

      var ang = 90 - grau;
      mostrar({
        izz: F.fmt(2 * Math.sin(th) * Math.sin(th), 3),
        ixz: F.fmt(-2 * Math.sin(th) * Math.cos(th), 3),
        ang: F.fmt(ang, 1) + '°',
        tau: F.fmt(2 * Math.sin(th) * Math.cos(th), 3)
      });

      saida.innerHTML = grau > 88
        ? 'Com a barra perpendicular ao eixo, \\(I_{xz}=0\\) e o momento angular aponta '
          + 'ao longo de \\(\\vet{\\omega}\\). Esta é a situação de MC II, e é a única em '
          + 'que um número basta.'
        : 'O momento angular é perpendicular à barra, e por isso faz com \\(\\vet{\\omega}\\) '
          + 'o ângulo \\(90^\\circ-\\theta=' + F.fmt(ang, 1) + '^\\circ\\). Como '
          + '\\(\\vet{L}\\) gira junto com a barra, ele varre o cone pontilhado, muda de '
          + 'direção o tempo todo, e o mancal precisa fazer o torque do último cartão só '
          + 'para manter o eixo no lugar.';
      tipografar(saida);
      tipografar(raiz);
    }

    function laco() {
      if (!animando) return;
      fase += 0.03;
      desenhar();
      requestAnimationFrame(laco);
    }

    registrarRedesenho(desenhar);
    laco();
  };

  /* =================================================================
     4. O cubo girando em torno de um vértice
     O tensor do cubo sai por integração no texto; aqui o aluno escolhe
     a direção de ω e vê o ângulo entre L e ω, que é nulo em três
     direções privilegiadas. São os eixos principais, que a aula 3
     calcula.
     ================================================================= */
  REGISTRO.cubovertice = function (raiz) {
    var corpo = moldura(raiz, 'O cubo pelo vértice: para onde aponta L');
    var cv = el('canvas');
    corpo.appendChild(cv);

    /* em unidades de Ma², com a origem no vértice */
    var I = [[8 / 12, -3 / 12, -3 / 12], [-3 / 12, 8 / 12, -3 / 12],
             [-3 / 12, -3 / 12, 8 / 12]];
    var polar = 54.7356, azimute = 45, fase = 0.9;

    var dP = deslizante(corpo, 'Polar \\(\\vartheta\\) de \\(\\vet{\\omega}\\):', 0, 90, 1,
      polar, function (v) { polar = v; desenhar(); },
      function (v) { return v.toFixed(0) + '°'; });
    var dA = deslizante(corpo, 'Azimute \\(\\varphi\\) de \\(\\vet{\\omega}\\):', 0, 90, 1,
      azimute, function (v) { azimute = v; desenhar(); },
      function (v) { return v.toFixed(0) + '°'; });

    function irPara(p, a) {
      dP.value = String(p); dP.dispatchEvent(new Event('input'));
      dA.value = String(a); dA.dispatchEvent(new Event('input'));
    }
    opcoes(corpo, [{ rot: 'Aresta', v: 0 }, { rot: 'Diagonal da face', v: 1 },
                   { rot: 'Diagonal do cubo', v: 2 }], 2, function (v) {
      if (v === 0) irPara(90, 0);
      else if (v === 1) irPara(90, 45);
      else irPara(55, 45);
    });

    var mostrar = cartoes(corpo, [
      { rot: '\\(\\angle(\\vet{L},\\vet{\\omega})\\)', k: 'ang' },
      { rot: '\\(I_{\\text{eixo}}/Ma^2\\)', k: 'ief' },
      { rot: '\\(2T/Ma^2\\omega^2\\)', k: 'ene' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function aplica(M, v) {
      return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
              M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
              M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
    }

    function desenhar() {
      var p = G.preparar(cv, Math.min(350, Math.max(260, cv.clientWidth * 0.58)));
      var ct = p.ct, cx = p.L / 2 - 20, cy = p.A / 2 + 40;
      var esc = Math.min(p.L, p.A) * 0.4;
      var P = projetor(fase, 0.46, esc, cx, cy);

      /* arestas do cubo unitário com um vértice na origem */
      var V = [];
      for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) for (var c = 0; c < 2; c++)
        V.push([a, b, c]);
      ct.strokeStyle = '#b9c3cc'; ct.lineWidth = 1.4;
      for (var i = 0; i < V.length; i++)
        for (var j = i + 1; j < V.length; j++) {
          var d = Math.abs(V[i][0] - V[j][0]) + Math.abs(V[i][1] - V[j][1])
                + Math.abs(V[i][2] - V[j][2]);
          if (d !== 1) continue;
          var q1 = P(V[i]), q2 = P(V[j]);
          ct.beginPath(); ct.moveTo(q1.x, q1.y); ct.lineTo(q2.x, q2.y); ct.stroke();
        }

      var th = polar * Math.PI / 180, ph = azimute * Math.PI / 180;
      var n = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
      var L = aplica(I, n);
      var Lm = Math.sqrt(L[0] * L[0] + L[1] * L[1] + L[2] * L[2]);
      var Lu = [L[0] / Lm, L[1] / Lm, L[2] / Lm];

      var O = P([0, 0, 0]);
      ct.beginPath(); ct.arc(O.x, O.y, 4, 0, 2 * Math.PI);
      ct.fillStyle = '#4a5560'; ct.fill();
      /* ω um pouco mais longa, para continuar visível quando L coincide com ela */
      var qw = P([1.7 * n[0], 1.7 * n[1], 1.7 * n[2]]);
      var qL = P([1.3 * Lu[0], 1.3 * Lu[1], 1.3 * Lu[2]]);
      seta(ct, O.x, O.y, qw.x, qw.y, G.COR.azul, 2.6);
      seta(ct, O.x, O.y, qL.x, qL.y, G.COR.vinho, 3.2);
      rotulo(ct, 'ω', qw.x + 13, qw.y - 8, G.COR.azul);
      rotulo(ct, 'L', qL.x - 6, qL.y + 15, G.COR.vinho);

      var cosA = Math.max(-1, Math.min(1, (L[0] * n[0] + L[1] * n[1] + L[2] * n[2]) / Lm));
      var ang = Math.acos(cosA) * 180 / Math.PI;
      var ief = L[0] * n[0] + L[1] * n[1] + L[2] * n[2];
      mostrar({ ang: (ang < 0.01 ? '0,00' : F.fmt(ang, 2)) + '°',
                ief: F.fmt(ief, 4), ene: F.fmt(ief, 4) });

      saida.innerHTML = ang < 0.6
        ? 'Nesta direção \\(\\vet{L}\\) e \\(\\vet{\\omega}\\) são paralelos: ela é um '
          + '<strong>eixo principal</strong> do cubo, e o momento de inércia em torno dela '
          + 'é o autovalor \\(' + F.fmt(ief, 4) + '\\,Ma^2\\). A aula 3 mostra como achar '
          + 'essas direções sem procurar.'
        : 'O ângulo entre \\(\\vet{L}\\) e \\(\\vet{\\omega}\\) vale \\('
          + F.fmt(ang, 2) + '^\\circ\\). Pela aresta ele chega a 27,94°, e pela diagonal da '
          + 'face a 40,32°. O momento de inércia em torno do eixo, que aparece na energia '
          + 'cinética, é sempre \\(\\vers{n}\\cdot\\Ten{I}\\cdot\\vers{n}\\).';
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
