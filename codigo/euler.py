# -*- coding: utf-8 -*-
"""Equações de Euler: rotação livre, polhódia e o eixo intermediário.

O QUE RESOLVE
    1. Integra as três equações de Euler sem torque e mede quanto as duas
       constantes do movimento se deslocam, comparando RK4 com o método de
       Euler explícito e medindo a ordem de convergência de cada um.
    2. Verifica que a polhódia fecha, medindo o período de retorno.
    3. Trata o pião simétrico livre e compara a taxa de precessão medida
       com (lambda3 - lambda1) omega3 / lambda1.
    4. Mede a taxa de crescimento da perturbação em torno de cada um dos
       três eixos principais e compara com a previsão da linearização.
    5. Mede o tempo entre viradas no eixo intermediário e verifica que ele
       cresce com o logaritmo do inverso da perturbação.
    6. Integra junto a matriz de rotação e verifica, no referencial do
       laboratório, que o vetor momento angular fica parado.

A FÍSICA
    No referencial do corpo, com os eixos principais, as equações de Euler
    sao tres equacoes acopladas e NAO lineares. O termo nao linear e o
    produto de duas componentes de omega, e ele desaparece quando os tres
    momentos principais sao iguais. Toda a riqueza do corpo rigido livre
    mora, portanto, na diferenca entre os momentos.

    Sem torque, a energia cinetica e o modulo do momento angular se
    conservam, e cada uma e um elipsoide no espaco das componentes de
    omega. O movimento acontece na intersecao dos dois, que e a polhodia.
    Dessa figura ja se le a estabilidade: lacos fechados em torno dos eixos
    de maior e de menor momento, curvas que dao a volta pelo corpo inteiro
    em torno do intermediario.

COMO CONFERIR SE ESTA CERTO
    1. As duas constantes tem de ficar paradas em erro de integrador, e o
       erro do RK4 tem de cair por 16 quando o passo cai por 2.
    2. A taxa de precessao do piao simetrico tem de bater com a formula.
    3. A taxa de crescimento perto do eixo intermediario tem de bater com
       omega0 vezes a raiz de (l3-l1)(l1-l2)/(l2 l3).
    4. O tempo entre viradas tem de crescer como o logaritmo de 1/epsilon,
       com coeficiente angular 2/sigma.
    5. No laboratorio, as tres componentes de L tem de ficar constantes, e
       a matriz de rotacao tem de continuar ortogonal.

Prof. Apiano Morais - LFCA/URCA - Mecanica Classica III
"""

import numpy as np

# Momentos principais de um corpo qualquer sem simetria, em kg m^2.
# Qualquer trio com os tres valores diferentes serve; estes sao redondos.
L1, L2, L3 = 1.0, 2.0, 3.0


# ---------------------------------------------------------------------------
# 1. integradores
# ---------------------------------------------------------------------------


def deriv(w, lam=(L1, L2, L3), gama=(0.0, 0.0, 0.0)):
    """O lado direito das equações de Euler, resolvido para omega ponto."""
    l1, l2, l3 = lam
    w1, w2, w3 = w
    return np.array([(gama[0] + (l2 - l3) * w2 * w3) / l1,
                     (gama[1] + (l3 - l1) * w3 * w1) / l2,
                     (gama[2] + (l1 - l2) * w1 * w2) / l3])


def passo_rk4(w, dt, lam=(L1, L2, L3)):
    k1 = deriv(w, lam)
    k2 = deriv(w + dt * k1 / 2, lam)
    k3 = deriv(w + dt * k2 / 2, lam)
    k4 = deriv(w + dt * k3, lam)
    return w + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)


def passo_euler(w, dt, lam=(L1, L2, L3)):
    """Euler explícito, aqui só para ter com o que comparar."""
    return w + dt * deriv(w, lam)


def constantes(w, lam=(L1, L2, L3)):
    """Devolve (2T, L^2), que são os dois elipsoides da polhódia."""
    l = np.asarray(lam)
    return float(np.sum(l * w ** 2)), float(np.sum((l * w) ** 2))


