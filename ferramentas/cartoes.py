#!/usr/bin/env python3
"""Reescreve os cartões das aulas no index.html.

A fonte de verdade das unidades e dos títulos é atualiza-menu.py; aqui ficam
só a descrição e as etiquetas de cada aula. Uma aula ainda não escrita vira
cartão apagado, sem link, de modo que o índice nunca aponta para página vazia.

Uso:  python3 ferramentas/cartoes.py
"""
import importlib.util
import io
import os
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('menu', RAIZ / 'ferramentas' / 'atualiza-menu.py')
MENU = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(MENU)

# numero: (descrição, [etiquetas])
CARTOES = {
    1: ("Notação indicial, delta de Kronecker e símbolo de Levi-Civita, a regra de "
        "transformação que define um tensor, simetria e antissimetria, traço e "
        "diagonalização, e o produto diádico que monta tensores a partir de vetores.",
        ["Notação indicial", "Levi-Civita", "Transformação"]),
    2: ("Por que \\(\\vet{L}\\) deixa de ser paralelo a \\(\\vet{\\omega}\\), os produtos de "
        "inércia, o tensor para distribuições discretas e contínuas, a energia cinética de "
        "rotação como forma quadrática e o teorema de Steiner tensorial.",
        ["L não é paralelo a ω", "Cubo e cone", "Steiner tensorial"]),
    3: ("A equação secular e os autovalores do tensor, os eixos principais como autovetores, "
        "a diagonalização passo a passo no cubo, o elipsoide de inércia e o que a simetria "
        "do corpo adianta sem conta nenhuma.",
        ["Equação secular", "Autovetores", "Elipsoide de inércia"]),
    4: ("As equações de Euler no referencial do corpo, a rotação livre do pião simétrico, a "
        "precessão livre e o bamboleio de Chandler, e a instabilidade do eixo intermediário "
        "que faz a porca de Dzhanibekov virar sozinha.",
        ["Equações de Euler", "Precessão livre", "Eixo intermediário"]),
    5: ("Os três ângulos e a ordem em que se aplicam, a velocidade angular em termos de "
        "\\(\\dot\\phi\\), \\(\\dot\\theta\\) e \\(\\dot\\psi\\), a lagrangiana do pião "
        "pesado, os momentos conservados e a equação do ângulo de nutação.",
        ["Ângulos de Euler", "Pião pesado", "Nutação"]),
    6: ("O giroscópio e a precessão rápida, a moeda que roda e tomba, o rolamento sem "
        "deslizamento como vínculo, e a precessão dos equinócios calculada do achatamento "
        "da Terra.",
        ["Giroscópio", "Moeda rolante", "Equinócios"]),
    7: ("O campo como objeto físico, o potencial gravitacional e a sua equação, o fluxo e a "
        "lei de Gauss, a equação de Poisson, e os potenciais de casca, esfera e disco "
        "resolvidos pelos dois caminhos.",
        ["Lei de Gauss", "Poisson", "Casca esférica"]),
    8: ("Equilíbrio hidrostático de um corpo que se segura pela própria gravidade, a relação "
        "politrópica, a equação de Lane-Emden e as suas soluções exatas, e o que isso diz "
        "sobre estrelas e sobre nuvens que colapsam.",
        ["Equilíbrio hidrostático", "Lane-Emden", "Politropos"]),
    9: ("Equilíbrio estável, instável e indiferente pela segunda derivada do potencial, a "
        "expansão quadrática em torno do mínimo, as matrizes de massa e de rigidez, e o "
        "problema de autovalor generalizado que resolve tudo de uma vez.",
        ["Expansão do potencial", "Matriz de rigidez", "Autovalor generalizado"]),
    10: ("Dois pêndulos acoplados resolvidos à mão e pela matriz, as frequências próprias, as "
         "coordenadas normais que desacoplam o sistema, o batimento como soma de dois modos e "
         "a ortogonalidade dos modos.",
         ["Pêndulos acoplados", "Coordenadas normais", "Batimento"]),
    11: ("N massas e N+1 molas, a solução por ondas progressivas, a relação de dispersão e a "
         "sua saturação, a primeira zona de Brillouin, e a passagem ao contínuo que faz a "
         "equação de onda nascer da cadeia.",
         ["Relação de dispersão", "Zona de Brillouin", "Limite contínuo"]),
    12: ("Quando um sistema de partículas pode ser tratado como contínuo, densidade local, "
         "densidade de corrente e fluxo, a equação da continuidade em forma integral e "
         "diferencial, e a derivada convectiva.",
         ["Densidade", "Fluxo", "Derivada convectiva"]),
    13: ("A força sobre um elemento de corda, a equação de onda deduzida da segunda lei, a "
         "velocidade de propagação, a solução de d'Alembert e o que acontece quando um pulso "
         "encontra a extremidade.",
         ["Elemento de corda", "d'Alembert", "Reflexão"]),
    14: ("Separação de variáveis e os modos de uma corda presa, a série de Fourier que monta "
         "qualquer condição inicial, a corda dedilhada e a percutida, e a membrana circular "
         "com as suas funções de Bessel.",
         ["Separação de variáveis", "Fourier", "Membrana e Bessel"]),
    15: ("Compressão, pressão sonora e a equação de onda acústica, a velocidade do som a "
         "partir do módulo de compressibilidade, tubos abertos e fechados, intensidade, e a "
         "equação de quarta ordem das barras fletidas.",
         ["Velocidade do som", "Tubos", "Viga de Euler-Bernoulli"]),
    16: ("Constantes de movimento em involução, o teorema de Liouville-Arnold, as variáveis "
         "de ação e ângulo, os toros invariantes, a seção de Poincaré como instrumento de "
         "medida e o teorema KAM.",
         ["Ação e ângulo", "Toros invariantes", "Poincaré"]),
    17: ("O rotor pulsado e o mapa de Taylor-Chirikov, a condição simplética que o mapa "
         "satisfaz, a transição de regular a caótico conforme o parâmetro cresce, e o "
         "expoente de Lyapunov medido pelo método de Benettin.",
         ["Mapa padrão", "Condição simplética", "Lyapunov"]),
}


