#!/usr/bin/env python3
"""Reescreve o menu de navegacao e a navegacao de rodape em todas as paginas.

Uso:  python3 ferramentas/atualiza-menu.py
Roda a partir da raiz do site. A unica fonte de verdade e a lista UNIDADES
abaixo: mudando a ordem ali, o menu do topo e as setas anterior/proximo de
todas as paginas se reorganizam sozinhos. Modulos ainda nao escritos sao
simplesmente ignorados, de modo que o site nunca aponta para pagina vazia.
"""
import glob
import os
import re

# (numero, titulo curto para o menu, titulo para a seta do rodape)
TITULOS = {
    1: ("Álgebra tensorial e notação indicial", "Álgebra tensorial"),
    2: ("O tensor de inércia", "Tensor de inércia"),
    3: ("Eixos principais e a equação secular", "Eixos principais"),
    4: ("Equações de Euler e a rotação livre", "Equações de Euler"),
    5: ("Ângulos de Euler e o pião simétrico", "Ângulos de Euler"),
    6: ("Giroscópios, moedas e a precessão dos equinócios", "Giroscópios"),
    7: ("Campo gravitacional, potencial e a lei de Gauss", "Campo gravitacional"),
    8: ("Autogravidade: Lane-Emden e estruturas estelares", "Autogravidade"),
    9: ("Equilíbrio e pequenas oscilações", "Pequenas oscilações"),
    10: ("Modos normais e coordenadas normais", "Modos normais"),
    11: ("A cadeia de N osciladores e o limite contínuo", "Cadeia de osciladores"),
    12: ("Densidade, fluxo e a equação da continuidade", "Meios contínuos"),
    13: ("A corda vibrante e a equação de onda", "Corda vibrante"),
    14: ("Modos, séries de Fourier e a membrana", "Fourier e membrana"),
    15: ("Ondas sonoras e ondas em barras", "Ondas sonoras"),
    16: ("Sistemas integráveis, toros e seções de Poincaré", "Sistemas integráveis"),
    17: ("O rotor pulsado e o caos determinístico", "Rotor pulsado"),
}

UNIDADES = [
    ("Álgebra tensorial e corpo rígido", "Corpo rígido", [1, 2, 3, 4, 5, 6]),
    ("Gravitação", "Gravitação", [7, 8]),
    ("Pequenas vibrações", "Vibrações", [9, 10, 11]),
    ("Meios contínuos e ondas", "Ondas", [12, 13, 14, 15]),
    ("Caos determinístico", "Caos", [16, 17]),
]

# o que vai no chapéu de cada página, logo acima do título
CHAPEU = {n: nome for nome, _curto, ns in UNIDADES for n in ns}

# ordem linear em que as setas anterior/proximo caminham
ORDEM = [n for _, _, ns in UNIDADES for n in ns]


def existentes():
    return {n for n in TITULOS if os.path.exists("aula%02d.html" % n)}


def monta_menu(pagina_atual):
    def link(href, texto, titulo=None, classe=""):
        at = ' class="%s"' % (classe + (" ativo" if href == pagina_atual else "")).strip() \
            if (classe or href == pagina_atual) else ""
        tt = ' title="%s"' % titulo if titulo else ""
        return '<a href="%s"%s%s>%s</a>' % (href, at, tt, texto)

    tem = existentes()
    partes = [link("index.html", "Início")]

    for _, curto, numeros in UNIDADES:
        presentes = [n for n in numeros if n in tem]
        if not presentes:
            continue
        partes.append('<span class="grupo">%s</span>' % curto)
        for n in presentes:
            partes.append(link("aula%02d.html" % n, str(n),
                               "Aula %d: %s" % (n, TITULOS[n][0]), "num"))

    if os.path.exists("formulario.html"):
        partes.append(link("formulario.html", "Formulário"))
    return "\n      " + "\n      ".join(partes) + "\n    "


def monta_rodape(n):
    """Setas anterior/proximo para o modulo n, segundo ORDEM."""
    tem = existentes()
    seq = [m for m in ORDEM if m in tem]
    if n not in seq:
        return None
    i = seq.index(n)
    partes = []

    if i > 0:
        a = seq[i - 1]
        partes.append('<a href="aula%02d.html"><small>Aula anterior</small>'
                      '← %d. %s</a>' % (a, a, TITULOS[a][1]))
    else:
        partes.append('<a href="index.html"><small>Voltar</small>← Início</a>')

    if i < len(seq) - 1:
        b = seq[i + 1]
        partes.append('<a class="prox" href="aula%02d.html"><small>Próximo módulo</small>'
                      '%d. %s →</a>' % (b, b, TITULOS[b][1]))
    else:
        prox = min((m for m in ORDEM if m not in tem), default=None)
        if prox:
            partes.append('<span class="em-breve"><small>Em preparação</small>'
                          '%d. %s</span>' % (prox, TITULOS[prox][1]))
        else:
            partes.append('<a class="prox" href="index.html">'
                          '<small>Voltar</small>Página inicial →</a>')

    return "\n    " + "\n    ".join(partes) + "\n  "


def main():
    paginas = sorted(glob.glob("*.html"))
    pad_menu = re.compile(r'<nav class="menu">.*?</nav>', re.S)
    pad_rod = re.compile(r'<nav class="nav-aulas">.*?</nav>', re.S)

    for p in paginas:
        texto = open(p, encoding="utf-8").read()
        original = texto

        if pad_menu.search(texto):
            novo = '<nav class="menu">%s</nav>' % monta_menu(p)
            texto = pad_menu.sub(lambda _: novo, texto, count=1)
        else:
            print('AVISO: nenhum <nav class="menu"> em', p)

        m = re.match(r'aula(\d{2})\.html$', p)
        if m:
            n = int(m.group(1))
            if n in CHAPEU:
                texto = re.sub(
                    r'(<p class="chapeu">)Aula \d+[^<]*(</p>)',
                    lambda _: '<p class="chapeu">Aula %d · %s</p>' % (n, CHAPEU[n]),
                    texto, count=1)
            rod = monta_rodape(n)
            if rod and pad_rod.search(texto):
                novo = '<nav class="nav-aulas">%s</nav>' % rod
                texto = pad_rod.sub(lambda _: novo, texto, count=1)
            elif rod:
                print('AVISO: nenhum <nav class="nav-aulas"> em', p)

        if texto != original:
            open(p, "w", encoding="utf-8").write(texto)
            print("atualizado:", p)


if __name__ == "__main__":
    main()