def integra(w0, t_fim, dt, lam=(L1, L2, L3), metodo=passo_rk4, guarda=1):
    """Integra e devolve (tempos, omegas) amostrados a cada `guarda` passos."""
    n = int(round(t_fim / dt))
    w = np.array(w0, dtype=float)
    ts, ws = [0.0], [w.copy()]
    for i in range(n):
        w = metodo(w, dt, lam)
        if (i + 1) % guarda == 0:
            ts.append((i + 1) * dt)
            ws.append(w.copy())
    return np.array(ts), np.array(ws)


def desvio(ws, lam=(L1, L2, L3)):
    """Maior desvio relativo das duas constantes ao longo da trajetória."""
    l = np.asarray(lam)
    dois_t = np.sum(l * ws ** 2, axis=1)
    ele2 = np.sum((l * ws) ** 2, axis=1)
    return (np.max(np.abs(dois_t - dois_t[0])) / dois_t[0],
            np.max(np.abs(ele2 - ele2[0])) / ele2[0])


# ---------------------------------------------------------------------------
# 2. a matriz de rotação, para olhar do laboratório
# ---------------------------------------------------------------------------


def passo_corpo_e_matriz(w, R, dt, lam=(L1, L2, L3)):
    """Avança omega e a matriz que leva do corpo ao laboratório.

    A matriz obedece a R ponto = R W, com W a matriz antissimétrica de
    omega. Integrada assim, ela sai de ortogonal com o tempo, e por isso o
    programa mede esse desvio em vez de fingir que ele não existe.
    """
    def chapeu(v):
        return np.array([[0.0, -v[2], v[1]],
                         [v[2], 0.0, -v[0]],
                         [-v[1], v[0], 0.0]])

    def f(w, R):
        return deriv(w, lam), R @ chapeu(w)

    k1 = f(w, R)
    k2 = f(w + dt * k1[0] / 2, R + dt * k1[1] / 2)
    k3 = f(w + dt * k2[0] / 2, R + dt * k2[1] / 2)
    k4 = f(w + dt * k3[0], R + dt * k3[1])
    w = w + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])
    R = R + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
    return w, R


# ---------------------------------------------------------------------------
# 3. medidas
# ---------------------------------------------------------------------------


def taxa_crescimento(lam, eixo):
    """Previsão da linearização em torno do eixo dado (0, 1 ou 2).

    Com omega = (w0, e2, e3) em torno do eixo 1, a linearização dá
    e2 ponto ponto = (l3-l1)(l1-l2) w0^2 / (l2 l3) vezes e2. O sinal do
    produto decide tudo: negativo é oscilação, positivo é crescimento.
    """
    i = eixo
    j, k = (i + 1) % 3, (i + 2) % 3
    li, lj, lk = lam[i], lam[j], lam[k]
    s2 = (lk - li) * (li - lj) / (lj * lk)
    return s2


def mede_crescimento(lam, eixo, w0=1.0, eps=1e-6, t_fim=40.0, dt=1e-3):
    """Ajusta uma exponencial ao módulo da perturbação, enquanto ela é pequena.

    O ajuste tem de ficar no primeiro trecho de crescimento, e só nele. Depois
    que a perturbação satura, o corpo vira e o módulo volta a passar por
    valores pequenos; incluir esses instantes no ajuste estraga a medida, e
    foi o primeiro erro que este programa cometeu.
    """
    w = np.zeros(3)
    w[eixo] = w0
    w[(eixo + 1) % 3] = eps
    ts, ws = integra(w, t_fim, dt, lam, guarda=10)
    perp = np.hypot(ws[:, (eixo + 1) % 3], ws[:, (eixo + 2) % 3])
    acima = np.nonzero(perp > 0.05 * w0)[0]
    if acima.size == 0:
        return np.nan                      # nao saturou: nao cresce
    fim = acima[0]
    sel = np.zeros(perp.size, dtype=bool)
    sel[:fim] = perp[:fim] > 10 * eps      # fora do transiente inicial
    if sel.sum() < 20:
        return np.nan
    coef = np.polyfit(ts[sel], np.log(perp[sel]), 1)
    return coef[0]