def monta():
    partes = []
    for nome, _curto, numeros in MENU.UNIDADES:
        partes.append('  <h3 class="unidade">%s</h3>\n\n  <div class="cartoes">\n' % nome)
        for n in numeros:
            titulo = MENU.TITULOS[n][0]
            desc, etiquetas = CARTOES[n]
            tags = '\n'.join('        <span class="etiqueta">%s</span>' % e for e in etiquetas)
            if os.path.exists(RAIZ / ('aula%02d.html' % n)):
                partes.append(
                    '    <a class="cartao" href="aula%02d.html">\n'
                    '      <span class="numero">Aula %d</span>\n'
                    '      <h3>%s</h3>\n      <p>%s</p>\n'
                    '      <div class="etiquetas">\n%s\n      </div>\n    </a>\n'
                    % (n, n, titulo, desc, tags))
            else:
                partes.append(
                    '    <div class="cartao em-preparo">\n'
                    '      <span class="numero">Aula %d</span>\n'
                    '      <h3>%s</h3>\n      <p>%s</p>\n    </div>\n'
                    % (n, titulo, desc))
        partes.append('  </div>\n\n')
    return ''.join(partes).rstrip() + '\n'


def main():
    alvo = RAIZ / 'index.html'
    s = io.open(alvo, encoding='utf-8').read()
    i = s.index('  <h3 class="unidade">')
    j = s.index('  <hr class="linha">', i)
    io.open(alvo, 'w', encoding='utf-8').write(s[:i] + monta() + '\n' + s[j:])
    feitas = sum(1 for n in CARTOES if os.path.exists(RAIZ / ('aula%02d.html' % n)))
    print('cartões: %d, com página: %d' % (len(CARTOES), feitas))


if __name__ == '__main__':
    main()
