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


  /* =================================================================
     5. A equação secular e as suas raízes
     O polinômio característico é abstrato; o gráfico dele não é. O
     aluno mexe no produto de inércia e vê as três raízes saírem de um
     ponto triplo, se separarem e, em certos valores, voltarem a
     coincidir duas a duas. A degenerescência deixa de ser um caso
     excepcional de livro e passa a ser uma coisa que se vê.
     ================================================================= */
  REGISTRO.secular = function (raiz) {
    var corpo = moldura(raiz, 'As raízes do polinômio característico');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var b = -3;   /* produto de inércia, em unidades de μ = Ma²/12 */

    deslizante(corpo, 'Produto de inércia \\(I_{xy}=I_{xz}=I_{yz}\\):', -4, 4, 0.1, b,
      function (v) { b = v; desenhar(); }, function (v) { return F.fmt(v, 1) + ' μ'; });

    var mostrar = cartoes(corpo, [
      { rot: '\\(\\lambda_1/\\mu\\)', k: 'l1' }, { rot: '\\(\\lambda_2/\\mu\\)', k: 'l2' },
      { rot: '\\(\\lambda_3/\\mu\\)', k: 'l3' }, { rot: 'Soma', k: 'tr' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    /* matriz 8 na diagonal e b fora: as raízes saem em forma fechada */
    function raizes() { return [8 + 2 * b, 8 - b, 8 - b]; }

    function pol(x) {
      return (x - (8 + 2 * b)) * (x - (8 - b)) * (x - (8 - b));
    }

    function desenhar() {
      var r = raizes();
      var lo = Math.min.apply(null, r) - 3, hi = Math.max.apply(null, r) + 3;
      var m = 0;
      for (var x = lo; x <= hi; x += (hi - lo) / 200) m = Math.max(m, Math.abs(pol(x)));
      var g = G.eixos(cv, {
        xmin: lo, xmax: hi, ymin: -m, ymax: m, divY: 4,
        altura: Math.min(300, Math.max(220, cv.clientWidth * 0.42)),
        rotX: 'λ / μ', formataY: function () { return ''; },
        marcasX: G.marcasLineares(lo, hi, 6, 0)
      });
      G.curva(g, pol, G.COR.mestra, 2.2);
      var ct = g.ct;
      ct.strokeStyle = '#c8d0d7'; ct.lineWidth = 1;
      ct.beginPath(); ct.moveTo(g.X(lo), g.Y(0)); ct.lineTo(g.X(hi), g.Y(0)); ct.stroke();
      r.forEach(function (v, i) {
        ct.beginPath(); ct.arc(g.X(v), g.Y(0), 5, 0, 2 * Math.PI);
        ct.fillStyle = i === 0 ? G.COR.vinho : G.COR.azul; ct.fill();
      });
      rotulo(ct, 'diagonal do cubo', g.X(r[0]), g.Y(0) - 16, G.COR.vinho);
      rotulo(ct, 'duas raízes iguais', g.X(r[1]), g.Y(0) + 18, G.COR.azul);

      mostrar({ l1: F.fmt(r[0], 2), l2: F.fmt(r[1], 2), l3: F.fmt(r[2], 2),
                tr: F.fmt(r[0] + r[1] + r[2], 2) });

      saida.innerHTML = Math.abs(b) < 0.05
        ? 'Com os produtos de inércia nulos a matriz já é diagonal e as três raízes '
          + 'coincidem: todo eixo pelo ponto é principal, como acontece no centro do cubo '
          + 'e em qualquer esfera.'
        : 'A soma das três raízes é 24 \\(\\mu\\) qualquer que seja o produto de inércia, '
          + 'porque o traço é invariante. Para \\(I_{xy}=-3\\mu\\), que é o cubo pelo '
          + 'vértice, as raízes são \\(2\\mu\\) e \\(11\\mu\\) duas vezes.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     6. O elipsoide de inércia
     A afirmação de Poinsot, de que L é normal à superfície do
     elipsoide no ponto em que ω a fura, é geométrica e fica evidente
     num corte bidimensional: a tangente desenhada no ponto é sempre
     perpendicular à seta vermelha.
     ================================================================= */
  REGISTRO.elipsoide = function (raiz) {
    var corpo = moldura(raiz, 'L é normal ao elipsoide de inércia');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var I1 = 1, I2 = 3, dir = 35;

    deslizante(corpo, 'Direção de \\(\\vet{\\omega}\\):', 0, 180, 1, dir,
      function (v) { dir = v; desenhar(); }, function (v) { return v.toFixed(0) + '°'; });
    deslizante(corpo, '\\(I_2/I_1\\):', 1, 6, 0.1, I2,
      function (v) { I2 = v; desenhar(); }, function (v) { return F.fmt(v, 1); });

    var mostrar = cartoes(corpo, [
      { rot: '\\(\\angle(\\vet{L},\\vet{\\omega})\\)', k: 'ang' },
      { rot: '\\(I_{\\text{eixo}}/I_1\\)', k: 'ief' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      var p = G.preparar(cv, Math.min(320, Math.max(240, cv.clientWidth * 0.5)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2, esc = Math.min(p.L, p.A) * 0.32;
      var th = dir * Math.PI / 180;

      ct.strokeStyle = '#cfd6dc'; ct.lineWidth = 1;
      ct.beginPath(); ct.moveTo(cx - esc * 1.8, cy); ct.lineTo(cx + esc * 1.8, cy);
      ct.moveTo(cx, cy - esc * 1.8); ct.lineTo(cx, cy + esc * 1.8); ct.stroke();

      /* elipse ω·I·ω = 1, com semieixos 1/√Iᵢ */
      ct.beginPath();
      ct.ellipse(cx, cy, esc / Math.sqrt(I1), esc / Math.sqrt(I2), 0, 0, 2 * Math.PI);
      ct.fillStyle = 'rgba(122,58,107,.1)';
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 2;
      ct.fill(); ct.stroke();

      /* ponto em que ω fura a elipse */
      var c = Math.cos(th), sn = Math.sin(th);
      var r = 1 / Math.sqrt(I1 * c * c + I2 * sn * sn);
      var px = cx + esc * r * c, py = cy - esc * r * sn;
      seta(ct, cx, cy, px, py, G.COR.azul, 2.4);

      /* normal: L ∝ I·ω */
      var Lx = I1 * r * c, Ly = I2 * r * sn;
      var Lm = Math.sqrt(Lx * Lx + Ly * Ly);
      seta(ct, px, py, px + 52 * Lx / Lm, py - 52 * Ly / Lm, G.COR.vinho, 2.4);

      /* plano tangente */
      ct.strokeStyle = '#9aa6b1'; ct.lineWidth = 1.4; ct.setLineDash([5, 4]);
      ct.beginPath();
      ct.moveTo(px - 70 * Ly / Lm, py - 70 * Lx / Lm);
      ct.lineTo(px + 70 * Ly / Lm, py + 70 * Lx / Lm);
      ct.stroke(); ct.setLineDash([]);

      rotulo(ct, 'ω', cx + (px - cx) * 0.55 - 14, cy + (py - cy) * 0.55 - 10, G.COR.azul);
      rotulo(ct, 'L', px + 62 * Lx / Lm, py - 62 * Ly / Lm - 10, G.COR.vinho);

      var cosA = (Lx * r * c + Ly * r * sn) / (Lm * r);
      var ang = Math.acos(Math.max(-1, Math.min(1, cosA))) * 180 / Math.PI;
      mostrar({ ang: F.fmt(ang, 2) + '°',
                ief: F.fmt(I1 * c * c + I2 * sn * sn, 3) });

      saida.innerHTML = ang < 0.3
        ? 'Nesta direção \\(\\vet{L}\\) acompanha \\(\\vet{\\omega}\\): a seta vermelha é '
          + 'radial e o plano tangente é perpendicular ao raio. É um eixo principal, e os '
          + 'eixos principais são exatamente os eixos de simetria do elipsoide.'
        : 'A seta vermelha é sempre perpendicular à reta tangente, qualquer que seja a '
          + 'direção escolhida: é esse o conteúdo geométrico de \\(\\vet{L}=\\Ten{I}\\cdot'
          + '\\vet{\\omega}\\). Ela só fica radial, e portanto paralela a \\(\\vet{\\omega}'
          + '\\), nas direções dos eixos do elipsoide.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };


  /* ---------- integrador de Euler livre, usado nos widgets 7 e 8 ---------- */
  function passoEuler(w, L, h) {
    function f(w) {
      return [(L[1] - L[2]) * w[1] * w[2] / L[0],
              (L[2] - L[0]) * w[2] * w[0] / L[1],
              (L[0] - L[1]) * w[0] * w[1] / L[2]];
    }
    function soma(a, b, k) {
      return [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
    }
    var k1 = f(w), k2 = f(soma(w, k1, h / 2)), k3 = f(soma(w, k2, h / 2));
    var k4 = f(soma(w, k3, h));
    return [w[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            w[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
            w[2] + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])];
  }

  /* =================================================================
     7. Rotação livre: estabilidade dos três eixos
     As equações de Euler são integradas numericamente com um corpo
     posto a girar quase em torno de um dos eixos principais. Em torno
     do maior e do menor momento o desvio oscila; em torno do
     intermediário ele cresce e o corpo vira. É a porca de Dzhanibekov,
     e não há nada de aproximado na conta.
     ================================================================= */
  REGISTRO.eulerlivre = function (raiz) {
    var corpo = moldura(raiz, 'O corpo posto a girar quase em torno de um eixo');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var L = [1, 2, 3];     /* momentos principais, em unidades arbitrárias */
    var eixo = 1, desvio = 0.05, TMAX = 60;

    opcoes(corpo, [{ rot: 'Menor (λ₁)', v: 0 }, { rot: 'Intermediário (λ₂)', v: 1 },
                   { rot: 'Maior (λ₃)', v: 2 }], 1, function (v) { eixo = v; desenhar(); });

    deslizante(corpo, 'Desvio inicial:', 0.01, 0.3, 0.01, desvio,
      function (v) { desvio = v; desenhar(); }, function (v) { return F.fmt(v, 2); });

    var mostrar = cartoes(corpo, [
      { rot: 'Regime', k: 'reg' },
      { rot: 'Período da oscilação', k: 'per' },
      { rot: 'Erro em \\(2T\\)', k: 'ene' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function trajetoria() {
      var w = [0, 0, 0];
      w[eixo] = 1;
      w[(eixo + 1) % 3] = desvio;
      w[(eixo + 2) % 3] = desvio / 2;
      var h = 0.01, pontos = [], E0 = 0;
      for (var i = 0; i < 3; i++) E0 += L[i] * w[i] * w[i];
      var maxErro = 0;
      for (var t = 0; t <= TMAX; t += h) {
        pontos.push([t, w[0], w[1], w[2]]);
        var E = 0;
        for (i = 0; i < 3; i++) E += L[i] * w[i] * w[i];
        maxErro = Math.max(maxErro, Math.abs(E - E0) / E0);
        w = passoEuler(w, L, h);
      }
      return { pontos: pontos, erro: maxErro };
    }

    function desenhar() {
      var r = trajetoria();
      var g = G.eixos(cv, {
        xmin: 0, xmax: TMAX, ymin: -1.15, ymax: 1.15, divY: 4,
        altura: Math.min(300, Math.max(220, cv.clientWidth * 0.42)),
        rotX: 'tempo (unidades de 1/ω)',
        marcasX: G.marcasLineares(0, TMAX, 6, 0),
        formataY: function (v) { return F.fmt(v, 1); }
      });
      var cores = [G.COR.bronze, G.COR.mestra, G.COR.azul];
      for (var c = 0; c < 3; c++) {
        g.ct.beginPath();
        r.pontos.forEach(function (p, i) {
          var x = g.X(p[0]), y = g.Y(p[c + 1]);
          if (i === 0) g.ct.moveTo(x, y); else g.ct.lineTo(x, y);
        });
        g.ct.strokeStyle = cores[c]; g.ct.lineWidth = 1.8; g.ct.stroke();
      }
      G.legenda(g, [{ texto: 'ω₁', cor: cores[0] }, { texto: 'ω₂', cor: cores[1] },
                    { texto: 'ω₃', cor: cores[2] }]);

      /* o eixo escolhido virou? procura troca de sinal na componente principal */
      var virou = false, extremo = 0;
      r.pontos.forEach(function (p) {
        if (p[eixo + 1] < -0.5) virou = true;
        extremo = Math.max(extremo, Math.abs(p[((eixo + 1) % 3) + 1]));
      });

      /* período previsto pela análise de estabilidade */
      var a = L[eixo], b = L[(eixo + 1) % 3], c2 = L[(eixo + 2) % 3];
      var fator = (a - b) * (a - c2) / (b * c2);
      var per = fator > 0 ? 2 * Math.PI / Math.sqrt(fator) : NaN;

      mostrar({
        reg: virou ? 'instável' : 'estável',
        per: isNaN(per) ? 'não oscila' : F.fmt(per, 2),
        ene: r.erro < 1e-9 ? 'abaixo de 10⁻⁷ %'
             : (100 * r.erro).toExponential(1).replace('.', ',') + ' %'
      });

      saida.innerHTML = virou
        ? 'Em torno do eixo intermediário o desvio cresce até o corpo dar meia-volta, e '
          + 'então recomeça. Nenhuma aproximação foi feita: as equações de Euler foram '
          + 'integradas com Runge-Kutta de quarta ordem, e o erro na energia está no último '
          + 'cartão. É o efeito que Dzhanibekov filmou em 1985.'
        : 'Em torno do maior e do menor momento o desvio apenas oscila, com o período do '
          + 'cartão, e a componente principal mal se move. A rotação é estável, e é por isso '
          + 'que se pode jogar uma bola de futebol americano girando em torno do eixo longo '
          + 'ou do eixo curto, mas não do intermediário.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     8. A polhodia
     As duas constantes do movimento livre, 2T e L², são dois
     elipsoides no espaço de ω. A trajetória é a interseção deles, e
     projetá-la no plano ω₁ω₂ mostra de uma vez a razão geométrica da
     instabilidade: as curvas em torno dos eixos extremos são fechadas
     e pequenas, e as que passam perto do eixo intermediário dão a
     volta no corpo inteiro.
     ================================================================= */
  REGISTRO.polhodia = function (raiz) {
    var corpo = moldura(raiz, 'As trajetórias de ω no referencial do corpo');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var L = [1, 2, 3];
    var l2 = 2, giro = 0.9;

    deslizante(corpo, 'Momento intermediário \\(\\lambda_2\\):', 1.05, 2.95, 0.05, l2,
      function (v) { l2 = v; desenhar(); }, function (v) { return F.fmt(v, 2); });
    deslizante(corpo, 'Girar a figura:', 0, 180, 1, 52,
      function (v) { giro = v * Math.PI / 180; desenhar(); },
      function (v) { return v.toFixed(0) + '°'; });

    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      L[1] = l2;
      var p = G.preparar(cv, Math.min(340, Math.max(260, cv.clientWidth * 0.56)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2, esc = Math.min(p.L, p.A) * 0.38;
      var P = projetor(giro, 0.5, esc, cx, cy);

      /* a esfera |ω| = 1, que contém todas as trajetórias deste desenho */
      ct.beginPath(); ct.arc(cx, cy, esc, 0, 2 * Math.PI);
      ct.fillStyle = '#fbf7fa'; ct.strokeStyle = '#dde3e8'; ct.lineWidth = 1;
      ct.fill(); ct.stroke();

      /* os três eixos principais */
      [[1, 0, 0, 'e₁ (menor)'], [0, 1, 0, 'e₂ (intermediário)'],
       [0, 0, 1, 'e₃ (maior)']].forEach(function (e) {
        var q = P([e[0] * 1.3, e[1] * 1.3, e[2] * 1.3]);
        var o = P([0, 0, 0]);
        ct.strokeStyle = '#c3ccd4'; ct.lineWidth = 1.2;
        ct.beginPath(); ct.moveTo(o.x, o.y); ct.lineTo(q.x, q.y); ct.stroke();
        rotulo(ct, e[3], q.x, q.y - 12, '#4a5560');
      });

      /* uma família de condições iniciais espalhada pela esfera */
      var inicios = [];
      for (var a = 12; a < 90; a += 19)
        for (var b = 0; b < 360; b += 60) {
          var t = a * Math.PI / 180, f = b * Math.PI / 180;
          inicios.push([Math.sin(t) * Math.cos(f), Math.sin(t) * Math.sin(f), Math.cos(t)]);
        }

      inicios.forEach(function (w) {
        var frente = [], tras = [];
        for (var i = 0; i < 800; i++) {
          var q = P(w);
          (q.z > 0 ? frente : tras).push([q, i]);
          w = passoEuler(w, L, 0.02);
        }
        [[tras, 'rgba(122,58,107,.18)'], [frente, 'rgba(122,58,107,.6)']]
          .forEach(function (par) {
            ct.strokeStyle = par[1]; ct.lineWidth = 1.1;
            ct.beginPath();
            var ult = -2;
            par[0].forEach(function (d) {
              if (d[1] === ult + 1) ct.lineTo(d[0].x, d[0].y);
              else ct.moveTo(d[0].x, d[0].y);
              ult = d[1];
            });
            ct.stroke();
          });
      });

      var meio = (l2 > L[0] + 0.08 && l2 < L[2] - 0.08);
      saida.innerHTML = meio
        ? 'Cada curva é uma trajetória possível de \\(\\vet{\\omega}\\) vista do corpo. '
          + 'Em torno de \\(\\vers{e}_1\\) e de \\(\\vers{e}_3\\) elas se fecham em laços '
          + 'pequenos; em torno de \\(\\vers{e}_2\\) não há laço nenhum, e as curvas '
          + 'atravessam a esfera de um polo ao outro. As duas famílias são separadas pela '
          + 'separatriz, que passa exatamente por \\(\\vers{e}_2\\).'
        : 'Com \\(\\lambda_2\\) encostado num dos extremos o corpo vira um pião simétrico: '
          + 'a separatriz desaparece e todas as trajetórias viram paralelos em torno do '
          + 'eixo de simetria. É o caso da Terra e de qualquer corpo de revolução.';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };


  /* =================================================================
     9. O potencial efetivo do pião pesado
     Reduzir o pião a um problema unidimensional em θ é o truque que
     torna o movimento inteligível. O gráfico mostra a barreira nos
     dois extremos, o poço no meio e a faixa de nutação que o nível de
     energia recorta.
     ================================================================= */
  REGISTRO.potefetivo = function (raiz) {
    var corpo = moldura(raiz, 'O poço em que o ângulo de inclinação oscila');
    var cv = el('canvas');
    corpo.appendChild(cv);

    /* unidades: λ₁ = 1, MgR = 1 */
    var L3 = 3, Lz = 2.2, E = 2.6;

    deslizante(corpo, '\\(L_3\\) (giro próprio):', 1, 6, 0.1, L3,
      function (v) { L3 = v; desenhar(); }, function (v) { return F.fmt(v, 1); });
    deslizante(corpo, '\\(L_z\\) (momento vertical):', -3, 6, 0.1, Lz,
      function (v) { Lz = v; desenhar(); }, function (v) { return F.fmt(v, 1); });
    deslizante(corpo, 'Energia \\(E\\):', 0.5, 8, 0.05, E,
      function (v) { E = v; desenhar(); }, function (v) { return F.fmt(v, 2); });

    var mostrar = cartoes(corpo, [
      { rot: '\\(\\theta\\) mínimo', k: 't1' }, { rot: '\\(\\theta\\) máximo', k: 't2' },
      { rot: '\\(\\theta\\) de equilíbrio', k: 't0' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function U(t) {
      var sn = Math.sin(t);
      if (Math.abs(sn) < 1e-4) return 1e6;
      var d = Lz - L3 * Math.cos(t);
      return d * d / (2 * sn * sn) + Math.cos(t);
    }

    function desenhar() {
      var lo = 0.02, hi = Math.PI - 0.02;
      var umin = 1e9, tmin = 0;
      for (var t = lo; t <= hi; t += 0.001) {
        var u = U(t);
        if (u < umin) { umin = u; tmin = t; }
      }
      var g = G.eixos(cv, {
        xmin: 0, xmax: 180, ymin: Math.min(umin - 0.5, -1.2),
        ymax: Math.max(E + 1.5, umin + 3), divY: 5,
        altura: Math.min(300, Math.max(220, cv.clientWidth * 0.42)),
        rotX: 'θ (graus)', rotY: 'U_ef  (MgR = 1)',
        marcasX: G.marcasLineares(0, 180, 6, 0),
        formataY: function (v) { return F.fmt(v, 1); }
      });

      /* faixa permitida */
      var t1 = null, t2 = null;
      for (t = lo; t <= hi; t += 0.0005) {
        if (U(t) <= E) { if (t1 === null) t1 = t; t2 = t; }
      }
      if (t1 !== null) {
        g.ct.fillStyle = 'rgba(122,58,107,.10)';
        g.ct.fillRect(g.X(t1 * 180 / Math.PI), g.y0,
                      g.X(t2 * 180 / Math.PI) - g.X(t1 * 180 / Math.PI), g.y1 - g.y0);
      }

      g.ct.save();
      g.ct.beginPath();
      g.ct.rect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0);
      g.ct.clip();
      G.curva(g, function (x) { return U(x * Math.PI / 180); }, G.COR.mestra, 2.2);
      g.ct.restore();
      g.ct.strokeStyle = G.COR.vinho; g.ct.lineWidth = 1.6;
      g.ct.setLineDash([6, 4]);
      g.ct.beginPath(); g.ct.moveTo(g.x0, g.Y(E)); g.ct.lineTo(g.x1, g.Y(E)); g.ct.stroke();
      g.ct.setLineDash([]);
      rotulo(g.ct, 'E', g.x1 - 14, g.Y(E) - 10, G.COR.vinho);

      mostrar({
        t1: t1 === null ? '—' : F.fmt(t1 * 180 / Math.PI, 1) + '°',
        t2: t2 === null ? '—' : F.fmt(t2 * 180 / Math.PI, 1) + '°',
        t0: F.fmt(tmin * 180 / Math.PI, 1) + '°'
      });

      saida.innerHTML = t1 === null
        ? 'Com esta energia não há movimento possível: \\(E\\) está abaixo do fundo do '
          + 'poço, e o pião não pode existir nessas condições.'
        : (t2 - t1 < 0.02
          ? 'A energia encostou no fundo do poço: o ângulo fica parado em \\('
            + F.fmt(tmin * 180 / Math.PI, 1) + '^\\circ\\) e o eixo apenas precessa, sem '
            + 'subir nem descer. É a <strong>precessão estacionária</strong>.'
          : 'O ângulo do eixo oscila entre os dois valores dos cartões, que são os pontos '
            + 'em que a reta da energia corta o potencial efetivo. Essa oscilação é a '
            + '<strong>nutação</strong>, e acontece ao mesmo tempo que a precessão em '
            + '\\(\\varphi\\). As paredes em \\(0^\\circ\\) e \\(180^\\circ\\) são '
            + 'infinitas sempre que \\(L_z\\neq\\pm L_3\\): o eixo nunca chega à vertical.');
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };

  /* =================================================================
     10. O desenho que a ponta do eixo faz
     Com o mesmo potencial efetivo, integra-se θ(t) e φ(t) e desenha-se
     o rastro do eixo visto de cima. Os três casos clássicos aparecem
     conforme Lz esteja abaixo, igual ou acima de L₃cos θ₀.
     ================================================================= */
  REGISTRO.piaorastro = function (raiz) {
    var corpo = moldura(raiz, 'O rastro do eixo do pião, visto de cima');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var L3 = 4, caso = 1, t0 = 60;

    opcoes(corpo, [{ rot: 'Com laços', v: 0 }, { rot: 'Com bicos', v: 1 },
                   { rot: 'Ondulado', v: 2 }], 1, function (v) { caso = v; desenhar(); });
    deslizante(corpo, 'Giro próprio \\(L_3\\):', 2, 8, 0.1, L3,
      function (v) { L3 = v; desenhar(); }, function (v) { return F.fmt(v, 1); });
    deslizante(corpo, 'Inclinação inicial \\(\\theta_0\\):', 20, 120, 1, t0,
      function (v) { t0 = v; desenhar(); }, function (v) { return v.toFixed(0) + '°'; });

    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      var th0 = t0 * Math.PI / 180;

      function dU(Lz, t) {
        var h = 1e-6;
        function U(x) {
          var sn = Math.sin(x), d = Lz - L3 * Math.cos(x);
          return d * d / (2 * sn * sn) + Math.cos(x);
        }
        return (U(t + h) - U(t - h)) / (2 * h);
      }

      /* Lz do caso com bicos: a precessão para no ponto de partida */
      var Lbico = L3 * Math.cos(th0);

      /* acima de um certo Lz o eixo sobe em vez de cair, e a figura deixa de
         ter nutação visível; o valor limite sai por bisseção */
      function limite() {
        var a = Lbico, b = Lbico + 8;
        for (var i = 0; i < 50; i++) {
          var m = (a + b) / 2;
          if (dU(m, th0) < 0) a = m; else b = m;
        }
        return a;
      }

      var Lz = caso === 1 ? Lbico
             : caso === 0 ? Lbico - 0.45
             : Lbico + 0.5 * (limite() - Lbico);

      var y = [th0, 0], ph = 0, pts = [], h = 0.002;
      function f(v) { return [v[1], -dU(Lz, v[0])]; }
      for (var i = 0; i < 18000; i++) {
        pts.push([y[0], ph]);
        var k1 = f(y);
        var k2 = f([y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]]);
        var k3 = f([y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]]);
        var k4 = f([y[0] + h * k3[0], y[1] + h * k3[1]]);
        y = [y[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
             y[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
        y[0] = Math.max(0.03, Math.min(Math.PI - 0.03, y[0]));
        ph += h * (Lz - L3 * Math.cos(y[0])) / (Math.sin(y[0]) * Math.sin(y[0]));
      }

      var p = G.preparar(cv, Math.min(340, Math.max(260, cv.clientWidth * 0.56)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2;
      var tmax = 0;
      pts.forEach(function (q) { tmax = Math.max(tmax, q[0]); });
      var esc = Math.min(p.L, p.A) * 0.42 / Math.max(tmax, 0.2);

      /* círculos de referência a cada 30° de inclinação */
      ct.strokeStyle = '#e4ebef'; ct.lineWidth = 1;
      for (var a = 30; a <= 120; a += 30) {
        var r = esc * a * Math.PI / 180;
        if (r > Math.min(p.L, p.A) * 0.46) break;
        ct.beginPath(); ct.arc(cx, cy, r, 0, 2 * Math.PI); ct.stroke();
        rotulo(ct, a + '°', cx + r * 0.71, cy - r * 0.71, '#aab4bd');
      }
      ct.beginPath(); ct.arc(cx, cy, 3, 0, 2 * Math.PI);
      ct.fillStyle = '#6b7682'; ct.fill();
      rotulo(ct, 'vertical', cx, cy - 14, '#6b7682');

      ct.beginPath();
      pts.forEach(function (q, i) {
        var r = esc * q[0];
        var x = cx + r * Math.cos(q[1]), y = cy - r * Math.sin(q[1]);
        if (i === 0) ct.moveTo(x, y); else ct.lineTo(x, y);
      });
      ct.strokeStyle = G.COR.mestra; ct.lineWidth = 1.6; ct.stroke();

      saida.innerHTML = caso === 1
        ? 'Soltando o pião do repouso, com \\(\\dot\\varphi=0\\) e \\(\\dot\\theta=0\\), o '
          + 'rastro tem <strong>bicos</strong>: em cada ponto mais alto o eixo para por um '
          + 'instante antes de voltar a cair. É o que se vê num pião de verdade solto com '
          + 'cuidado, e o caso corresponde a \\(L_z=L_3\\cos\\theta_0\\).'
        : caso === 0
          ? 'Com \\(L_z\\) maior, a precessão chega a inverter de sentido perto do ponto '
            + 'mais alto, e o rastro faz <strong>laços</strong>. O eixo recua um pouco '
            + 'antes de seguir adiante.'
          : 'Com \\(L_z\\) menor, a precessão nunca muda de sinal e o rastro é apenas '
            + '<strong>ondulado</strong>. Os três casos diferem só pelo valor de '
            + '\\(L_z\\) em relação a \\(L_3\\cos\\theta_0\\).';
      tipografar(saida);
      tipografar(raiz);
    }

    registrarRedesenho(desenhar);
  };


  /* =================================================================
     11. O giroscópio
     A precessão por torque é contraintuitiva até se ver que o torque é
     perpendicular ao momento angular e portanto só o gira. O desenho
     mostra os três vetores e o cone, e os cartões comparam a fórmula
     aproximada com a raiz exata da equação do segundo grau.
     ================================================================= */
  REGISTRO.giroscopio = function (raiz) {
    var corpo = moldura(raiz, 'Por que o giroscópio não cai');
    var cv = el('canvas');
    corpo.appendChild(cv);

    /* unidades SI de um giroscópio de bancada */
    var l1 = 4e-5, l3 = 2e-5, M = 0.05, R = 0.02, w3 = 300, grau = 35, fase = 0;
    var animando = true;

    deslizante(corpo, 'Giro próprio \\(\\omega_3\\) (rad/s):', 20, 600, 5, w3,
      function (v) { w3 = v; desenhar(); }, function (v) { return v.toFixed(0); });
    deslizante(corpo, 'Inclinação \\(\\theta\\):', 5, 85, 1, grau,
      function (v) { grau = v; desenhar(); }, function (v) { return v.toFixed(0) + '°'; });

    var bot = el('div', { class: 'botoes' });
    var bAnim = el('button', { type: 'button', texto: 'Parar' });
    bot.appendChild(bAnim); corpo.appendChild(bot);
    bAnim.addEventListener('click', function () {
      animando = !animando; bAnim.textContent = animando ? 'Parar' : 'Girar';
      if (animando) laco();
    });

    var mostrar = cartoes(corpo, [
      { rot: '\\(L_3\\) (J·s)', k: 'l3' },
      { rot: '\\(\\dot\\varphi\\) aproximada', k: 'ap' },
      { rot: '\\(\\dot\\varphi\\) exata (lenta)', k: 'ex' },
      { rot: 'Erro', k: 'er' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    function desenhar() {
      var th = grau * Math.PI / 180;
      var L3 = l3 * w3, MgR = M * 9.81 * R;
      var ap = MgR / L3;
      /* λ₁φ̇²cos θ − L₃φ̇ + MgR = 0 */
      var A = l1 * Math.cos(th), disc = L3 * L3 - 4 * A * MgR;
      var ex = disc >= 0 ? (L3 - Math.sqrt(disc)) / (2 * A) : NaN;

      var p = G.preparar(cv, Math.min(330, Math.max(250, cv.clientWidth * 0.54)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2 + 40, esc = Math.min(p.L, p.A) * 0.3;
      var P = projetor(0, 0.42, esc, cx, cy);

      /* eixo vertical e cone de precessão */
      var topo = P([0, 0, 1.5]);
      ct.strokeStyle = '#c8d0d7'; ct.lineWidth = 1.2;
      ct.beginPath(); ct.moveTo(P([0, 0, 0]).x, P([0, 0, 0]).y);
      ct.lineTo(topo.x, topo.y); ct.stroke();

      var u = [Math.sin(th) * Math.cos(fase), Math.sin(th) * Math.sin(fase), Math.cos(th)];
      ct.beginPath();
      for (var i = 0; i <= 72; i++) {
        var a = i / 72 * 2 * Math.PI;
        var q = P([Math.sin(th) * Math.cos(a), Math.sin(th) * Math.sin(a), Math.cos(th)]);
        if (i === 0) ct.moveTo(q.x, q.y); else ct.lineTo(q.x, q.y);
      }
      ct.strokeStyle = '#d9c3d4'; ct.setLineDash([4, 4]); ct.stroke(); ct.setLineDash([]);

      /* haste do giroscópio e disco */
      var O = P([0, 0, 0]), E = P(u);
      ct.strokeStyle = '#6b7682'; ct.lineWidth = 4;
      ct.beginPath(); ct.moveTo(O.x, O.y); ct.lineTo(E.x, E.y); ct.stroke();
      ct.save();
      ct.translate(E.x, E.y);
      ct.beginPath(); ct.ellipse(0, 0, 26, 26 * Math.abs(Math.cos(th)) * 0.5 + 5,
                                 -fase, 0, 2 * Math.PI);
      ct.fillStyle = 'rgba(122,58,107,.25)'; ct.strokeStyle = G.COR.mestra;
      ct.lineWidth = 2; ct.fill(); ct.stroke();
      ct.restore();

      /* L ao longo do eixo, torque perpendicular ao plano vertical */
      seta(ct, O.x, O.y, E.x + (E.x - O.x) * 0.35, E.y + (E.y - O.y) * 0.35,
           G.COR.vinho, 2.4);
      rotulo(ct, 'L', E.x + (E.x - O.x) * 0.45, E.y + (E.y - O.y) * 0.45 - 8, G.COR.vinho);
      var tq = [-Math.sin(fase), Math.cos(fase), 0];
      var T0 = P([u[0] * 0.75, u[1] * 0.75, u[2] * 0.75]);
      var T1 = P([u[0] * 0.75 + tq[0] * 0.7, u[1] * 0.75 + tq[1] * 0.7, u[2] * 0.75]);
      seta(ct, T0.x, T0.y, T1.x, T1.y, G.COR.azul, 2.2);
      rotulo(ct, 'Γ', T1.x + 12, T1.y - 6, G.COR.azul);

      mostrar({
        l3: F.fmt(L3, 5), ap: F.fmt(ap, 3) + ' rad/s',
        ex: isNaN(ex) ? 'não há' : F.fmt(ex, 3) + ' rad/s',
        er: isNaN(ex) ? '—' : F.pct(Math.abs(ap - ex) / ex, 2)
      });

      saida.innerHTML = isNaN(ex)
        ? 'Com este giro próprio não existe precessão estacionária: '
          + '\\(L_3^2<4\\lambda_1 MgR\\cos\\theta\\), o discriminante fica negativo e o '
          + 'giroscópio simplesmente tomba. É o que acontece com um pião que já perdeu '
          + 'rotação demais.'
        : 'O torque da gravidade é horizontal e perpendicular ao eixo, de modo que empurra '
          + '\\(\\vet{L}\\) de lado em vez de para baixo. O eixo então passeia pelo cone em '
          + 'vez de cair, com a velocidade do cartão. A fórmula \\(\\dot\\varphi=MgR/L_3\\) '
          + 'erra aqui ' + F.pct(Math.abs(ap - ex) / ex, 2) + ', e o erro cresce quando o '
          + 'giro próprio diminui.';
      tipografar(saida);
      tipografar(raiz);
    }

    function laco() {
      if (!animando) return;
      fase += 0.02;
      desenhar();
      requestAnimationFrame(laco);
    }

    registrarRedesenho(desenhar);
    laco();
  };

  /* =================================================================
     12. A precessão dos equinócios
     A mesma fórmula do giroscópio aplicada à Terra, com o torque do
     Sol e da Lua sobre o abaulamento equatorial. O cálculo fecha com
     os 25 800 anos medidos, e o widget permite desligar a Lua para ver
     que ela responde por mais da metade do efeito.
     ================================================================= */
  REGISTRO.equinocios = function (raiz) {
    var corpo = moldura(raiz, 'De onde vêm os 26 mil anos');
    var cv = el('canvas');
    corpo.appendChild(cv);

    var H = 0.0032737, eps = 23.44, sol = true, lua = true, fase = 0;

    deslizante(corpo, 'Achatamento dinâmico \\(H=(C-A)/C\\):', 0.001, 0.006, 0.0001, H,
      function (v) { H = v; desenhar(); }, function (v) { return v.toFixed(4).replace('.', ','); });
    deslizante(corpo, 'Obliquidade \\(\\varepsilon\\):', 0, 60, 0.5, eps,
      function (v) { eps = v; desenhar(); }, function (v) { return F.fmt(v, 1) + '°'; });
    opcoes(corpo, [{ rot: 'Sol e Lua', v: 3 }, { rot: 'Só o Sol', v: 1 },
                   { rot: 'Só a Lua', v: 2 }], 0,
      function (v) { sol = (v & 1) > 0; lua = (v & 2) > 0; desenhar(); });

    var mostrar = cartoes(corpo, [
      { rot: 'Período da precessão', k: 'per' },
      { rot: 'Deslocamento por século', k: 'sec' },
      { rot: 'Peso da Lua', k: 'lua' }
    ]);
    var saida = el('div', { class: 'saida' });
    corpo.appendChild(saida);

    var ns = 2 * Math.PI / (365.25636 * 86400);
    var nm = 2 * Math.PI / (27.321582 * 86400);
    var w = 7.292115e-5, mu = 0.0121505;

    function periodo(comSol, comLua) {
      var termo = (comSol ? ns * ns : 0) + (comLua ? nm * nm * mu : 0);
      if (termo === 0) return Infinity;
      var O = 1.5 * termo * H * Math.cos(eps * Math.PI / 180) / w;
      return 2 * Math.PI / O / (365.25 * 86400);
    }

    function desenhar() {
      var T = periodo(sol, lua);
      var p = G.preparar(cv, Math.min(300, Math.max(230, cv.clientWidth * 0.46)));
      var ct = p.ct, cx = p.L / 2, cy = p.A / 2 + 30, esc = Math.min(p.L, p.A) * 0.3;
      var e = eps * Math.PI / 180;

      /* normal à órbita e cone descrito pelo eixo da Terra */
      ct.strokeStyle = '#c8d0d7'; ct.lineWidth = 1.2;
      ct.beginPath(); ct.moveTo(cx, cy); ct.lineTo(cx, cy - esc * 1.55); ct.stroke();
      rotulo(ct, 'normal à órbita', cx, cy - esc * 1.55 - 12, '#6b7682');

      ct.beginPath();
      ct.ellipse(cx, cy - esc * 1.25 * Math.cos(e), esc * 1.25 * Math.sin(e),
                 esc * 1.25 * Math.sin(e) * 0.35, 0, 0, 2 * Math.PI);
      ct.strokeStyle = '#d9c3d4'; ct.setLineDash([4, 4]); ct.stroke(); ct.setLineDash([]);

      var px = cx + esc * 1.25 * Math.sin(e) * Math.cos(fase);
      var py = cy - esc * 1.25 * Math.cos(e)
             + esc * 1.25 * Math.sin(e) * 0.35 * Math.sin(fase);
      seta(ct, cx, cy, px, py, G.COR.vinho, 2.6);
      rotulo(ct, 'eixo da Terra', px + 18, py - 10, G.COR.vinho);

      /* a Terra, achatada */
      ct.save();
      ct.translate(cx, cy);
      ct.rotate(Math.atan2(px - cx, -(py - cy)));
      ct.beginPath(); ct.ellipse(0, 0, esc * 0.3, esc * 0.26, 0, 0, 2 * Math.PI);
      ct.fillStyle = 'rgba(44,95,141,.25)'; ct.strokeStyle = G.COR.azul;
      ct.lineWidth = 1.6; ct.fill(); ct.stroke();
      ct.restore();

      var Tsol = periodo(true, false), Tlua = periodo(false, true);
      mostrar({
        per: isFinite(T) ? F.fmt(T / 1000, 2) + ' mil anos' : 'não precessa',
        sec: isFinite(T) ? F.fmt(360 * 3600 / T * 100, 0) + '″' : '—',
        lua: F.pct((1 / Tlua) / (1 / Tlua + 1 / Tsol), 1)
      });

      saida.innerHTML = (sol && lua)
        ? 'Com os valores reais da Terra o cálculo dá ' + F.fmt(T / 1000, 1)
          + ' mil anos, contra os 25,77 mil anos medidos: o acordo é de alguns por cento, '
          + 'e a diferença vem de termos que esta conta despreza, como a inclinação da '
          + 'órbita lunar. A Lua responde por ' + F.pct((1 / Tlua) / (1 / Tlua + 1 / Tsol), 0)
          + ' do efeito, porque o torque de maré cai com o cubo da distância.'
        : 'Desligar um dos dois mostra o peso de cada um. Sozinho, o Sol levaria '
          + F.fmt(Tsol / 1000, 0) + ' mil anos, e a Lua sozinha, '
          + F.fmt(Tlua / 1000, 0) + ' mil anos. É a soma dos dois torques que dá o valor '
          + 'observado.';
      tipografar(saida);
      tipografar(raiz);
    }

    function laco() { fase += 0.012; desenhar(); requestAnimationFrame(laco); }
    registrarRedesenho(desenhar);
    laco();
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