def tempo_de_virada(lam, eps, w0=1.0, quantas=2, t_max=600.0, dt=5e-4,
                    tipo=float):
    """Tempo médio entre inversões do sinal da componente do eixo intermediário.

    Para a assim que juntou `quantas` inversões, em vez de integrar sempre
    até o fim: o tempo de virada cresce com log(1/eps) e um limite fixo
    seria desperdício nas perturbações grandes e insuficiente nas pequenas.

    O argumento `tipo` existe para o programa poder repetir a medida em
    precisão estendida e mostrar que o limite encontrado é do ponto
    flutuante, e não da física.
    """
    w = np.array([eps, w0, 0.0], dtype=tipo)   # eixo 2 é o intermediário aqui
    tempos = []
    ant = np.sign(w[1])
    for i in range(int(round(t_max / dt))):
        w = passo_rk4(w, dt, lam)
        s = np.sign(w[1])
        if s != 0:
            if s != ant:
                tempos.append((i + 1) * dt)
                if len(tempos) > quantas:
                    break
            ant = s
    if len(tempos) < 3:
        return np.nan
    # Medir mais inversoes desloca o resultado em alguns milesimos de
    # segundo, porque o erro do integrador vai empurrando a trajetoria. O
    # deslocamento e o mesmo em todas as linhas da tabela e nao atrapalha a
    # comparacao, desde que `quantas` seja o mesmo em todas elas.
    return float(np.mean(np.diff(tempos)))


# ---------------------------------------------------------------------------


def main():
    print('=' * 72)
    print('1. AS DUAS CONSTANTES, E O QUE O INTEGRADOR FAZ COM ELAS')
    print('=' * 72)
    lam = (L1, L2, L3)
    w0 = np.array([0.6, 1.0, 0.4])
    dt_t, el_t = constantes(w0, lam)
    print('   momentos principais: %.1f, %.1f, %.1f kg m^2' % lam)
    print('   omega inicial: (%.1f, %.1f, %.1f) rad/s' % tuple(w0))
    print('   2T = %.6f J      L^2 = %.6f (kg m^2/s)^2' % (dt_t, el_t))
    print()
    print('   Integrando por 50 s, desvio relativo MAXIMO das constantes:')
    print()
    print('      metodo      dt        desvio de 2T     desvio de L^2   razao')
    for metodo, nome in ((passo_rk4, 'RK4  '), (passo_euler, 'Euler')):
        ant = None
        for dt in (0.02, 0.01, 0.005):
            _, ws = integra(w0, 50.0, dt, lam, metodo=metodo, guarda=5)
            d2t, dl2 = desvio(ws, lam)
            raz = '%7.2f' % (ant / d2t) if ant else '      -'
            print('      %s  %6.4f    %12.3e    %12.3e %s'
                  % (nome, dt, d2t, dl2, raz))
            ant = d2t
    print()
    print('   O RK4 melhora por 16 quando o passo cai por 2, que e a quarta')
    print('   ordem; o Euler explicito melhora por 2, e com dt = 0,02 erra')
    print('   a energia em 19 por cento. Nenhum dos dois conserva as')
    print('   constantes por construcao: elas sao conservadas pela EQUACAO,')
    print('   e cabe ao integrador nao estraga-las. Medir esse desvio e a')
    print('   primeira coisa a fazer em qualquer integracao de corpo rigido.')
    print()

    print('=' * 72)
    print('2. A POLHODIA FECHA')
    print('=' * 72)
    dt = 1e-4
    ts, ws = integra(w0, 20.0, dt, lam, guarda=1)
    d = np.linalg.norm(ws - ws[0], axis=1)
    inicio = int(1.0 / dt)          # descarta a vizinhanca imediata do inicio
    i = inicio + int(np.argmin(d[inicio:]))
    print('   partindo de omega = (%.1f, %.1f, %.1f):' % tuple(w0))
    print()
    print('   A MEDIDA INGENUA, e por que ela nao serve')
    print()
    print('   Procurando entre os pontos integrados o mais proximo do')
    print('   inicial, acha-se t = %.5f s, a %.3e rad/s dele.'
          % (ts[i], d[i]))
    print('   Esse numero nao mede o fechamento da curva. Ele mede o')
    print('   espacamento da malha: em um passo de %.0e s o vetor omega anda'
          % dt)
    print('   %.3e rad/s, e e dessa ordem a distancia ao ponto amostrado'
          % (np.linalg.norm(deriv(w0, lam)) * dt))
    print('   mais proximo, por bem que a curva feche. Refinar dt tambem nao')
    print('   resolve sozinho: se o periodo cair quase sobre um ponto da')
    print('   malha, como acontece aqui, o numero fica igual em varios dt e')
    print('   da a impressao de ter convergido.')
    print()
    print('   A MEDIDA HONESTA: uma secao de Poincare')
    print()
    print('   Em vez do ponto mais proximo, usa-se o plano que passa por')
    print('   omega(0) perpendicular a omega ponto(0). A trajetoria o')
    print('   atravessa em um instante que a interpolacao da sem depender da')
    print('   malha, e o que resta medir e so o afastamento DENTRO do plano.')
    print()
    nhat = deriv(w0, lam)
    nhat = nhat / np.linalg.norm(nhat)
    print('      dt          periodo            afastamento no plano')
    for passo in (2e-4, 1e-4, 5e-5, 2e-5):
        tt, wv = integra(w0, 20.0, passo, lam, guarda=1)
        f = (wv - w0) @ nhat
        k = None
        for j in range(int(1.0 / passo), len(f) - 1):
            if (f[j] <= 0 < f[j + 1] or f[j] >= 0 > f[j + 1]) \
                    and np.linalg.norm(wv[j] - w0) < 1e-2:
                k = j
                break
        a = f[k] / (f[k] - f[k + 1])            # onde f cruza o zero
        wc = wv[k] + a * (wv[k + 1] - wv[k])
        perp = wc - w0 - ((wc - w0) @ nhat) * nhat
        print('      %6.0e    %.8f s      %.3e rad/s'
              % (passo, tt[k] + a * passo, np.linalg.norm(perp)))
    print()
    print('   O periodo sai igual em oito algarismos nos quatro passos, e o')
    print('   afastamento no plano CAI quando a malha e refinada. E essa')
    print('   queda, e nao o valor em si, que mostra que a curva fecha: o')
    print('   que sobra e erro de interpolacao e de integrador, nao um vao')
    print('   de verdade entre o comeco e o fim da volta.')
    print()
    print('   Fechar nao era obvio. Exige que a intersecao dos dois')
    print('   elipsoides seja uma curva fechada, e e o que a figura da')
    print('   polhodia mostra. O periodo acima e o da polhodia, isto e, do')
    print('   movimento visto DO CORPO. Visto do laboratorio o corpo em')
    print('   geral nao volta a mesma orientacao, porque a precessao em')
    print('   torno de L tem outro periodo, incomensuravel com este.')
    print()

    print('=' * 72)
    print('3. O PIAO SIMETRICO LIVRE')
    print('=' * 72)
    lam_s = (1.0, 1.0, 2.5)
    w3 = 2.0
    ws0 = np.array([0.3, 0.0, w3])
    prev = (lam_s[2] - lam_s[0]) * w3 / lam_s[0]
    ts, wss = integra(ws0, 40.0, 1e-4, lam_s, guarda=10)
    # omega3 tem de ficar parado
    var3 = np.max(np.abs(wss[:, 2] - w3)) / w3
    # a fase da componente transversal avanca linearmente
    fase = np.unwrap(np.arctan2(wss[:, 1], wss[:, 0]))
    medida = np.polyfit(ts, fase, 1)[0]
    transv = np.hypot(wss[:, 0], wss[:, 1])
    vart = np.max(np.abs(transv - transv[0])) / transv[0]
    print('   lambda1 = lambda2 = %.1f, lambda3 = %.1f, omega3 = %.1f rad/s'
          % (lam_s[0], lam_s[2], w3))
    print()
    print('   omega3 varia em %.2e do valor inicial (tem de ser nulo:' % var3)
    print('   com lambda1 = lambda2 o terceiro parenteses se anula)')
    print('   o modulo da parte transversal varia em %.2e' % vart)
    print()
    print('   taxa de precessao medida:  %.9f rad/s' % medida)
    print('   previsao (l3-l1) w3 / l1:  %.9f rad/s' % prev)
    print('   desvio relativo:           %.2e' % abs(medida / prev - 1))
    print()
    print('   A componente transversal de omega gira em torno do eixo de')
    print('   simetria com essa taxa, sem mudar de modulo, como a penultima')
    print('   linha mede. Visto do corpo, o vetor omega varre um cone; visto')
    print('   do laboratorio, varre outro, e o corpo rola um sobre o outro')
    print('   sem deslizar, que e a construcao de Poinsot.')
    print()
    print('   Repare no sinal: com lambda3 > lambda1 a precessao e no')
    print('   mesmo sentido da rotacao. Para um corpo achatado como a Terra')
    print('   isso da a oscilacao de Chandler, com periodo de 305 dias pela')
    print('   formula rigida contra 433 observados. A diferenca nao e erro')
    print('   de conta: a Terra nao e rigida.')
    print()

    print('=' * 72)
    print('4. O TEOREMA DO EIXO INTERMEDIARIO, MEDIDO')
    print('=' * 72)
    print('   Perturbacao de 1e-6 rad/s em torno de cada eixo principal,')
    print('   com omega0 = 1 rad/s no proprio eixo:')
    print()
    print('      eixo   lambda   s^2 previsto    comportamento   taxa medida'
          '   prevista')
    nomes = ('menor (l=1)', 'intermed (l=2)', 'maior (l=3)')
    for eixo in (0, 1, 2):
        s2 = taxa_crescimento(lam, eixo)
        medida = mede_crescimento(lam, eixo)
        if s2 > 0:
            print('      %-15s %+10.4f    instavel       %10.6f  %10.6f'
                  % (nomes[eixo], s2, medida, np.sqrt(s2)))
        else:
            print('      %-15s %+10.4f    estavel        %10s  %10s'
                  % (nomes[eixo], s2, 'nao cresce', '-'))
    print()
    print('   Em torno do menor e do maior momento, s^2 e negativo e a')
    print('   perturbacao apenas oscila. Em torno do intermediario ele e')
    print('   positivo e a perturbacao cresce exponencialmente, com a taxa')
    print('   prevista. E o teorema do eixo intermediario, tambem chamado')
    print('   de efeito Dzhanibekov, por causa do video do cosmonauta e da')
    print('   porca de orelhas na estacao Salyut 7, em 1985.')
    print()

    print('=' * 72)
    print('5. QUANTO TEMPO ATE A PROXIMA VIRADA')
    print('=' * 72)
    s2 = taxa_crescimento(lam, 1)
    sigma = np.sqrt(s2)
    print('   taxa de crescimento sigma = %.6f 1/s' % sigma)
    print()
    epss = (1e-3, 1e-4, 1e-5, 1e-6)
    tvs = [tempo_de_virada(lam, e) for e in epss]
    print('   epsilon      tempo entre viradas   acrescimo sobre a linha acima')
    for i, (e, tv) in enumerate(zip(epss, tvs)):
        inc = '%18.4f s' % (tv - tvs[i - 1]) if i else '%18s' % '-'
        print('   %8.0e   %14.4f s  %s' % (e, tv, inc))
    print()
    x = np.log(1 / np.array(epss))
    a, b = np.polyfit(x, np.array(tvs), 1)
    print('   ajuste de t_virada contra ln(1/epsilon):')
    print('      coeficiente angular medido: %.6f s' % a)
    print('      previsto, 2/sigma:          %.6f s' % (2 / sigma))
    print('      razao:                      %.6f' % (a / (2 / sigma)))
    print('      termo constante:            %+.4f s' % b)
    print('      residuo maximo do ajuste:   %.2e s'
          % np.max(np.abs(np.array(tvs) - (a * x + b))))
    print()
    print('   O tempo entre viradas cresce com o LOGARITMO do inverso da')
    print('   perturbacao, e o coeficiente angular e 2/sigma. Dividir a')
    print('   perturbacao por dez adia a virada sempre pelo mesmo tanto, e')
    print('   nunca a impede: nao existe perturbacao pequena o bastante')
    print('   para o eixo intermediario ficar parado.')
    print()
    print('   De onde vem o fator 2: a perturbacao leva (1/sigma) ln(1/eps)')
    print('   para crescer de eps ate a ordem de omega0, e o mesmo tanto')
    print('   para decair do outro lado. A ida e a volta pela vizinhanca da')
    print('   separatriz dobram o tempo, e e por isso que o coeficiente nao')
    print('   e 1/sigma.')
    print()
    print('   ONDE A CONTA TRAVA')
    print()
    print('   A tabela acima para em 1e-6, e nao por economia. Tentando')
    print('   continuar, a lei desmorona:')
    print()
    print('      epsilon    float64 (16 digitos)   float128 (19 digitos)')
    for e in (1e-6, 1e-7, 1e-8, 1e-9):
        d = tvs[-1] if e == epss[-1] else tempo_de_virada(lam, e)
        q = tempo_de_virada(lam, e, tipo=np.longdouble)
        print('      %8.0e  %16.4f s   %16.4f s' % (e, d, q))
    print()
    print('      previsto por 2/sigma: %.4f s por decada'
          % (np.log(10) * 2 / sigma))
    print('      eps de maquina: float64 %.2e, float128 %.2e'
          % (np.finfo(np.float64).eps, np.finfo(np.longdouble).eps))
    print()
    print('   Em precisao dupla o acrescimo de 7,98 s por decada sobrevive')
    print('   ate 1e-7 e em 1e-8 anda para TRAS. Em precisao estendida ele')
    print('   sobrevive uma decada mais, e quebra em 1e-9. O limite,')
    print('   portanto, nao e da fisica: e do ponto flutuante.')
    print()
    print('   A razao e geometrica. O que controla o tempo de virada nao e')
    print('   a perturbacao em si, e a distancia da trajetoria a separatriz,')
    print('   medida nas duas constantes. Perto do eixo instavel essa')
    print('   distancia e QUADRATICA na perturbacao: vai como eps^2. Quando')
    print('   eps^2 desce abaixo do ultimo digito de 2T, o computador nao')
    print('   distingue mais a trajetoria da separatriz, e o que ele integra')
    print('   e o ruido do arredondamento.')
    print()
    print('   Isso prediz que o eps limite cai com a RAIZ do eps de maquina.')
    print('   Trocar float64 por float128 deveria entao empurrar o limite por')
    print('   um fator de %.0f, isto e, %.1f decadas:'
          % (np.sqrt(np.finfo(np.float64).eps / np.finfo(np.longdouble).eps),
             0.5 * np.log10(np.finfo(np.float64).eps
                            / np.finfo(np.longdouble).eps)))
    print('   as linhas da tabela andam de uma decada por vez e nao resolvem')
    print('   a meia decada, mas o ganho de uma decada inteira esta la.')
    print()

    print('=' * 72)
    print('6. OLHANDO DO LABORATORIO')
    print('=' * 72)
    w = np.array([0.6, 1.0, 0.4])
    R = np.eye(3)
    dt = 1e-4
    lmax, omax = 0.0, 0.0
    L_lab0 = R @ (np.array(lam) * w)
    for i in range(int(20.0 / dt)):
        w, R = passo_corpo_e_matriz(w, R, dt, lam)
        L_lab = R @ (np.array(lam) * w)
        lmax = max(lmax, np.linalg.norm(L_lab - L_lab0))
        omax = max(omax, np.linalg.norm(R.T @ R - np.eye(3)))
    print('   Integrando junto a matriz que leva do corpo ao laboratorio,')
    print('   por 20 s com dt = 1e-4:')
    print()
    print('   L no laboratorio, inicial: (%+.6f, %+.6f, %+.6f)' % tuple(L_lab0))
    print('   maior desvio de L ao longo do voo: %.3e' % lmax)
    print('   em unidades de |L|:                %.3e'
          % (lmax / np.linalg.norm(L_lab0)))
    print('   maior desvio de ortogonalidade de R: %.3e' % omax)
    print()
    print('   Visto do laboratorio o momento angular fica PARADO, e e so')
    print('   isso que a ausencia de torque diz. Toda a complicacao das')
    print('   equacoes de Euler vem de descrever esse vetor parado a partir')
    print('   de um referencial que gira junto com o corpo.')
    print()
    print('   A matriz perde ortogonalidade devagar, porque R ponto = R W')
    print('   nao preserva o grupo das rotacoes quando integrada por RK4.')
    print('   Em voos longos e preciso reortonormalizar, ou trocar a matriz')
    print('   por um quaternio normalizado a cada passo. O desvio acima')
    print('   mede exatamente quanto disso ja aconteceu.')
    print()


if __name__ == '__main__':
    main()
